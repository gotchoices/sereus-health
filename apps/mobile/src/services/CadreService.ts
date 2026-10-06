/**
 * CadreService — singleton wrapper around @serfab/cadre-core CadreNode.
 *
 * Boots at first data access.  Creates (or re-opens) a local health strand so
 * health data is stored in optimystic from the start.  Entering a remote node's
 * bootstrap multiaddr (see `connectToNode`) lets the strand replicate to a
 * Linux cadre node (cadre-cli drone or cadre-host).
 *
 * Stack: cadre-core 1.12 / optimystic 1.10.1 / quereus 4.20.1 / p2p-fret 1.0.1, with the
 * `@serfab/cadre-rn` kit for polyfills, Metro settings and native Noise crypto.
 *
 * Shape follows the RN reference app (`reference-app-rn/src/phone-node-config.ts`)
 * and ser/chat, which tracks the stack ahead of health:
 *   - Strands: `publishStrand()` + `addStrand({ founder })` — founded once, then
 *     re-opened as a non-founder.  No per-strand `mode` (removed in 0.12).
 *   - Storage: the provider receives cadre-core's scope key (`control-<hex>` for
 *     the control network, the strand id for a strand) and uses it verbatim.
 *   - Durable node-local stores for trustedOwners, bootstrapPeers,
 *     enrolledMachines, strandNetworkState and joinedStrands.  cadre-core's in-memory defaults
 *     silently forget across restarts.  (strandPeers was retired in 1.9 in favour
 *     of FRET address hints.)
 *   - network: ws + circuit-relay + webRTC transports, native `noiseCrypto`, and a
 *     permissive dial gater so LAN (`ws://192.168…`) nodes can be dialed.
 *   - Adding a node goes through `addDrone()`, which authorizes as well as seeds.
 *
 * Identity: injected as `config.privateKey` (as ser/chat does), loaded from its
 * own LevelDB via `loadOrCreateRNPeerKey`.  MIGRATION TODO (tracked in
 * design/specs/mobile/STATUS.md): move identity + the trust-bearing records into
 * a Keychain-backed `keyStore` — the reference app's secure-enclave model.
 *
 * References (gotchoices/sereus):
 *   packages/reference-app-rn/src/phone-node-config.ts, cadre-phone.ts
 *   packages/cadre-rn/README.md
 *   docs/reference-app-rn.md, docs/architecture.md
 */

import {
  CadreNode,
  PersistentTrustedOwnerStore,
  PersistentBootstrapPeerStore,
  PersistentEnrolledMachineStore,
  PersistentStrandNetworkStateStore,
  KeyStoreJoinedStrandStore,
  type CadreNodeConfig,
  type CadreNodeEvents,
  type ControlDatabase,
  type StrandInstance,
  type DurableSlot,
  type KeyId,
  type KeyStore,
} from '@serfab/cadre-core';
import { buildNoiseCrypto, DEFAULT_NOISE_CRYPTO_MODE } from '@serfab/cadre-rn/noise-crypto';
// Strand bring-up helpers from the kit, so this app behaves like the RN reference
// app on the two failures that only show up against a real, remote cadre node.
// (The rest of `/phone-node` — `createPhoneNode` — is not adopted yet; see STATUS.md.)
import { attachStrandWhenWritable, retryAfterRestart } from '@serfab/cadre-rn/phone-node';
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
/** Pseudo-scope for the LevelDB holding this node's peer identity key. */
export const IDENTITY_DB_ID = 'control';

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

/** Outcome of enrolling a remote cadre node (see `connectToNode`). */
export type AddNodeResult = {
  /** Peer ID parsed out of the bootstrap multiaddr. */
  peerId: string;
  /** True when the drone accepted the seed over `/sereus/seed/1.0.0`. */
  delivered: boolean;
  /** Always returned, so the seed can be delivered out of band if needed. */
  encodedSeed: string;
  /** Why delivery didn't happen, when `delivered` is false. */
  reason?: string;
};

/**
 * Peer ID from a multiaddr's trailing `/p2p/<id>` segment.  The LAST such
 * segment is the target: a relayed address (`…/p2p/<relay>/p2p-circuit/p2p/<node>`)
 * names the relay first and the node we actually want second.  Parsed from the
 * string because `Multiaddr.getPeerId()` was removed in @multiformats/multiaddr v13.
 */
