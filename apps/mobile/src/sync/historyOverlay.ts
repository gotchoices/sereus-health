/**
 * Merge pending changes into the History list, so a saved entry appears (and a deleted one
 * disappears) the moment the user saves, before the background write lands. Pure.
 */
import type { LogEntry as HistoryRow } from '../data/logHistory';
import type { PendingChange } from './pendingChanges';

/** History order: newest first, by instant (not string — stored and fresh timestamps may differ in precision). */
export function newestFirst(a: HistoryRow, b: HistoryRow): number {
  return (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0);
}

/** Per-entry sync marker: still being written, or written but held only on this device. */
export type EntryMark = 'saving' | 'local';

export interface Overlay {
  rows: HistoryRow[];
  marks: ReadonlyMap<string, EntryMark>;
}

/**
 * `rows` are what the database returned (newest first). For each entry the latest unsettled
 * change wins: a delete hides the row, a create or update shows its preview. A failed change is
 * not overlaid — the database row (or its absence) is the truth, and the failure is reported
 * separately.
 */
export function overlayHistory(rows: readonly HistoryRow[], changes: readonly PendingChange[]): Overlay {
  const latest = new Map<string, PendingChange>();
  const marks = new Map<string, EntryMark>();
  for (const c of changes) {
    if (c.state === 'failed') continue;
    latest.set(c.intent.entryId, c);
    // Any unsettled change marks the entry; 'saving' outranks 'local'. 'done' marks nothing.
    if (c.state !== 'done' && marks.get(c.intent.entryId) !== 'saving') marks.set(c.intent.entryId, c.state);
  }
  if (!latest.size) return { rows: rows as HistoryRow[], marks };

  const out: HistoryRow[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    seen.add(r.id);
    const c = latest.get(r.id);
    if (!c) out.push(r);
    // Still being written: the database may hold the old content, so show the preview.
    // Written ('local' / 'done'): the stored row is the truth.
    else if (c.intent.kind !== 'delete') out.push(c.state === 'saving' ? c.preview ?? r : r);
    // delete: hidden
  }
  for (const c of latest.values()) {
    if (c.intent.kind === 'delete' || seen.has(c.intent.entryId) || !c.preview) continue;
    out.push(c.preview);
  }
  // Newest first; Array.prototype.sort is stable, so database order holds among equal times.
  out.sort(newestFirst);
  return { rows: out, marks };
}
