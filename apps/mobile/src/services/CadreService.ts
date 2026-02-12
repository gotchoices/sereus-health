/**
 * CadreService — singleton wrapper around @sereus/cadre-core CadreNode.
 *
 * Lifecycle: start() → stop().
 *
 * Phase 1 (current): local-only CadreNode with empty bootstrap.
 * Control database initializes but has no peers.  Screen shows empty state
 * until keys and nodes are added (phases 2–3).
 *
 * References:
 *   sereus/packages/cadre-core/README.md  — CadreNode API
 *   sereus/docs/cadre-architecture.md     — CadreControl schema
 */

import { CadreNode, type CadreNodeConfig, type CadreNodeEvents, type ControlDatabase } from '@sereus/cadre-core';
import { MemoryRawStorage } from '@optimystic/db-p2p';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SAPP_ID = 'org.sereus.health';
const PARTY_ID_KEY = '@sereus/partyId';

// Bootstrap/relay via DNSADDR; operators update DNS without app deploy.
// Empty for Phase 1 (local-only).  Populate for Phase 2+ networking.
const BOOTSTRAP_NODES: string[] = [];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EventHandler<T> = (payload: T) => void;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class CadreServiceImpl {
  private node: CadreNode | null = null;
  private _partyId: string | null = null;
  private _startError: string | null = null;

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

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  /** Start the CadreNode.  Idempotent — does nothing if already running. */
  async start(): Promise<void> {
    if (this.node?.isRunning) return;
    this._startError = null;

    try {
      this._partyId = await this.getOrCreatePartyId();

      const config: CadreNodeConfig = {
        controlNetwork: {
          partyId: this._partyId,
          bootstrapNodes: BOOTSTRAP_NODES,
        },
        profile: 'transaction',
        strandFilter: { mode: 'sAppId', sAppId: SAPP_ID },
        // Phase 1: in-memory storage.
        // Phase 2+: swap to MMKVRawStorage from @optimystic/db-p2p-storage-rn
        // for persistent block storage across restarts.
        storage: {
          provider: (_strandId: string) => new MemoryRawStorage(),
        },
        network: {
          listenAddrs: [],       // RN nodes cannot listen
          // Transports: db-p2p/rn defaults to webSockets (no TCP).
        },
      };

      this.node = new CadreNode(config);
      await this.node.start();
    } catch (err) {
      this._startError = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }

  /** Stop the CadreNode gracefully.  Idempotent. */
  async stop(): Promise<void> {
    if (!this.node) return;
    await this.node.stop();
    this.node = null;
  }

  // -----------------------------------------------------------------------
  // Data access
  // -----------------------------------------------------------------------

  /**
   * Return the underlying ControlDatabase for direct SQL queries,
   * or null if the node is not running.
   *
   * Usage:
   *   const db = cadreService.controlDatabase;
   *   const qdb = db?.getDatabase();
   *   const result = qdb?.exec('SELECT Key FROM AuthorityKey');
   */
  get controlDatabase(): ControlDatabase | null {
    return this.node?.getControlDatabase() ?? null;
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
  // Identity persistence
  // -----------------------------------------------------------------------

  private async getOrCreatePartyId(): Promise<string> {
    const stored = await AsyncStorage.getItem(PARTY_ID_KEY);
    if (stored) return stored;

    const id = generateId();
    await AsyncStorage.setItem(PARTY_ID_KEY, id);
    return id;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Lightweight UUID v4. */
function generateId(): string {
  const bytes = new Uint8Array(16);
  // RN global crypto.getRandomValues is shimmed by react-native-get-random-values
  // which the app already uses via uuid transitive deps.  Fall back to Math.random
  // if not available (dev/test only).
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
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
