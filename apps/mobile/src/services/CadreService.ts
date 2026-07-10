/**
 * CadreService — singleton wrapper around @serfab/cadre-core CadreNode.
 *
 * Boots at first data access.  Creates a local health strand via addStrand()
 * so health data is stored in optimystic from the start.  Adding remote nodes
 * later automatically distributes the data.
 *
 * Authority keys, CadrePeer registration, and control-DB strand entries are
 * deferred until the user adds a second node (see STATUS.md Step 3).
 *
 * References:
 *   sereus/packages/cadre-core/README.md
 *   sereus/docs/cadre-architecture.md
 */

import {
  CadreNode,
  ControlFormationUsageRecorder,
  type CadreNodeConfig,
  type CadreNodeEvents,
  type ControlDatabase,
  type StrandInstance,
} from '@serfab/cadre-core';
import {
  AUTHORITY_GENESIS_TIMEOUT_MS,
  CONTROL_OP_TIMEOUT_MS,
  withTimeout,
} from './cadreAsync';
import { webSockets } from '@libp2p/websockets';
import {
  LevelDBRawStorage,
  openOptimysticRNDb,
  loadOrCreateRNPeerKey,
} from '@optimystic/db-p2p-storage-rn';
import { LevelDB, LevelDBWriteBatch } from 'rn-leveldb';
import type { Database } from '@quereus/quereus';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SCHEMA_SQL from '../../../../design/specs/domain/schema.qsql';
import { createLogger } from '../util/logger';

type OptimysticDb = ReturnType<typeof openOptimysticRNDb>;

const logger = createLogger('CadreService');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SAPP_ID = 'org.sereus.health';
const SAPP_VERSION = '1.1';
const PARTY_ID_KEY = '@sereus/partyId';
const STRAND_ID_KEY = '@sereus/healthStrandId';
const BOOTSTRAP_NODES: string[] = [];
/** Guest invitation validity window (24h) — long enough for a doctor visit. */
const INVITE_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * LevelDB directory naming for optimystic stores.
 *
 * Each strand (plus the control network, strandId='control') gets its own
 * native LevelDB directory.  `reset.ts` mirrors this prefix when destroying
 * stores; keep them in sync.
 */
export const OPTIMYSTIC_DB_PREFIX = 'optimystic-';

function optimysticDbName(strandId: string): string {
  return `${OPTIMYSTIC_DB_PREFIX}${strandId}`;
}

// ---------------------------------------------------------------------------
// Health schema
// ---------------------------------------------------------------------------

/**
 * Extract the inner DDL from schema.qsql.
 * schema.qsql wraps everything in `declare schema main { ... }`.
 * StrandDatabase wraps it in `declare schema App { ... }; apply schema App;`.
 * We strip the outer wrapper so StrandDatabase can re-wrap.
 */
function extractInnerDDL(schemaSql: string): string {
  return schemaSql
    .replace(/^\s*--[^\n]*\n/gm, '')        // strip comment lines
    .replace(/^declare\s+schema\s+\w+\s*\{/m, '') // strip opening
    .replace(/\}\s*$/, '')                    // strip closing brace
    .trim();
}