function peerIdFromMultiaddr(addr: string): string | null {
  const parts = addr.split('/p2p/');
  if (parts.length < 2) return null;
  const id = parts[parts.length - 1].split('/')[0].trim();
  return id.length > 0 ? id : null;
}

/**
 * A DurableSlot over one key of a LevelDBKVStore (trusted-owner, bootstrap-peer,
 * enrolled-machine and strand-peer-book records).  `get` resolves `undefined` for
 * an absent key and throws on a read fault — exactly the absent-vs-fault contract
 * `DurableSlot` requires (a fault reported as "absent" would let the next save
 * overwrite an intact record).
 */
function kvStoreSlot(kv: LevelDBKVStore, key: string): DurableSlot {
  return {
    load: () => kv.get(key),
    save: (text: string) => kv.set(key, text),
  };
}

/**
 * A cadre-core `KeyStore` over the node-local LevelDB, used only to back
 * `joinedStrands` (sereus 1.7+).  A node configured with `privateKey` has no key
 * store of its own, and without an injected joined-strand store cadre-core keeps
 * joins in memory and warns.  Health never joins another party's strand today,
 * but supplying the durable store is the prescribed embedding and costs nothing.
 *
 * Same security posture as the identity key (plaintext in app-private LevelDB);
 * replace with a Keychain-backed KeyStore when the identity moves there
 * (MIGRATION TODO in the file header).
 */
class LevelDBKeyStore implements KeyStore {
  constructor(private readonly kv: LevelDBKVStore, private readonly prefix = 'keystore:') {}

  private key(keyId: KeyId): string {
    return `${this.prefix}${encodeURIComponent(keyId)}`;
  }

  async get(keyId: KeyId): Promise<Uint8Array | undefined> {
    const raw = await this.kv.get(this.key(keyId));
    return raw === undefined ? undefined : hexToBytes(raw);
  }

  async set(keyId: KeyId, keyMaterial: Uint8Array): Promise<void> {
    await this.kv.set(this.key(keyId), bytesToHex(keyMaterial));
  }

  async delete(keyId: KeyId): Promise<void> {
    await this.kv.delete(this.key(keyId));
  }

  async list(): Promise<KeyId[]> {
    const keys = await this.kv.list(this.prefix);
    return keys.map((k) => decodeURIComponent(k.slice(this.prefix.length)));
  }
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return hex;
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
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

      // Peer identity.  Kept in its own `optimystic-control` LevelDB, loaded via
      // loadOrCreateRNPeerKey and injected as `privateKey` (the same model ser/chat
      // uses).  Note this is NOT the control network's block store: since
      // cadre-core 1.8 the control store is asked for under the scope key
      // `controlStorageScope(partyId)` (`control-<party id hex>`), so the two
      // never share a database.  MIGRATION TODO: move the identity into a
      // Keychain-backed `keyStore` (the reference app's model) — see STATUS.md.
      const identityDb = this.getOrOpenDb(IDENTITY_DB_ID);
      const privateKey = await loadOrCreateRNPeerKey(identityDb);
      logger.info('Loaded peer identity');

