/**
 * Background log-entry saves and their sync status
 * (design/specs/mobile/global/async-activity.md → Sync status; domain/cadre.md → Write Outcomes).
 *
 * The editor hands a change here and closes at once. The change runs through the write lane and is
 * then followed until the cadre holds it:
 *
 *   saving ─local commit─▶ local (on this device only) ─held by the cadre─▶ done → dropped
 *     └──────────────────────────── refused ─────────────────────────────▶ failed (kept until dismissed)
 *
 * With the strand in offline mode (sereus 1.19.1 / optimystic 1.20), the local commit resolves once
 * the transaction is in the stack's own journal, and the stack's queue sends it to the cadre. Its
 * statuses (`strand:offline-status`, by the commit's `StampId()`) drive 'local' → 'done' or
 * 'failed'; a drained commit's durability comes from the same `commitDurability` record an online
 * commit's does. Without offline mode (the queue absent) the local commit itself waits for the
 * cadre, and the durability record alone decides.
 *
 * Two small device-local records remain the app's own:
 *  - the pre-commit journal: a change between Save and its local commit (waiting in the write
 *    lane) is invisible to the stack, so it is journaled here and replayed at the next start;
 *  - the tracked map: which entry each queued transaction belongs to, so the History markers come
 *    back after a restart (the stack keeps the queue; it does not know about History rows).
 *
 * A commit made with no other cadre machine in its cohort (a solo user) is not "waiting" for
 * anything, so it is dropped at once and shows no marker.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { USE_OPTIMYSTIC, USE_QUEREUS } from '../db/config';
import { createLogger } from '../util/logger';
import { newUuid } from '../util/id';
import type { LogEntry as HistoryRow } from '../data/logHistory';
import { toSaveItems, type EntryDraft } from './entryDraft';
import { withWrite } from './writeLane';
import { createLogEntryTx, deleteLogEntryTx, getLogEntryById, updateLogEntryTx } from '../db/logEntries';
import { getBundleItemIds } from '../db/catalog';

const logger = createLogger('Sync');
/** Changes saved but not yet committed locally (waiting in the write lane). */
const JOURNAL_KEY = '@health/pendingLogChanges';
/** Changes committed locally and queued for the cadre, by transaction id (for markers after a restart). */
const TRACKED_KEY = '@health/queuedLogChanges';

/**
 * 'done' is internal: written and nothing to wait for (synced, or solo), kept briefly so History
 * can swap the preview for the stored row without a flicker. It shows no marker and is not
 * counted as waiting.
 */
export type SyncState = 'saving' | 'local' | 'done' | 'failed';

/** How long a 'done' change lingers for History to read the stored row. */
const DONE_LINGER_MS = 10_000;

export type ChangeIntent =
  | { kind: 'create'; entryId: string; draft: EntryDraft }
  | { kind: 'update'; entryId: string; draft: EntryDraft }
  | { kind: 'delete'; entryId: string };

export interface PendingChange {
  /** This change's own id (one entry can have several changes in flight). */
  key: string;
  intent: ChangeIntent;
  /** How the entry should look in History meanwhile (create / update). */
  preview?: HistoryRow;
  state: SyncState;
  queuedAt: number;
  /** The commit's `StampId()`, once written. */
  txId?: string;
  /** Why it was not saved (state 'failed'). */
  error?: string;
}

type JournalRecord = Pick<PendingChange, 'key' | 'intent' | 'preview' | 'queuedAt'>;
/** A queued transaction's entry, kept across restarts; the draft is dropped (the stack holds the rows). */
type TrackedRecord = { key: string; kind: ChangeIntent['kind']; entryId: string; preview?: HistoryRow; queuedAt: number };

// ---- store ------------------------------------------------------------------------------

