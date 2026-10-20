import type { Database } from '@quereus/quereus';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { USE_QUEREUS } from '../db/config';
import { getVariant } from '../mock';
import { cadreService } from '../services/CadreService';
import { withTimeout } from '../services/cadreAsync';
import { perfSql } from '../db/perf';

/**
 * How long to wait on a control-DB read before rendering without it. On a SOLO
 * node (no control cohort) a consistent read has no quorum and blocks forever, so
 * without this bound the screen hangs on "Loading". With a cohort (a drone joined)
 * these reads return in well under a second, so the timeout never bites.
 */
const CONTROL_READ_TIMEOUT_MS = 5000;

/**
 * Drain a control-DB SELECT, giving up after a timeout so a solo node can't hang.
 * `complete` is false when it gave up: the rows are then partial (usually none) and
 * must not be taken as the table's contents.
 */
async function readControlRows(
  db: Database,
  sql: string,
): Promise<{ rows: Array<Record<string, unknown>>; complete: boolean }> {
  const rows: Array<Record<string, unknown>> = [];
  const started = Date.now();
  try {
    await withTimeout(
      (async () => {
        for await (const row of db.eval(sql)) rows.push(row as Record<string, unknown>);
      })(),
      CONTROL_READ_TIMEOUT_MS,
      sql,
    );
  } catch (err) {
    // Solo node (read blocked) or table not present yet — render with what we have.
    console.warn(`[sereusConnections] control read gave up (${rows.length} rows so far): ${sql}:`,
      err instanceof Error ? err.message : err);
    perfSql(Date.now() - started, `${rows.length}!gaveup`, `[control] ${sql}`);
    return { rows, complete: false };
  }
  perfSql(Date.now() - started, rows.length, `[control] ${sql}`);
  return { rows, complete: true };
}

// ---------------------------------------------------------------------------
// Last-known snapshot
// ---------------------------------------------------------------------------
//
// Control-DB reads need the cohort, so while it reconnects (a relaunch, coming back
// from the background) they can give up.  The membership itself rarely changes, so
// the screen shows the last list it read and only the live status waits on the
// network.  A read that completes replaces the snapshot; one that gives up never
// shrinks it.

/** Exported for reset.ts (Clear local data). */
export const CONNECTIONS_SNAPSHOT_KEY = '@sereus/connectionsSnapshot';

type ConnectionsSnapshot = {
  partyId: string;
  selfPeerId: string | null;
  ownerKeys: string[];
  peerIds: string[];
  /** Each machine's self-published node profile ('transaction' = an app, 'storage' = an always-on node). */
  profiles?: Record<string, string | null>;
};

let memorySnapshot: ConnectionsSnapshot | null = null;

async function loadSnapshot(): Promise<ConnectionsSnapshot | null> {
  if (memorySnapshot) return memorySnapshot;
  try {
    const raw = await AsyncStorage.getItem(CONNECTIONS_SNAPSHOT_KEY);
    const parsed = raw ? (JSON.parse(raw) as ConnectionsSnapshot) : null;
    if (parsed && typeof parsed.partyId === 'string' && Array.isArray(parsed.peerIds) && Array.isArray(parsed.ownerKeys)) {
      memorySnapshot = parsed;
    }
  } catch {
    // unreadable — behave as if there were none
  }
  return memorySnapshot;
}

function saveSnapshot(snapshot: ConnectionsSnapshot): void {
  memorySnapshot = snapshot;
  AsyncStorage.setItem(CONNECTIONS_SNAPSHOT_KEY, JSON.stringify(snapshot)).catch(() => {});
}

/** Drop a node from the snapshot (after removing it), so a stale read can't bring it back. */
export async function forgetCachedNode(peerId: string): Promise<void> {
  const snapshot = await loadSnapshot();
  if (snapshot?.peerIds.includes(peerId)) {
    saveSnapshot({ ...snapshot, peerIds: snapshot.peerIds.filter((p) => p !== peerId) });
  }
}