      // Node-local records live in their own LevelDB so clearing them cannot
      // disturb replicated strand data.  None of these replicate; all must be
      // durable — cadre-core's in-memory defaults silently forget across restarts:
      //   trustedOwners    owner keys this node trusts (seed acceptance)
      //   bootstrapPeers   cold-start dial hints retained from applied seeds
      //   enrolledMachines machines this owner enrolled (addDrone) — so a
      //                    restarted phone keeps dialing the drones it added
      //   (strandPeers was retired in cadre-core 1.9: strand peer addresses now
      //    come from FRET address hints, which need nothing from the app)
      //   joinedStrands    strands joined from ANOTHER party.  A `privateKey`
      //                    node has no keyStore, so the store is injected here.
      const nodeLocalDb = this.getOrOpenDb(NODE_LOCAL_STRAND_ID);
      const nodeLocalKv = new LevelDBKVStore(nodeLocalDb, 'sereus:node-local:');
      const partyId = this._partyId;
      const slot = (name: string) => kvStoreSlot(nodeLocalKv, `${name}.${partyId}`);
      const trustedOwnerStore = await PersistentTrustedOwnerStore.open(slot(TRUSTED_OWNERS_KV), partyId);
      const bootstrapPeerStore = await PersistentBootstrapPeerStore.open(slot(BOOTSTRAP_PEERS_KV), partyId);
      const enrolledMachineStore = await PersistentEnrolledMachineStore.open(slot('enrolled-machines'), partyId);
      // Per strand, the FRET routing table its strand node saved, re-imported after
      // a relaunch.  Without it every restart re-discovers the party's machines from
      // scratch, which is the slow path back to a cadre node.  The key this lands on
      // (`strand-network.<partyId>`) is the one `@serfab/cadre-rn/node-local` uses,
      // so adopting `createPhoneNode` later reads the same record.
      const strandNetworkStateStore = await PersistentStrandNetworkStateStore.open(slot('strand-network'), partyId);
      const joinedStrandStore = new KeyStoreJoinedStrandStore(new LevelDBKeyStore(nodeLocalKv), partyId);

      // Bootstrap multiaddrs the user has added (Linux cadre nodes).  Empty on a
      // solo phone; entries dial out at start so the strand can replicate.
      const bootstrapNodes = await this.getBootstrapNodes();
      if (bootstrapNodes.length > 0) {
        logger.info('Bootstrap nodes:', bootstrapNodes);
      }

