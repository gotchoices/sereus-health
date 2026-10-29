/**
 * Background log-entry saves and their sync status
 * (design/specs/mobile/global/async-activity.md → Sync status; domain/cadre.md → Write Outcomes).
 *
 * The editor hands a change here and closes at once. The change is journaled, written in the
 * background through the write lane, and then followed until the cadre holds it:
 *
 *   saving ─commit─▶ local (on this device only) ─held by the cadre─▶ synced (dropped from here)
 *     └──────────────────── refused ────────────────▶ failed (kept until dismissed)
 *
 * A commit made with no other cadre machine in its cohort (a solo user) is not "waiting" for
 * anything, so it is dropped at once and shows no marker.
 *
 * STACK-WORKAROUND(W6): the journal and its replay stand in for optimystic's offline-mode queue
 * (its journal, `entries()` and `onStatus`), which the companion Sereus release is expected to
 * expose. Back out when it does — see docs/stack-workarounds.md.
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
const JOURNAL_KEY = '@health/pendingLogChanges';

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

// ---- store ------------------------------------------------------------------------------

let changes: PendingChange[] = [];
const listeners = new Set<() => void>();
const committedListeners = new Set<(c: { kind: ChangeIntent['kind']; entryId: string }) => void>();
const failureListeners = new Set<(c: PendingChange) => void>();
let journalChain: Promise<void> = Promise.resolve();
let generation = 0; // bumped by discardAll(); a job from an older generation writes nothing

function emit(): void {
  for (const l of listeners) l();
}

function replace(key: string, patch: Partial<PendingChange> | null): void {
  changes = patch === null
    ? changes.filter((c) => c.key !== key)
    : changes.map((c) => (c.key === key ? { ...c, ...patch } : c));
  emit();
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

/** Forget a failed change after the user has seen it. */
export function dismissChange(key: string): void {
  if (changes.some((c) => c.key === key && c.state === 'failed')) replace(key, null);
}

/** Drop everything pending (Clear Local Data): queued jobs that have not started write nothing. */
export async function discardAll(): Promise<void> {
  generation += 1;
  changes = [];
  emit();
  await persistJournal([]);
}

// ---- journal (W6) -----------------------------------------------------------------------

function journalOf(list: readonly PendingChange[]): JournalRecord[] {
  return list.filter((c) => c.state === 'saving').map(({ key, intent, preview, queuedAt }) => ({ key, intent, preview, queuedAt }));
}

/** Writes are chained so an older snapshot never lands after a newer one. */
function persistJournal(records: JournalRecord[]): Promise<void> {
  journalChain = journalChain
    .then(() => AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(records)))
    .catch((e) => logger.warn('journal write failed:', e));
  return journalChain;
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
  await persistJournal(journalOf(changes));
  schedule(change, generation);
}

function schedule(change: PendingChange, gen: number): void {
  withWrite(() => (gen === generation ? write(change.intent) : Promise.resolve(null)))
    .then((txId) => {
      if (gen !== generation) return;
      for (const l of committedListeners) l({ kind: change.intent.kind, entryId: change.intent.entryId });
      followDurability(change.key, txId);
      persistJournal(journalOf(changes)).catch(() => undefined);
    })
    .catch((e: unknown) => {
      if (gen !== generation) return;
      const message = e instanceof Error ? e.message : String(e);
      logger.error('background save failed:', message);
      replace(change.key, { state: 'failed', error: message });
      persistJournal(journalOf(changes)).catch(() => undefined);
      const failed = changes.find((c) => c.key === change.key);
      if (failed) for (const l of failureListeners) l(failed);
    });
}

/** Perform one change inside the write lane; resolves to its `StampId()` (null when untracked). */
async function write(intent: ChangeIntent): Promise<string | null> {
  if (!USE_QUEREUS) return null; // mock backend: nothing to write
  if (intent.kind === 'delete') return (await deleteLogEntryTx(intent.entryId)).txId;

  const bundleMembers = new Map<string, string[]>();
  for (const it of intent.draft.items) if (it.isBundle) bundleMembers.set(it.id, await getBundleItemIds(it.id));
  const input = {
    timestamp: intent.draft.timestamp,
    typeId: intent.draft.typeId,
    comment: intent.draft.comment,
    items: toSaveItems(intent.draft.items, bundleMembers),
  };
  return intent.kind === 'create'
    ? (await createLogEntryTx({ ...input, id: intent.entryId })).txId
    : (await updateLogEntryTx(intent.entryId, input)).txId;
}

// ---- durability -------------------------------------------------------------------------

type CadreLike = {
  commitDurability(txId: string): { heldElsewhere: boolean; followed: boolean; report?: any } | undefined;
  onCommitHeld(handler: (txId: string) => void): () => void;
};
let cadre: CadreLike | null = null;
function cadreService(): CadreLike | null {
  if (!USE_OPTIMYSTIC) return null;
  if (!cadre) {
    cadre = (require('../services/CadreService').cadreService as CadreLike);
    cadre.onCommitHeld((txId) => {
      const held = changes.find((c) => c.txId === txId && c.state === 'local');
      if (held) settleDone(held.key);
    });
  }
  return cadre;
}

function settleDone(key: string): void {
  replace(key, { state: 'done' });
  setTimeout(() => {
    if (changes.some((c) => c.key === key && c.state === 'done')) replace(key, null);
  }, DONE_LINGER_MS);
}

/** After the local commit: drop the change if nothing is waiting, else mark it on this device only. */
function followDurability(key: string, txId: string | null): void {
  const svc = txId ? cadreService() : null;
  const d = svc && txId ? svc.commitDurability(txId) : undefined;
  const cohort: number = d?.report?.durability?.overall?.cohort ?? 1;
  if (!d || d.heldElsewhere || cohort <= 1) {
    settleDone(key); // synced, untracked, or solo (no other machine to wait for)
    return;
  }
  // Held only here. If it is `followed`, onCommitHeld clears it; otherwise nothing will say so
  // this session and it stays marked until the app restarts (cadre-core keeps no record across
  // restarts; offline mode's journal will — see W6).
  replace(key, { state: 'local', txId: txId ?? undefined });
}

// ---- startup ----------------------------------------------------------------------------

/**
 * Replay changes journaled by an earlier run that never committed (the app was closed mid-save).
 * Call once the database is ready. A create that already landed is skipped (its entry exists);
 * an update re-applies the same content; a delete of a missing entry is a no-op.
 */
export async function restorePendingChanges(): Promise<void> {
  let records: JournalRecord[] = [];
  try {
    const raw = await AsyncStorage.getItem(JOURNAL_KEY);
    records = raw ? (JSON.parse(raw) as JournalRecord[]) : [];
  } catch (e) {
    logger.warn('journal read failed:', e);
    return;
  }
  if (!records.length) return;
  logger.info(`replaying ${records.length} unsaved change(s) from the last run`);
  const gen = generation;
  for (const r of records) {
    if (r.intent.kind === 'create' && USE_QUEREUS && (await getLogEntryById(r.intent.entryId))) continue;
    const change: PendingChange = { ...r, state: 'saving' };
    changes = [...changes, change];
    emit();
    schedule(change, gen);
  }
  await persistJournal(journalOf(changes));
}