const HEALTH_SCHEMA_DDL = extractInnerDDL(SCHEMA_SQL);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EventHandler<T> = (payload: T) => void;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class CadreServiceImpl {
  private node: CadreNode | null = null;
  private healthStrand: StrandInstance | null = null;
  private _partyId: string | null = null;
  private _strandId: string | null = null;
  private _authorityPublicKey: string | null = null;
  private _startError: string | null = null;
  private _startPromise: Promise<void> | null = null;
  /**
   * LevelDB handles open for the lifetime of this CadreService instance.
   * Keyed by strandId (including 'control').  The provider callback memoizes
   * through this map so each strand opens its native handle exactly once.
   * Closed in `stop()`.
   */
  private readonly openDbs = new Map<string, OptimysticDb>();

  /** Whether the CadreNode is running. */
  get isRunning(): boolean {
    return this.node?.isRunning ?? false;
  }

  /** Party ID for this network (null before start). */
  get partyId(): string | null {
    return this._partyId;
  }

  /** Peer ID of this node (null before start). */
  get peerId(): string | undefined {
    return this.node?.peerId?.toString();
  }

  /** Last startup error, if any. */
  get startError(): string | null {
    return this._startError;
  }

  /** True once authority genesis has run and seed/invite flows are armed. */
  get hasAuthorityKey(): boolean {
    return this._authorityPublicKey !== null;
  }

  /** The cadre authority public key (base64url), or null before genesis. */
  get authorityPublicKey(): string | null {
    return this._authorityPublicKey;
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  /**
   * Ensure the CadreNode is started and the health strand is ready.
   * Idempotent — concurrent callers share the same promise.
   */
  async ensureStarted(): Promise<void> {
    if (this.healthStrand) return;
    if (this._startPromise) return this._startPromise;
    this._startPromise = this.doStart();
    try {
      await this._startPromise;
    } catch {
      this._startPromise = null;
      throw new Error(this._startError ?? 'CadreService failed to start');
    }
  }

  private async doStart(): Promise<void> {
    this._startError = null;

    try {
      this._partyId = await this.getOrCreateValue(PARTY_ID_KEY);
      logger.info('Party ID:', this._partyId);

      // Open the control-network LevelDB up-front so we can both load the
      // persistent peer identity and hand the same handle back to CadreNode's
      // storage provider when it asks for strandId='control'.
      const controlDb = this.getOrOpenDb('control');
      const privateKey = await loadOrCreateRNPeerKey(controlDb);
      logger.info('Loaded peer identity from control store');

      const config: CadreNodeConfig = {
        privateKey,
        controlNetwork: {
          partyId: this._partyId,
          bootstrapNodes: BOOTSTRAP_NODES,
        },
        profile: 'transaction',
        // cadre-core 0.8.x enforces signed sApp schemas by default
        // (requireSignedSchemas, fail-closed).  The health sApp is not yet
        // signed (see the unsigned sAppConfig below), so relax the policy for
        // dev/test to bring the strand up.  MIGRATION TODO: give the sApp an
        // ed25519 author key, set `sAppConfig.id` = author public key, and
        // `signature` = signSchema(schema, version, authorPrivateKey), then
        // drop this flag.
        requireSignedSchemas: false,
        strandFilter: { mode: 'sAppId', sAppId: SAPP_ID },
        storage: {
          provider: (strandId: string) =>
            new LevelDBRawStorage(this.getOrOpenDb(strandId)),
        },
        network: {
          // RN requires explicit transports (no TCP).  WebSockets satisfies
          // the constructor; actual peer communication is deferred until the
          // user adds remote nodes (Step 3).
          transports: [webSockets()],
          listenAddrs: [],
        },
      };

      logger.info('Creating CadreNode...');
      this.node = new CadreNode(config);
      logger.info('Starting CadreNode...');
      await this.node.start();
      logger.info('CadreNode started. Peer ID:', this.node.peerId?.toString());

      // Create the health strand.  addStrand() does NOT write to the control
      // database — it starts a strand locally with its own libp2p node and
      // StrandDatabase.  No authority key required.
      //
      // Mode = 'bootstrap': solo node, no remote peers yet.  Schema apply and
      // DML route through the OPTIMYSTIC LOCAL transactor (backed by the same
      // LevelDB we created via createLibp2pNode), so a cold start finishes in
      // seconds instead of timing out on consensus round-trips that can never
      // complete with zero peers.  This is exactly what the
      // `wire-strand-storage-into-bootstrap-transactor` ticket in sereus was
      // built for — sereus-health is its named host-app verification target.
      //
      // STATUS.md Step 3 (adding the first remote node) will need to restart
      // the strand in `'networked'` mode; the StrandMode is fixed for the
      // lifetime of a StrandDatabase instance.
      const strandId = await this.getOrCreateValue(STRAND_ID_KEY);
      this._strandId = strandId;
      logger.info('Adding health strand:', strandId);

      this.healthStrand = await this.node.addStrand({
        mode: 'bootstrap',
        strandRow: {
          Id: strandId,
          MemberPrivateKey: null,
          Type: 'o', // open strand
        },
        sAppConfig: {
          id: SAPP_ID,
          version: SAPP_VERSION,
          schema: HEALTH_SCHEMA_DDL,
          signature: '', // Unsigned — accepted only because requireSignedSchemas:false above (see MIGRATION TODO)
        },
      });
      logger.info('Health strand ready. Database available:', !!this.healthStrand?.database);

      // Arm authority genesis + the formation responder OFF the boot path.
      // Both touch the control network, whose consistent reads block on a solo
      // node (no cohort → no quorum). Awaiting them here would hang boot; the
      // health strand already works locally (bootstrap mode) without them.
      this.armCadreServicesInBackground();
    } catch (err) {
      this._startError = err instanceof Error ? err.message : String(err);
      logger.error('doStart failed:', this._startError);
      throw err;
    }
  }

  // -----------------------------------------------------------------------
  // Authority key + seed + invitation flows
  // -----------------------------------------------------------------------

  /**
   * Run authority genesis. Idempotent, safe on every start.
   *
   * cadre-core 0.8 uses a SINGLE-KEY model: the cadre authority key is *derived
   * from the node identity* (not an independent keypair). `createSeed`,
   * `publishStrand`, and `publishFormationInvite` all sign with the identity key
   * and refuse unless its public half matches the control node's PeerId — so we
   * must NOT mint a separate random authority key. `ensureAuthorityKey` inserts
   * the derived key only when the table is empty.
   */
  private async runAuthorityGenesis(): Promise<string> {
    if (!this.node) throw new Error('CadreNode not running');
    const { privateKeyB64, publicKeyB64 } = this.node.getIdentityAuthorityKey();

    const controlDb = this.node.getControlDatabase();
    if (!controlDb) throw new Error('Control database not available');

    const inserted = await controlDb.ensureAuthorityKey(publicKeyB64);
    this.node.initializeSeedBootstrap(privateKeyB64);
    this._authorityPublicKey = publicKeyB64;

    logger.info(
      inserted
        ? '✓ authority genesis: inserted founding key, seed flows enabled'
        : '✓ authority key already present, seed flows enabled',
    );
    return publicKeyB64;
  }

  /**
   * Best-effort background bring-up of control-network services that must NOT
   * gate boot. Fired (not awaited) from doStart. Authority genesis is time-boxed
   * because its control-DB read never returns on a solo node.
   */
  private armCadreServicesInBackground(): void {
    void (async () => {
      try {
        await withTimeout(
          this.runAuthorityGenesis(),
          AUTHORITY_GENESIS_TIMEOUT_MS,
          'authority genesis',
        );
      } catch (err) {
        logger.warn(
          'authority genesis deferred (solo node / no control cohort yet):',
          err instanceof Error ? err.message : err,
        );
      }
      try {
        this.initializeFormationResponder();
      } catch (err) {
        logger.warn('formation responder init failed:', err);
      }
    })();
  }

  /**
   * Install the strand-formation responder, backed by the control DB's
   * FormationInvite / FormationUsage tables, so guest-invitation tokens are
   * actually validated on redemption. Synchronous (no control-DB read).
   */
  private initializeFormationResponder(): void {
    if (!this.node) throw new Error('CadreNode not running');
    const controlDb = this.node.getControlDatabase();
    if (!controlDb) throw new Error('Control database not available');
    this.node.initializeStrandSolicitation({
      formationUsageRecorder: new ControlFormationUsageRecorder(controlDb),
    });
    logger.info('✓ formation responder installed (invitation tokens enforced)');
  }

  /**
   * Ensure the authority key exists. Under the 0.8 single-key model there's
   * nothing to "create" — the key is the node identity — so this just runs
   * genesis (idempotent), time-boxed so the UI never hangs on a solo node.
   */
  async createAuthorityKey(): Promise<{ publicKey: string }> {
    await this.ensureStarted();
    const publicKey = await withTimeout(
      this.runAuthorityGenesis(),
      CONTROL_OP_TIMEOUT_MS,
      'authority genesis',
    );
    return { publicKey };
  }

  /**
   * Reveal the authority private key for offline backup. Because authority ==
   * node identity, this IS the device's identity secret — only ever call from an
   * explicit, user-confirmed "export for recovery" affordance, and never log it.
   */
  async exportAuthorityPrivateKey(): Promise<string | null> {
    await this.ensureStarted();
    if (!this.node) return null;
    try {
      return this.node.getIdentityAuthorityKey().privateKeyB64;
    } catch (err) {
      logger.warn('exportAuthorityPrivateKey failed:', err);
      return null;
    }
  }

  /**
   * Generate a base64url seed for transporting cadre membership to a new node —
   * typically a drone/server consumed via cadre-cli. This is the primary way the
   * phone enrolls its own additional nodes. Requires the authority key; if
   * genesis is still pending (solo node), we attempt it once, time-boxed, and
   * surface an honest precondition error rather than hanging.
   */
  async createDroneSeed(): Promise<string> {
    await this.ensureStarted();
    if (!this.node) throw new Error('CadreNode not running');
    if (!this._authorityPublicKey) {
      await this.createAuthorityKey(); // time-boxed; throws with a clear message on a solo node
    }
    const seed = await this.node.createSeed();
    return this.node.encodeSeed(seed);
  }

  /**
   * Mint a one-directional guest invitation to the health strand (e.g. for a
   * doctor to read the record). Outbound only — health never redeems invitations.
   *
   * Precondition: this device must have a dialable address, which a phone only
   * gets via a relay reservation from a node in its cadre. On a solo phone
   * `getMultiaddrs()` is empty and we fail fast with a clear message — add a
   * drone/server first. Mirrors chat's createInvitation (same solo limitation).
   */
  async createGuestInvitation(): Promise<{
    token: string;
    strandId: string;
    expiresAt: string;
  }> {
    await this.ensureStarted();
    if (!this.node) throw new Error('CadreNode not running');
    if (!this._strandId) throw new Error('Health strand not initialized');

    if (this.node.getMultiaddrs().length === 0) {
      throw new Error(
        'This device has no reachable address yet. Add a node to your cadre (a drone or ' +
          'server) so a guest has somewhere to connect, then try again.',
      );
    }
    if (!this._authorityPublicKey) {
      await this.createAuthorityKey();
    }

    const invitation = await this.node.createOpenInvitation(SAPP_ID, INVITE_EXPIRY_MS);
    await withTimeout(
      this.node.publishFormationInvite(invitation.token, SAPP_ID, {
        expiresAtMs: invitation.expiration.getTime(),
        strandId: this._strandId,
      }),
      CONTROL_OP_TIMEOUT_MS,
      'publishFormationInvite',
    );
    return {
      token: this.node.encodeInvitation(invitation),
      strandId: this._strandId,
      expiresAt: invitation.expiration.toISOString(),
    };
  }

  /** Stop the CadreNode gracefully.  Idempotent. */
  async stop(): Promise<void> {
    this.healthStrand = null;
    this._authorityPublicKey = null;
    this._strandId = null;
    if (this.node) {
      await this.node.stop();
      this.node = null;
    }
    // Close every LevelDB handle so rn-leveldb's per-name lock is released.
    // Without this, `LevelDB.destroyDB(name)` from `resetDatabaseForDev`
    // would throw "DB is open" on the very next call.
    for (const [strandId, db] of this.openDbs) {
      try {
        await db.close();
      } catch (e) {
        logger.debug(`close LevelDB ${strandId} failed:`, e);
      }
    }
    this.openDbs.clear();
    this._startPromise = null;
  }

  // -----------------------------------------------------------------------
  // LevelDB handle cache
  // -----------------------------------------------------------------------

  /**
   * Open (or return the cached handle for) the LevelDB backing a given
   * strand's optimystic raw storage.  `'control'` is the special strandId
   * the CadreNode uses for its control-network repo and node identity.
   *
   * `rn-leveldb` permits exactly one open handle per database name, so the
   * cache is mandatory — without it, the second call (e.g. control then the
   * first strand) would throw.
   */
  private getOrOpenDb(strandId: string): OptimysticDb {
    let db = this.openDbs.get(strandId);
    if (!db) {
      db = openOptimysticRNDb({
        openFn: (name, createIfMissing, errorIfExists) =>
          new LevelDB(name, createIfMissing, errorIfExists),
        WriteBatch: LevelDBWriteBatch,
        name: optimysticDbName(strandId),
      });
      this.openDbs.set(strandId, db);
    }
    return db;
  }

  // -----------------------------------------------------------------------
  // Data access
  // -----------------------------------------------------------------------

  /**
   * Return the health strand's Quereus Database for SQL queries.
   * Call ensureStarted() first.
   */
  getHealthDatabase(): Database {
    if (!this.healthStrand?.database) {
      throw new Error('Health strand not initialized. Call ensureStarted() first.');
    }
    return this.healthStrand.database.getDatabase();
  }

  /** Return the control database (for Sereus Connections screen). */
  get controlDatabase(): ControlDatabase | null {
    return this.node?.getControlDatabase() ?? null;
  }

  /** Return the CadreNode (for advanced use, e.g., enrollment). */
  get cadreNode(): CadreNode | null {
    return this.node;
  }

  /** Return multiaddrs of this node (empty if not started). */
  getMultiaddrs(): string[] {
    return this.node?.getMultiaddrs() ?? [];
  }

  // -----------------------------------------------------------------------
  // Events
  // -----------------------------------------------------------------------

  on<K extends keyof CadreNodeEvents>(
    event: K,
    handler: EventHandler<CadreNodeEvents[K]>,
  ): void {
    this.node?.on(event, handler);
  }

  off<K extends keyof CadreNodeEvents>(
    event: K,
    handler: EventHandler<CadreNodeEvents[K]>,
  ): void {
    this.node?.off(event, handler);
  }

  // -----------------------------------------------------------------------
  // Persistence helpers
  // -----------------------------------------------------------------------

  private async getOrCreateValue(key: string): Promise<string> {
    const stored = await AsyncStorage.getItem(key);
    if (stored) return stored;
    const id = generateId();
    await AsyncStorage.setItem(key, id);
    return id;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Lightweight UUID v4. */
function generateId(): string {
  const bytes = new Uint8Array(16);
  const g = globalThis as Record<string, unknown>;
  const c = (g.crypto ?? {}) as { getRandomValues?: (buf: Uint8Array) => void };
  if (typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const cadreService = new CadreServiceImpl();
export default cadreService;