let changes: PendingChange[] = [];
const listeners = new Set<() => void>();
const committedListeners = new Set<(c: { kind: ChangeIntent['kind']; entryId: string }) => void>();
const failureListeners = new Set<(c: PendingChange) => void>();
let storageChain: Promise<void> = Promise.resolve();
let generation = 0; // bumped by discardAll(); a job from an older generation writes nothing

function emit(): void {
  for (const l of listeners) l();
}

function replace(key: string, patch: Partial<PendingChange> | null): void {
  changes = patch === null
    ? changes.filter((c) => c.key !== key)
    : changes.map((c) => (c.key === key ? { ...c, ...patch } : c));
  emit();
  persist();
}

/** Current changes, oldest first. A new array whenever anything changes (useSyncExternalStore). */
export function getPendingChanges(): readonly PendingChange[] {
  return changes;
}

export function subscribePendingChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Fires once a change is written locally — the moment History can read the real row. */
export function onChangeCommitted(listener: (c: { kind: ChangeIntent['kind']; entryId: string }) => void): () => void {
  committedListeners.add(listener);
  return () => { committedListeners.delete(listener); };
}

/** Fires when a change is refused (not saved). */
export function onChangeFailed(listener: (c: PendingChange) => void): () => void {
  failureListeners.add(listener);
  return () => { failureListeners.delete(listener); };
}

/** Forget a failed change after the user has seen it (and let the stack forget its outcome). */
export function dismissChange(key: string): void {
  const c = changes.find((x) => x.key === key && x.state === 'failed');
  if (!c) return;
  if (c.txId) {
    try { cadreService()?.offlineQueue()?.acknowledge(c.txId); } catch (e) { logger.warn('acknowledge failed:', e); }
  }
  replace(key, null);
}

/** Drop everything pending (Clear Local Data): queued jobs that have not started write nothing. */
export async function discardAll(): Promise<void> {
  generation += 1;
  changes = [];
  emit();
  persist();
  await storageChain;
}

// ---- device-local records ---------------------------------------------------------------

/** Rewrite both records from the store. Chained, so an older snapshot never lands after a newer one. */
function persist(): void {
  const journal: JournalRecord[] = changes
    .filter((c) => c.state === 'saving')
    .map(({ key, intent, preview, queuedAt }) => ({ key, intent, preview, queuedAt }));
  const tracked: Record<string, TrackedRecord> = {};
  for (const c of changes) {
    if (c.state === 'local' && c.txId) {
      tracked[c.txId] = { key: c.key, kind: c.intent.kind, entryId: c.intent.entryId, preview: c.preview, queuedAt: c.queuedAt };
    }
  }
  storageChain = storageChain
    .then(() => AsyncStorage.multiSet([[JOURNAL_KEY, JSON.stringify(journal)], [TRACKED_KEY, JSON.stringify(tracked)]]))
    .catch((e) => logger.warn('sync records write failed:', e));
}

// ---- submitting -------------------------------------------------------------------------

/**
 * Queue a log-entry change and return once it is journaled — the caller can close its screen.
 * `preview` is shown in History until the real row can be read.
 */
export async function submitLogChange(intent: ChangeIntent, preview?: HistoryRow): Promise<void> {
  const change: PendingChange = { key: newUuid(), intent, preview, state: 'saving', queuedAt: Date.now() };
  changes = [...changes, change];
  emit();
  persist();
  await storageChain;
  schedule(change, generation);
}

function schedule(change: PendingChange, gen: number): void {
  withWrite(() => (gen === generation ? write(change.intent, (txId) => bindTx(change.key, txId)) : Promise.resolve(null)))
    .then((txId) => {
      if (gen !== generation) return;
      for (const l of committedListeners) l({ kind: change.intent.kind, entryId: change.intent.entryId });
      afterLocalCommit(change.key, txId);
    })
    .catch((e: unknown) => {
      if (gen !== generation) return;
      fail(change.key, e instanceof Error ? e.message : String(e));
    });
}

/**
 * Perform one change inside the write lane; resolves to its `StampId()` (null when untracked).
 * `onTxId` hears the id before COMMIT runs, because offline mode reports the transaction's first
 * status from inside the commit.
 */
