/**
 * CadreService — singleton wrapper around @serfab/cadre-core CadreNode.
 *
 * Boots at first data access.  Creates (or re-opens) a local health strand so
 * health data is stored in optimystic from the start.  Entering a remote node's
 * bootstrap multiaddr (see `connectToNode`) lets the strand replicate to a
 * Linux cadre node (cadre-cli drone or cadre-host).
 *
 * Stack: cadre-core 0.12 / optimystic 0.27 / quereus 4.18 / p2p-fret 1.0-beta.
 *
 * Notable 0.12 changes vs the previous (0.10) integration:
 *   - `StrandConfig.mode` ('bootstrap' | 'networked') is GONE.  Solo/local
 *     commit is automatic at the storage layer; a strand no longer needs to be
 *     torn down + re-added to "go networked" when a peer appears.  We found the
 *     strand once with `founder: true`, then re-open with `founder: false`.
 *   - `publishStrand()` registers the strand in the control DB so a joining
 *     drone discovers and replicates it.  Done once (founder path).
 *   - New node-local seams: `trustedOwners` / `bootstrapPeers` stores (persisted
 *     here in a dedicated LevelDB) and `hibernation`.
 *   - Transports now include circuit-relay + webRTC so a NAT'd phone can dial a
 *     relay-enabled drone and upgrade to a direct path.
 *
 * Identity: still injected as `config.privateKey`, loaded from the control
 * LevelDB via `loadOrCreateRNPeerKey`.  MIGRATION TODO (tracked in
 * design/specs/mobile/STATUS.md): move identity + the trusted-owner anchor into
 * react-native-keychain via cadre-core's `KeyStore` seam (the reference app's
 * secure-enclave model), so the trust-bearing records share the identity's fate.
 *
 * References:
 *   cadre/sereus-latest/packages/reference-app-rn/src/cadre-phone.ts
 *   cadre/sereus-latest/docs/reference-app-rn.md
 *   cadre/sereus-latest/docs/architecture.md
 */

import {
  CadreNode,
  ControlFormationUsageRecorder,
  PersistentTrustedOwnerStore,
  PersistentBootstrapPeerStore,
  type CadreNodeConfig,
  type CadreNodeEvents,
  type ControlDatabase,
  type StrandInstance,
  type DurableSlot,
} from '@serfab/cadre-core';
import {
  AUTHORITY_GENESIS_TIMEOUT_MS,
  CONTROL_OP_TIMEOUT_MS,
  withTimeout,
} from './cadreAsync';
import { webSockets } from '@libp2p/websockets';
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2';
import { webRTC } from '@libp2p/webrtc';
import { multiaddr } from '@multiformats/multiaddr';
import type { Libp2pTransports } from '@optimystic/db-p2p';
import {
  LevelDBRawStorage,
  LevelDBKVStore,
  openOptimysticRNDb,
  loadOrCreateRNPeerKey,
} from '@optimystic/db-p2p-storage-rn';
import { LevelDB, LevelDBWriteBatch } from 'rn-leveldb';
import type { Database } from '@quereus/quereus';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SCHEMA_SQL from '../../../../design/specs/domain/schema.qsql';
import { createLogger } from '../util/logger';

type OptimysticDb = ReturnType<typeof openOptimysticRNDb>;

/**
 * db-p2p's transport-factory element type.  The `webRTC()` factory from
 * `@libp2p/webrtc` carries a nominally-different `[transportSymbol]` brand than
 * db-p2p's pinned `@libp2p/interface` (the symbol is a global-registry key, so
 * they are runtime-identical).  `CadreNodeConfig.network.transports` is exactly
 * this `Libp2pTransports`, so we bridge with `as unknown as TransportFactory`.
 * Mirrors the same cast in the RN reference app's `cadre-phone.ts`.
 */
type TransportFactory = Libp2pTransports[number];

const logger = createLogger('CadreService');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SAPP_ID = 'org.sereus.health';
const SAPP_VERSION = '1.1';
const PARTY_ID_KEY = '@sereus/partyId';
const STRAND_ID_KEY = '@sereus/healthStrandId';
/** Set once the health strand has been founded + published (see doStart). */
const STRAND_FOUNDED_KEY = '@sereus/healthStrandFounded';
/** JSON array of bootstrap multiaddrs the user has added (Linux cadre nodes). */
const BOOTSTRAP_NODES_KEY = '@sereus/bootstrapNodes';
/** Guest invitation validity window (24h) — long enough for a doctor visit. */
const INVITE_EXPIRY_MS = 24 * 60 * 60 * 1000;