      const config: CadreNodeConfig = {
        privateKey,
        controlNetwork: {
          partyId,
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
          // `scope` is cadre-core's storage scope key — `control-<hex>` for the
          // control network, the (lowercase) strand id for a strand.  It is
          // opaque and already safe as a database-name segment: use it verbatim.
          provider: (scope: string) => new LevelDBRawStorage(this.getOrOpenDb(scope)),
        },
        network: {
          // RN requires explicit transports (no TCP).
          //   webSockets           — dial a reachable node over /ws
          //   circuitRelayTransport — dial /p2p-circuit reservations through a
          //                           relay-enabled node (NAT'd phone)
          //   webRTC               — upgrade a relayed connection to a direct
          //                           /webrtc data path (relay stays signalling)
          // iceServers: [] — relay-signalled webRTC still works on host/LAN
          // candidates; a STUN/TURN manifest can be added later.
          transports: [
            webSockets(),
            circuitRelayTransport() as unknown as TransportFactory,
            webRTC({ rtcConfiguration: { iceServers: [] } }) as unknown as TransportFactory,
          ],
          listenAddrs: [], // RN cannot accept inbound connections
          // Native SHA-256 / ChaCha20-Poly1305 for libp2p-noise (sereus 1.3+, kit
          // 1.6+).  Metro bundles noise's pure-JS browser build; on Hermes that
          // is slow enough to miss libp2p's own pings and drop connections
          // (sereus#13).  Only local primitives change, not the wire protocol.
          noiseCrypto: buildNoiseCrypto(DEFAULT_NOISE_CRYPTO_MODE),
          // Permissive DIAL gater — as the RN reference app sets it.  libp2p's
          // connection-gater resolves to its browser build on RN, which refuses
          // insecure `ws://` and private/loopback addresses: exactly what a
          // Linux cadre node on the LAN is (`/ip4/192.168.x.x/tcp/4002/ws`), and
          // an emulator's `10.0.2.2`.  This only permits the dial; the connection
          // is still Noise-encrypted and membership is still gated by cadre-core's
          // own `denyDialPeer` and inbound hooks.  Applied to strand nodes too.
          connectionGater: { denyDialMultiaddr: () => false },
          // No `linkRoundTripMs` override: the 3500 ms default now also sizes
          // Optimystic's timeouts (sereus 1.8).  If ever set, set the SAME value
          // on every machine of the party — a mismatch is itself a failure mode.
        },
        hibernation: { enabled: false },
        trustedOwners: { store: trustedOwnerStore },
        bootstrapPeers: { store: bootstrapPeerStore },
        enrolledMachines: { store: enrolledMachineStore },
        strandNetworkState: { store: strandNetworkStateStore },
        joinedStrands: { store: joinedStrandStore },
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

      // Formation responder: installed by `start()` itself since cadre-core 1.10,
      // backed by the party's own FormationInvite / FormationUsage rows — so
      // guest-invitation tokens are validated on redemption without us wiring a
      // recorder.  The old post-start `initializeStrandSolicitation({
      // formationUsageRecorder })` call was dropped per the 1.10 release notes;
      // that entry point is now only for customizing the responder (an approver,
      // a provisioner, custom deadlines).

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
          // Each attempt is time-boxed; `retryAfterRestart` retries ONLY the
          // transient "Failed to get super-majority" that the first control writes
          // after a lone restart hit, before the cohort has reconnected (sereus 1.9
          // notes).  A timeout is not that error, so it is not retried.
          await retryAfterRestart(() =>
            withTimeout(
              this.node!.publishStrand(strandId, 'o'),
              CONTROL_OP_TIMEOUT_MS,
              'publishStrand',
            ),
          );
          logger.info('Published health strand to control DB:', strandId);
        } catch (err) {
          // Non-fatal: the strand still works locally; it just isn't yet
          // discoverable by a drone.  A later connect can re-attempt (see
          // republishStrand).
          logger.warn('publishStrand deferred:', err instanceof Error ? err.message : err);
        }
      }

      // `addStrand` rejects with StrandAwaitingFirstSyncError when the first sync
      // has not finished yet, but leaves the strand launched and syncing — the
      // timeout is a progress report, not an outcome.  The kit's helper then waits
      // for the strand to become writable (measured: a first sync completing at
      // ~150 s against a 120 s budget on a 1.8 s round-trip link), so a slow first
      // replication from a remote cadre node is no longer reported as a failure.
      logger.info(`Adding health strand (founder=${!founded}):`, strandId);
      this.healthStrand = await attachStrandWhenWritable(this.node, {
        strandRow: {
          Id: strandId,
          MemberPrivateKey: null,
          Type: 'o', // open strand
          // cadre-core 0.13: provenance — the owner key of the machine that
          // published this Strand row.  We ARE the founder (we publishStrand
          // above under our own owner identity), so it's our own owner key.
          // null is legal (consent-seated strands record no trustworthy signer)
          // and is what we fall back to if owner genesis hasn't completed.
          FounderOwnerKey: this._authorityPublicKey,
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
   * Add a Linux cadre node (drone) by its bootstrap multiaddr, e.g.
   * `/ip4/<host>/tcp/4002/ws/p2p/<peerId>`.
   *
   * This is the FULL enrollment, not just a dial.  `addDrone()` is what both
   * AUTHORIZES the node (an owner-signed `CadrePeer` row) and mints the seed it
   * needs, and it records the handed-over address as a durable dial target.
   * Authorization is the part that actually matters: an unauthorized peer has
   * its cohort traffic refused, so writes still report success while nothing
   * replicates — a silent failure (see optimystic#19).  `createSeed()` alone
   * does NOT authorize, which is why this path does not use it.
   *
   * We then try to hand the seed over the wire (`/sereus/seed/1.0.0`).  If the
   * drone isn't listening for seeds, we return the encoded seed so it can be
   * delivered out of band (`cadre start --seed …`, or `POST /seed` when the
   * drone sets `CADRE_SEED_TOKEN`).
   */
  async connectToNode(addr: string): Promise<AddNodeResult> {
    const trimmed = addr.trim();
    if (!trimmed) throw new Error('Enter a bootstrap multiaddr');
    // Validate — multiaddr() throws on a malformed address.
    multiaddr(trimmed);
    const dronePeerId = peerIdFromMultiaddr(trimmed);
    if (!dronePeerId) {
      throw new Error('Address must end in /p2p/<peerId> so the node can be identified');
    }

    await this.ensureStarted();
    if (!this.node) throw new Error('CadreNode not running');

    // Persist first: even if enrollment fails midway, the next start still
    // bootstraps against this node.
    const list = await this.getBootstrapNodes();
    if (!list.includes(trimmed)) {
      list.push(trimmed);
      await AsyncStorage.setItem(BOOTSTRAP_NODES_KEY, JSON.stringify(list));
    }

    // Authorizing is an owner-signed control write, so we need the owner key.
    if (!this._authorityPublicKey) {
      await this.createAuthorityKey(); // time-boxed; throws with a clear message
    }

    logger.info('Enrolling drone:', dronePeerId);
    const { seed, encodedSeed } = await withTimeout(
      this.node.addDrone({ dronePeerId, droneMultiaddrs: [trimmed] }),
      CONTROL_OP_TIMEOUT_MS,
      'addDrone',
    );
    logger.info('✓ drone authorized (CadrePeer row signed)');

    // Try to deliver the seed over the network; fall back to out-of-band.
    let delivered = false;
    let reason: string | undefined;
    try {
      const res = await withTimeout(
        this.node.deliverSeed(trimmed, seed),
        CONTROL_OP_TIMEOUT_MS,
        'deliverSeed',
      );
      delivered = res.accepted;
      reason = res.reason;
      logger.info(delivered ? '✓ seed delivered' : `seed not accepted: ${reason ?? 'unknown'}`);
    } catch (err) {
      reason = err instanceof Error ? err.message : String(err);
      logger.warn('seed delivery failed (deliver out of band):', reason);
    }

    // addDrone dials nothing itself; reconcile now rather than waiting for the
    // next timed pass, so the connection comes up immediately.
    try {
      await withTimeout(
        this.node.reconcileControlCohort(),
        CONTROL_OP_TIMEOUT_MS,
        'reconcileControlCohort',
      );
    } catch (err) {
      logger.warn('cohort reconcile deferred:', err instanceof Error ? err.message : err);
    }

    // Make sure the strand is discoverable by the node we just added.
    await this.republishStrand();

    logger.info(
      `[pairing] node=${dronePeerId} authorized=true delivered=${delivered}` +
        (reason ? ` reason=${reason}` : '') +
        ` controlConnections=${this.node.getControlConnectionCount()}`,
    );
    return { peerId: dronePeerId, delivered, encodedSeed, reason };
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
      // Same transient-only retry as the founding publish: this runs right after a
      // node is added, which is exactly when the control cohort is still settling.
      await retryAfterRestart(() =>
        withTimeout(
          this.node!.publishStrand(this._strandId!, 'o'),
          CONTROL_OP_TIMEOUT_MS,
          'publishStrand',
        ),
      );
    } catch (err) {
      logger.debug('republishStrand skipped:', err instanceof Error ? err.message : err);
    }
  }

  /**
   * Generate a base64url seed for transporting cadre membership to a new node
   * whose peer ID we do not know yet — i.e. a provider-hosted drone that gets
   * created from the seed (`cadre-provider`).
   *
   * NOTE: this seeds but does NOT authorize — `createSeed()` only signs the
   * current control-network state.  A node that is seeded but not authorized
   * has its cohort traffic refused and will not replicate (optimystic#19).
   * Once you know the node's address, enroll it with `connectToNode()`, which
   * uses `addDrone()` to authorize it properly.  Prefer that path whenever the
   * node already exists.
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

  /**
   * Peer IDs this node currently holds a live CONTROL-network connection to —
   * i.e. which cadre nodes (drones) are actually connected right now.  cadre-core
   * 1.9 emits no control-connection events, so this reads libp2p directly.
   */
  getConnectedControlPeerIds(): Set<string> {
    const libp2p = this.node?.getControlNode();
    if (!libp2p) return new Set();
    return new Set(libp2p.getConnections().map((c) => c.remotePeer.toString()));
  }

  /**
   * Subscribe to control-network peer connect/disconnect.  Returns an
   * unsubscribe function.  No-op (returns a no-op) before the node is running.
   */
  onControlConnectionChange(handler: () => void): () => void {
    const libp2p = this.node?.getControlNode();
    if (!libp2p) return () => {};
    const listener = () => handler();
    libp2p.addEventListener('peer:connect', listener);
    libp2p.addEventListener('peer:disconnect', listener);
    return () => {
      libp2p.removeEventListener('peer:connect', listener);
      libp2p.removeEventListener('peer:disconnect', listener);
    };
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