async function write(intent: ChangeIntent, onTxId: (txId: string) => void): Promise<string | null> {
  if (!USE_QUEREUS) return null; // mock backend: nothing to write
  if (intent.kind === 'delete') return (await deleteLogEntryTx(intent.entryId, onTxId)).txId;

  const bundleMembers = new Map<string, string[]>();
  for (const it of intent.draft.items) if (it.isBundle) bundleMembers.set(it.id, await getBundleItemIds(it.id));
  const input = {
    timestamp: intent.draft.timestamp,
    typeId: intent.draft.typeId,
    comment: intent.draft.comment,
    items: toSaveItems(intent.draft.items, bundleMembers),
  };
  return intent.kind === 'create'
    ? (await createLogEntryTx({ ...input, id: intent.entryId }, onTxId)).txId
    : (await updateLogEntryTx(intent.entryId, input, onTxId)).txId;
}

function fail(key: string, message: string): void {
  logger.error('background save failed:', message);
  replace(key, { state: 'failed', error: message });
  const failed = changes.find((c) => c.key === key);
  if (failed) for (const l of failureListeners) l(failed);
}

// ---- following the cadre ----------------------------------------------------------------

/** A queued transaction's status, as the stack reports it (optimystic `QueuedTransactionStatus`). */
type QueueStatus = {
  kind: string;
  transactionId: string;
  reason?: string;
  error?: { message?: string } | unknown;
};

/** The slice of CadreService this module uses (kept loose: no native imports in tests). */
type CadreLike = {
  commitDurability(txId: string): { heldElsewhere: boolean; followed: boolean; report?: any } | undefined;
  onCommitHeld(handler: (txId: string) => void): () => void;
  offlineQueue(): { status(txId: string): unknown; acknowledge(txId: string): void } | undefined;
  onOfflineStatus(handler: (e: { status: unknown }) => void): () => void;
};
let cadre: CadreLike | null = null;
/** Statuses that arrived before their transaction was matched to a change. Bounded; consumed by
 *  afterLocalCommit / restore. */
const earlyStatus = new Map<string, QueueStatus>();

function cadreService(): CadreLike | null {
  if (!USE_OPTIMYSTIC) return null;
  if (!cadre) {
    cadre = (require('../services/CadreService').cadreService as CadreLike);
    cadre.onCommitHeld((txId) => {
      const held = changes.find((c) => c.txId === txId && c.state === 'local');
      if (held) settleDone(held.key);
    });
    cadre.onOfflineStatus(({ status }) => onQueueStatus(status as QueueStatus));
  }
  return cadre;
}

function queueStatus(txId: string): QueueStatus | undefined {
  try {
    return cadreService()?.offlineQueue()?.status(txId) as QueueStatus | undefined;
  } catch (e) {
    logger.warn('queue status failed:', e);
    return undefined;
  }
}

/** Learn the change's transaction id before its COMMIT, so statuses from the commit find it. */
function bindTx(key: string, txId: string): void {
  cadreService(); // the status listener must be attached before the COMMIT reports
  changes = changes.map((c) => (c.key === key ? { ...c, txId } : c));
}

/** One status from the stack's offline queue. */
function onQueueStatus(status: QueueStatus): void {
  const txId = status?.transactionId;
  if (!txId) return;
  const c = changes.find((x) => x.txId === txId);
  // Not ours yet (or a 'saving' change whose COMMIT is still resolving): remember it.
  if (!c || c.state === 'saving') {
    earlyStatus.set(txId, status);
    if (earlyStatus.size > 64) earlyStatus.delete(earlyStatus.keys().next().value as string);
    return;
  }
  applyStatus(c.key, txId, status);
}