/** Key prefix inside the node-local LevelDB for the trusted-owner anchor. */
const TRUSTED_OWNERS_KV = 'trusted-owners';
/** Key prefix inside the node-local LevelDB for cold-start dial hints. */
const BOOTSTRAP_PEERS_KV = 'bootstrap-peers';

/**
 * LevelDB directory naming for optimystic stores.
 *
 * Each strand (plus the control network, strandId='control', and the
 * node-local record store, strandId='node-local') gets its own native LevelDB
 * directory.  `reset.ts` mirrors this prefix when destroying stores; keep them
 * in sync.
 */
export const OPTIMYSTIC_DB_PREFIX = 'optimystic-';
/** Pseudo-strandId for the node-local record store (trust anchor + dial hints). */
export const NODE_LOCAL_STRAND_ID = 'node-local';

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

/** A DurableSlot over one key of a LevelDBKVStore (trusted-owner / bootstrap-peer). */
function kvStoreSlot(kv: LevelDBKVStore, key: string): DurableSlot {
  return {
    load: () => kv.get(key),
    save: (text: string) => kv.set(key, text),
  };
}

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
   * Keyed by strandId (including 'control' and 'node-local').  The provider
   * callback memoizes through this map so each strand opens its native handle
   * exactly once.  Closed in `stop()`.
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

  /** True once owner genesis has run and seed/invite flows are armed. */
  get hasAuthorityKey(): boolean {
    return this._authorityPublicKey !== null;
  }

  /** The cadre owner public key (base64url), or null before genesis. */
  get authorityPublicKey(): string | null {
    return this._authorityPublicKey;
  }

  /**
   * The node's owner PUBLIC key (base64url) for out-of-band pairing — this is
   * the value a Linux cadre node must be told to trust (e.g. `CADRE_OWNER_KEYS`
   * / cadre-cli `--owner`, or a pinned invite) so it will accept this phone's
   * strand.  Never exposes private material.  Null before genesis.
   */
  getOwnerPublicKey(): string | null {
    if (!this.node) return null;
    try {
      return this.node.getIdentityOwnerKey().publicKeyB64;
    } catch (err) {
      logger.warn('getOwnerPublicKey unavailable:', err);
      return null;
    }
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

      // Node-local records (trusted-owner anchor + cold-start dial hints) live
      // in their own LevelDB so clearing them can't disturb replicated strand
      // data.  Both persist across restarts so a trusted drone stays trusted.
      // MIGRATION TODO: the trust anchor should move to react-native-keychain
      // alongside the identity key (see file header + STATUS.md).
      const nodeLocalDb = this.getOrOpenDb(NODE_LOCAL_STRAND_ID);
      const nodeLocalKv = new LevelDBKVStore(nodeLocalDb, 'sereus:node-local:');
      const trustedOwnerStore = await PersistentTrustedOwnerStore.open(
        kvStoreSlot(nodeLocalKv, `${TRUSTED_OWNERS_KV}.${this._partyId}`),
        this._partyId,
      );
      const bootstrapPeerStore = await PersistentBootstrapPeerStore.open(
        kvStoreSlot(nodeLocalKv, `${BOOTSTRAP_PEERS_KV}.${this._partyId}`),
        this._partyId,
      );

      // Bootstrap multiaddrs the user has added (Linux cadre nodes).  Empty on a
      // solo phone; entries dial out at start so the strand can replicate.
      const bootstrapNodes = await this.getBootstrapNodes();
      if (bootstrapNodes.length > 0) {
        logger.info('Bootstrap nodes:', bootstrapNodes);
      }

      const config: CadreNodeConfig = {
        privateKey,
        controlNetwork: {
          partyId: this._partyId,
          bootstrapNodes,
        },
        profile: 'transaction',
        // The health sApp schema is not yet signed (unsigned sAppConfig below),
        // so relax the fail-closed policy for dev/test.  MIGRATION TODO: give the
        // sApp an ed25519 author key, set sAppConfig.id = author public key and
        // sAppConfig.signature = signSchema(...), then drop this flag.
        requireSignedSchemas: false,
        strandFilter: { mode: 'sAppId', sAppId: SAPP_ID },
        storage: {
          provider: (strandId: string) =>
            new LevelDBRawStorage(this.getOrOpenDb(strandId)),
        },
        network: {
          // RN requires explicit transports (no TCP).
          //   webSockets           — dial a reachable drone over /ws
          //   circuitRelayTransport — dial /p2p-circuit reservations through a
          //                           relay-enabled drone (NAT'd phone)
          //   webRTC               — upgrade a relayed connection to a direct
          //                           /webrtc data path (relay stays signalling)
          // iceServers: [] — relay-signalled webRTC still works on host/LAN
          // candidates; a STUN/TURN manifest can be added later.
          transports: [
            webSockets(),
            circuitRelayTransport(),
            webRTC({ rtcConfiguration: { iceServers: [] } }) as unknown as TransportFactory,
          ],
          listenAddrs: [], // RN cannot accept inbound connections
        },
        hibernation: { enabled: false },
        trustedOwners: { store: trustedOwnerStore },
        bootstrapPeers: { store: bootstrapPeerStore },
      };

      logger.info('Creating CadreNode...');
      this.node = new CadreNode(config);
      logger.info('Starting CadreNode...');
      await this.node.start();
      logger.info('CadreNode started. Peer ID:', this.node.peerId?.toString());

      // Owner genesis makes this phone its own party owner so it can author the
      // owner-signed Strand INSERT that publishStrand performs.  On a solo node
      // (cadre-of-one) the control path commits locally in milliseconds; we
      // still time-box it defensively so a wedged control op can't hang boot.
      // Fail-soft: if genesis doesn't complete, the strand still works locally
      // (addStrand below) — only control-DB publish + seed/invite flows wait.
      await this.runOwnerGenesisSafe();

      // Formation responder: validates guest-invitation tokens on redemption.
      try {
        this.initializeFormationResponder();
      } catch (err) {
        logger.warn('formation responder init failed:', err);
      }

      // Create (or re-open) the health strand.
      const strandId = await this.getOrCreateValue(STRAND_ID_KEY);
      this._strandId = strandId;
      const founded = (await AsyncStorage.getItem(STRAND_FOUNDED_KEY)) === '1';

      // First time only: publish the strand into the control DB so a joining
      // drone discovers + replicates it, and found it (write the Header /
      // membership bootstrap).  On later boots we re-open as a non-founder; the
      // strand's rows are already in local storage and sync fills the rest.
      if (!founded && this._authorityPublicKey) {
        try {
          await withTimeout(
            this.node.publishStrand(strandId, 'o'),
            CONTROL_OP_TIMEOUT_MS,
            'publishStrand',
          );
          logger.info('Published health strand to control DB:', strandId);
        } catch (err) {
          // Non-fatal: the strand still works locally; it just isn't yet
          // discoverable by a drone.  A later connect can re-attempt (see
          // republishStrand).
          logger.warn('publishStrand deferred:', err instanceof Error ? err.message : err);
        }
      }

      logger.info(`Adding health strand (founder=${!founded}):`, strandId);
      this.healthStrand = await this.node.addStrand({
        strandRow: {
          Id: strandId,
          MemberPrivateKey: null,
          Type: 'o', // open strand
        },
        sAppConfig: {
          id: SAPP_ID,
          version: SAPP_VERSION,
          schema: HEALTH_SCHEMA_DDL,
          // Unsigned — accepted only because requireSignedSchemas:false above.
          signature: '',
        },
        founder: !founded,
      });
      logger.info('Health strand ready. Database available:', !!this.healthStrand?.database);

      if (!founded) {
        await AsyncStorage.setItem(STRAND_FOUNDED_KEY, '1');
      }
    } catch (err) {
      this._startError = err instanceof Error ? err.message : String(err);
      logger.error('doStart failed:', this._startError);
      throw err;
    }
  }

  // -----------------------------------------------------------------------
  // Owner genesis + seed + invitation flows
  // -----------------------------------------------------------------------

  /**
   * Run owner genesis. Idempotent, safe on every start.
   *
   * Single-key model: the cadre owner key is DERIVED from the node identity (not
   * an independent keypair).  `createSeed`, `publishStrand`, and
   * `publishFormationInvite` all sign with the identity key.  `ensureOwnerKey`
   * inserts the derived key only when the OwnerKey table is empty.
   */
  private async runOwnerGenesis(): Promise<string> {
    if (!this.node) throw new Error('CadreNode not running');
    const { privateKeyB64, publicKeyB64 } = this.node.getIdentityOwnerKey();

    const controlDb = this.node.getControlDatabase();
    if (!controlDb) throw new Error('Control database not available');

    const inserted = await controlDb.ensureOwnerKey(publicKeyB64);
    this.node.initializeSeedBootstrap(privateKeyB64);
    this._authorityPublicKey = publicKeyB64;

    logger.info(
      inserted
        ? '✓ owner genesis: inserted founding key, seed flows enabled'
        : '✓ owner key already present, seed flows enabled',
    );
    return publicKeyB64;
  }

  /** Time-boxed, fail-soft owner genesis for the boot path. */
  private async runOwnerGenesisSafe(): Promise<void> {
    try {
      await withTimeout(
        this.runOwnerGenesis(),
        AUTHORITY_GENESIS_TIMEOUT_MS,
        'owner genesis',
      );
    } catch (err) {
      logger.warn(
        'owner genesis deferred (solo node / no control cohort yet):',
        err instanceof Error ? err.message : err,
      );
    }
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
   * Ensure the owner key exists. Under the single-key model there's nothing to
   * "create" — the key is the node identity — so this just runs genesis
   * (idempotent), time-boxed so the UI never hangs on a solo node.
   */
  async createAuthorityKey(): Promise<{ publicKey: string }> {
    await this.ensureStarted();
    const publicKey = await withTimeout(
      this.runOwnerGenesis(),
      CONTROL_OP_TIMEOUT_MS,
      'owner genesis',
    );
    return { publicKey };
  }

  /**
   * Reveal the owner private key for offline backup. Because owner == node
   * identity, this IS the device's identity secret — only ever call from an
   * explicit, user-confirmed "export for recovery" affordance, and never log it.
   */
  async exportAuthorityPrivateKey(): Promise<string | null> {
    await this.ensureStarted();
    if (!this.node) return null;
    try {
      return this.node.getIdentityOwnerKey().privateKeyB64;
    } catch (err) {
      logger.warn('exportAuthorityPrivateKey failed:', err);
      return null;
    }
  }

  // -----------------------------------------------------------------------
  // Remote node connection (Linux cadre node)
  // -----------------------------------------------------------------------

  /** The bootstrap multiaddrs the user has added (persisted). */
  async getBootstrapNodes(): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(BOOTSTRAP_NODES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }

  /**
   * Add a Linux cadre node by its bootstrap multiaddr (e.g.
   * `/ip4/<host>/tcp/4002/ws/p2p/<peerId>`), persist it, and — if the node is
   * running — dial it live so the strand starts replicating immediately.
   * On the next start the address is used as a control-network bootstrap node.
   *
   * The remote node must already trust this phone's owner key
   * (see `getOwnerPublicKey`) out-of-band, or accept an applied seed.
   */
  async connectToNode(addr: string): Promise<void> {
    const trimmed = addr.trim();
    if (!trimmed) throw new Error('Enter a bootstrap multiaddr');
    // Validate — multiaddr() throws on a malformed address.
    const ma = multiaddr(trimmed);
    if (!trimmed.includes('/p2p/')) {
      throw new Error('Address must end in /p2p/<peerId> so the node can be identified');
    }

    const list = await this.getBootstrapNodes();
    if (!list.includes(trimmed)) {
      list.push(trimmed);
      await AsyncStorage.setItem(BOOTSTRAP_NODES_KEY, JSON.stringify(list));
    }

    if (this.node) {
      const libp2p = this.node.getControlNode();
      if (!libp2p) throw new Error('Control network not available');
      await libp2p.dial(ma);
      logger.info('Dialed remote node:', trimmed);
      // Make sure the strand is discoverable by the node we just added.
      await this.republishStrand();
    }
  }

  /** Remove a previously-added bootstrap node (does not disconnect a live dial). */
  async removeBootstrapNode(addr: string): Promise<void> {
    const list = (await this.getBootstrapNodes()).filter((a) => a !== addr);
    await AsyncStorage.setItem(BOOTSTRAP_NODES_KEY, JSON.stringify(list));
  }

  /**
   * Best-effort (re)publish of the health strand into the control DB so a newly
   * connected node can discover it.  Safe to call repeatedly; failures are
   * logged, not thrown.
   */
  private async republishStrand(): Promise<void> {
    if (!this.node || !this._strandId) return;
    if (!this._authorityPublicKey) {
      await this.runOwnerGenesisSafe();
      if (!this._authorityPublicKey) return;
    }
    try {
      await withTimeout(
        this.node.publishStrand(this._strandId, 'o'),
        CONTROL_OP_TIMEOUT_MS,
        'publishStrand',
      );
    } catch (err) {
      logger.debug('republishStrand skipped:', err instanceof Error ? err.message : err);
    }
  }

  /**
   * Generate a base64url seed for transporting cadre membership to a new node —
   * typically a drone/server consumed via cadre-cli. Requires the owner key; if
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
   * drone/server first.
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
   * strand's optimystic raw storage.  `'control'` is the control-network repo +
   * node identity; `'node-local'` is the trusted-owner / bootstrap-peer store.
   *
   * `rn-leveldb` permits exactly one open handle per database name, so the
   * cache is mandatory.
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
