import type { Database } from '@quereus/quereus';
import { USE_QUEREUS } from '../db/config';
import { getVariant } from '../mock';
import { cadreService } from '../services/CadreService';
import { withTimeout } from '../services/cadreAsync';

/**
 * How long to wait on a control-DB read before rendering without it. On a SOLO
 * node (no control cohort) a consistent read has no quorum and blocks forever, so
 * without this bound the screen hangs on "Loading". With a cohort (a drone joined)
 * these reads return in well under a second, so the timeout never bites.
 */
const CONTROL_READ_TIMEOUT_MS = 5000;

/** Drain a control-DB SELECT, giving up after a timeout so a solo node can't hang. */
async function readControlRows(
  db: Database,
  sql: string,
): Promise<Array<Record<string, unknown>>> {
  const rows: Array<Record<string, unknown>> = [];
  try {
    await withTimeout(
      (async () => {
        for await (const row of db.eval(sql)) rows.push(row as Record<string, unknown>);
      })(),
      CONTROL_READ_TIMEOUT_MS,
      sql,
    );
  } catch {
    // Solo node (read blocked) or table not present yet — render with what we have.
  }
  return rows;
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
  const [ownerRows, peerRows] = await Promise.all([
    readControlRows(db, 'SELECT Key FROM CadreControl.OwnerKey'),
    readControlRows(db, 'SELECT PeerId, Multiaddr FROM CadreControl.CadrePeer'),
  ]);

  // ---- Owner keys -------------------------------------------------------
  const keys: AuthorityKey[] = ownerRows.map((row): AuthorityKey => ({
    id: String(row.Key),
    // Phase 2+: store type/protection in a local metadata table. For now,
    // default to vault/biometric since that's the only implemented key path.
    type: 'vault',
    protection: 'biometric',
    publicKey: String(row.Key),
  }));

  // ---- Cadre peers (nodes) -----------------------------------------------
  const cadreNodes: SereusNode[] = peerRows.map((row): SereusNode => {
    const peerId = String(row.PeerId);
    return {
      id: peerId,
      // Phase 3+: store display name, device type, added-at in local metadata.
      name: peerId === cadreService.peerId ? 'This device' : formatPeerId(peerId),
      type: 'cadre',
      deviceType: 'phone',
      status: 'unknown',
      peerId,
      addedAt: new Date().toISOString(),
    };
  });

  // Always surface THIS device first, even before it has voucher-registered
  // itself as a CadrePeer (which it can't on a solo node). Matches the screen
  // spec ("this device always appears first").
  const myPeerId = cadreService.peerId;
  if (myPeerId && !cadreNodes.some((n) => n.peerId === myPeerId)) {
    cadreNodes.unshift({
      id: myPeerId,
      name: 'This device',
      type: 'cadre',
      deviceType: 'phone',
      status: 'online',
      peerId: myPeerId,
      addedAt: new Date().toISOString(),
    });
  }

  // ---- Strand guests -----------------------------------------------------
  // Phase 4+: query Strand table + local metadata for guest membership.
  const guestNodes: SereusNode[] = [];

  return {
    partyId: cadreService.partyId,
    keys,
    cadreNodes,
    guestNodes,
  };
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