function applyStatus(key: string, txId: string, status: QueueStatus): void {
  const c = changes.find((x) => x.key === key);
  if (!c || c.state === 'failed' || c.state === 'done') return;
  if (status.kind === 'committed') {
    followDurability(key, txId);
  } else if (status.kind === 'failed') {
    const err = status.error as { message?: string } | undefined;
    fail(key, `${status.reason ? `${status.reason}: ` : ''}${err?.message ?? 'refused'}`);
  } else if (c.state !== 'local') {
    // queued / submitting / partially-committed: on this device only, queued for the cadre.
    replace(key, { state: 'local', txId });
  }
}

/** The local commit resolved: decide from the queue (offline mode) or the durability record. */
function afterLocalCommit(key: string, txId: string | null): void {
  if (!txId) {
    settleDone(key); // untracked (mock / legacy backend)
    return;
  }
  const status = earlyStatus.get(txId) ?? queueStatus(txId);
  earlyStatus.delete(txId);
  if (status) {
    replace(key, { state: 'local', txId }); // in the queue: on this device only
    applyStatus(key, txId, status);
    return;
  }
  followDurability(key, txId); // not queued (online commit, or a network-only table)
}

function settleDone(key: string): void {
  replace(key, { state: 'done' });
  setTimeout(() => {
    if (changes.some((c) => c.key === key && c.state === 'done')) replace(key, null);
  }, DONE_LINGER_MS);
}

/** After a commit reached the cadre (or an online commit): done if held elsewhere or solo, else local. */
function followDurability(key: string, txId: string | null): void {
  const svc = txId ? cadreService() : null;
  const d = svc && txId ? svc.commitDurability(txId) : undefined;
  const cohort: number = d?.report?.durability?.overall?.cohort ?? 1;
  if (!d || d.heldElsewhere || cohort <= 1) {
    settleDone(key); // synced, untracked, or solo (no other machine to wait for)
    return;
  }
  // Held only here. If it is `followed`, onCommitHeld clears it; otherwise it stays marked.
  replace(key, { state: 'local', txId: txId ?? undefined });
}

// ---- startup ----------------------------------------------------------------------------

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (e) {
    logger.warn(`reading ${key} failed:`, e);
    return fallback;
  }
}

/**
 * After a restart, once the database is ready:
 *  - put back the markers of changes still queued for the cadre (from the stack's queue), and
 *    report the ones the cadre refused while the app was closed;
 *  - replay changes saved but never committed locally (the app closed while they waited in the
 *    write lane). A create that already landed is skipped; an update re-applies the same content;
 *    a delete of a missing entry is a no-op.
 */
export async function restorePendingChanges(): Promise<void> {
  const tracked = await readJson<Record<string, TrackedRecord>>(TRACKED_KEY, {});
  const refused: Array<[string, string, QueueStatus]> = [];
  for (const [txId, t] of Object.entries(tracked)) {
    const status = queueStatus(txId);
    if (!status || status.kind === 'committed') continue; // settled while closed, or outcome expired
    // No draft: the queued rows are the stack's to send; the intent only names the entry.
    const intent = { kind: t.kind, entryId: t.entryId } as ChangeIntent;
    changes = [...changes, { key: t.key, intent, preview: t.preview, state: 'local', queuedAt: t.queuedAt, txId }];
    if (status.kind === 'failed') refused.push([t.key, txId, status]);
  }
  emit();
  // Deferred so App's failure listener (attached at mount) hears it.
  if (refused.length) setTimeout(() => { for (const [k, tx, st] of refused) applyStatus(k, tx, st); }, 0);

  const records = await readJson<JournalRecord[]>(JOURNAL_KEY, []);
  if (records.length) logger.info(`replaying ${records.length} unsaved change(s) from the last run`);
  const gen = generation;
  for (const r of records) {
    if (r.intent.kind === 'create' && USE_QUEREUS && (await getLogEntryById(r.intent.entryId))) continue;
    const change: PendingChange = { ...r, state: 'saving' };
    changes = [...changes, change];
    emit();
    schedule(change, gen);
  }
  persist();
}