/** Build screen data from member/key lists plus the live connection state. */
function buildData(
  partyId: string | null,
  selfPeerId: string | null,
  ownerKeys: string[],
  peerIds: string[],
  stale: boolean,
  profiles: Record<string, string | null> = {},
): SereusConnectionsData {
  const keys: AuthorityKey[] = ownerKeys.map((key): AuthorityKey => ({
    id: key,
    // Phase 2+: store type/protection in a local metadata table. For now,
    // default to vault/biometric since that's the only implemented key path.
    type: 'vault',
    protection: 'biometric',
    publicKey: key,
  }));

  // Live state: which nodes hold a control-network connection to us right now.
  // 'online' = connected; 'unreachable' = authorized but not connected.
  const connected = cadreService.getConnectedControlPeerIds();
  const cadreNodes: SereusNode[] = peerIds.map((peerId): SereusNode => {
    const isSelf = peerId === selfPeerId;
    return {
      id: peerId,
      // Phase 3+: store display name, device type, added-at in local metadata.
      name: isSelf ? 'This device' : formatPeerId(peerId),
      type: 'cadre',
      // 'transaction' is an app on a phone; 'storage' (or not published yet) an always-on node.
      deviceType: isSelf || profiles[peerId] === 'transaction' ? 'phone' : 'server',
      status: isSelf || connected.has(peerId) ? 'online' : 'unreachable',
      peerId,
      addedAt: new Date().toISOString(),
    };
  });

  // Always surface THIS device first, even before it has voucher-registered
  // itself as a CadrePeer (which it can't on a solo node). Matches the screen
  // spec ("this device always appears first").
  if (selfPeerId) {
    const at = cadreNodes.findIndex((n) => n.peerId === selfPeerId);
    const self: SereusNode = at >= 0 ? cadreNodes.splice(at, 1)[0] : {
      id: selfPeerId,
      name: 'This device',
      type: 'cadre',
      deviceType: 'phone',
      status: 'online',
      peerId: selfPeerId,
      addedAt: new Date().toISOString(),
    };
    cadreNodes.unshift(self);
  }

  // ---- Strand guests -----------------------------------------------------
  // Phase 4+: query Strand table + local metadata for guest membership.
  const guestNodes: SereusNode[] = [];

  return { partyId, keys, cadreNodes, guestNodes, stale };
}

/**
 * The last-known list, without starting the node or touching the network — for an
 * instant first render.  Null when nothing has been read yet (or in mock mode).
 */
export async function getCachedSereusConnections(): Promise<SereusConnectionsData | null> {
  if (!USE_QUEREUS) return null;
  const snapshot = await loadSnapshot();
  if (!snapshot) return null;
  // A snapshot from a party this device no longer serves (after Clear local data) is useless.
  if (cadreService.partyId && cadreService.partyId !== snapshot.partyId) return null;
  return buildData(snapshot.partyId, cadreService.peerId ?? snapshot.selfPeerId, snapshot.ownerKeys, snapshot.peerIds, true, snapshot.profiles);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuthorityKey = {
  id: string;
  type: 'vault' | 'dongle' | 'external';
  protection: 'login' | 'biometric' | 'password';
  publicKey: string;
};

export type SereusNode = {
  id: string;
  name: string;
  type: 'cadre' | 'guest';
  deviceType: 'phone' | 'server' | 'desktop' | 'other';
  status: 'online' | 'unknown' | 'unreachable';
  peerId: string;
  addedAt: string;
  source?: string;
};

export type SereusConnectionsData = {
  partyId: string | null;
  keys: AuthorityKey[];
  cadreNodes: SereusNode[];
  guestNodes: SereusNode[];
  /** True when some of it came from the last-known snapshot rather than a completed read. */
  stale?: boolean;
};

// ---------------------------------------------------------------------------
// Mock data (scenario tooling)
// ---------------------------------------------------------------------------

function loadMock(variant: string): SereusConnectionsData {
  switch (variant) {
    case 'empty':
      return require('../../mock/data/sereus-connections.empty.json') as SereusConnectionsData;
    case 'happy':
    default:
      return require('../../mock/data/sereus-connections.happy.json') as SereusConnectionsData;
  }
}

// ---------------------------------------------------------------------------
// Cadre data (real)
// ---------------------------------------------------------------------------

/**
 * Ensure the CadreNode is started.  `ensureStarted()` is idempotent (it shares
 * one in-flight promise and returns immediately once the strand is up), so we
 * call it unconditionally; DB init usually started it already.
 */
async function ensureCadreStarted(): Promise<void> {
  await cadreService.ensureStarted();
}

/**
 * Load connections data from the cadre control database.
 *
 * Phase 1: control database starts empty — no OwnerKey or CadrePeer rows
 * exist until the user creates a key (phase 2) or enrolls a node (phase 3).
 *
 * The raw Quereus Database is accessed via:
 *   controlDatabase.getDatabase().exec(sql)
 */
async function loadCadreData(): Promise<SereusConnectionsData> {
  const controlDb = cadreService.controlDatabase;
  if (!controlDb) {
    return {
      partyId: cadreService.partyId,
      keys: [],
      cadreNodes: [],
      guestNodes: [],
    };
  }

  const db = controlDb.getDatabase();

  // Control-DB reads are time-boxed (see readControlRows): on a solo node they
  // block on quorum and would otherwise hang the screen forever. Run both
  // concurrently so the worst-case wait is one timeout, not two.
  const [owners, peers] = await Promise.all([
    readControlRows(db, 'SELECT Key FROM CadreControl.OwnerKey'),
    readControlRows(db, 'SELECT PeerId, Profile FROM CadreControl.CadrePeer'),
  ]);

  const partyId = cadreService.partyId;
  const selfPeerId = cadreService.peerId ?? null;
  const previous = await loadSnapshot();
  const usable = previous && previous.partyId === partyId ? previous : null;

  // A completed read is the truth; one that gave up falls back to what we knew.
  const ownerKeys = owners.complete
    ? owners.rows.map((row) => String(row.Key))
    : usable?.ownerKeys ?? owners.rows.map((row) => String(row.Key));
  const peerIds = peers.complete
    ? peers.rows.map((row) => String(row.PeerId))
    : usable?.peerIds ?? peers.rows.map((row) => String(row.PeerId));
  const profiles: Record<string, string | null> = peers.complete
    ? Object.fromEntries(peers.rows.map((row) => [String(row.PeerId), row.Profile == null ? null : String(row.Profile)]))
    : usable?.profiles ?? {};

  if (partyId && (owners.complete || peers.complete)) {
    saveSnapshot({ partyId, selfPeerId, ownerKeys, peerIds, profiles });
  }

  return buildData(partyId, selfPeerId, ownerKeys, peerIds, !(owners.complete && peers.complete), profiles);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getSereusConnections(): Promise<SereusConnectionsData> {
  if (!USE_QUEREUS) {
    const variant = getVariant();
    if (variant === 'error') {
      throw new Error('mock:error');
    }
    const raw = loadMock(variant);
    return {
      partyId: raw.partyId ?? null,
      keys: raw.keys ?? [],
      cadreNodes: raw.cadreNodes ?? [],
      guestNodes: raw.guestNodes ?? [],
    };
  }

  // Real mode — start cadre and query control database
  try {
    await ensureCadreStarted();
  } catch (err) {
    console.warn('[sereus] CadreService failed to start:', err);
    // Return empty state so the UI renders rather than crashing.
    return {
      partyId: cadreService.partyId,
      keys: [],
      cadreNodes: [],
      guestNodes: [],
    };
  }

  return loadCadreData();
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

export function formatPeerId(peerId: string): string {
  const s = peerId ?? '';
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

export function formatPartyId(partyId: string | null): string {
  if (!partyId) return '—';
  if (partyId.length <= 12) return partyId;
  return `${partyId.slice(0, 8)}…`;
}
