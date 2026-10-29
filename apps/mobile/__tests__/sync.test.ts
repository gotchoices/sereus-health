import { withWrite } from '../src/sync/writeLane';
import { toSaveItems } from '../src/sync/entryDraft';
import { overlayHistory } from '../src/sync/historyOverlay';
import type { PendingChange } from '../src/sync/pendingChanges';
import type { LogEntry as HistoryRow } from '../src/data/logHistory';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe('writeLane', () => {
  it('runs writes one at a time, in submission order', async () => {
    const log: string[] = [];
    const job = (name: string, ms: number) => withWrite(async () => {
      log.push(`start ${name}`);
      await sleep(ms);
      log.push(`end ${name}`);
      return name;
    });
    const results = await Promise.all([job('a', 30), job('b', 1), job('c', 10)]);
    expect(results).toEqual(['a', 'b', 'c']);
    expect(log).toEqual(['start a', 'end a', 'start b', 'end b', 'start c', 'end c']);
  });

  it('keeps going after a failed write', async () => {
    const failed = withWrite(async () => { throw new Error('boom'); });
    const next = withWrite(async () => 'ok');
    await expect(failed).rejects.toThrow('boom');
    await expect(next).resolves.toBe('ok');
  });
});

describe('toSaveItems', () => {
  it('expands bundles and merges an item added both ways, keeping its quantifiers', () => {
    const items = toSaveItems(
      [
        { id: 'bundle1', isBundle: true, values: {} },
        { id: 'itemA', isBundle: false, values: { q1: 3 } },
      ],
      new Map([['bundle1', ['itemA', 'itemB']]]),
    );
    expect(items).toEqual([
      { itemId: 'itemA', sourceBundleId: null, quantifiers: [{ quantifierId: 'q1', value: 3 }] },
      { itemId: 'itemB', sourceBundleId: 'bundle1', quantifiers: [] },
    ]);
  });
});

describe('overlayHistory', () => {
  const row = (id: string, timestamp: string, type = 'Activity'): HistoryRow => ({ id, timestamp, type, items: [id] });
  const change = (p: Partial<PendingChange> & Pick<PendingChange, 'intent'>): PendingChange => ({
    key: Math.random().toString(36).slice(2), state: 'saving', queuedAt: 0, ...p,
  });
  const db = [row('e3', '2026-10-28T12:00:00Z'), row('e2', '2026-10-28T11:00:00Z'), row('e1', '2026-10-28T10:00:00Z')];
  const draft = { timestamp: '', typeId: 't', comment: null, items: [] };

  it('shows a new entry in timestamp order and marks it', () => {
    const preview = row('new', '2026-10-28T11:30:00Z');
    const o = overlayHistory(db, [change({ intent: { kind: 'create', entryId: 'new', draft }, preview })]);
    expect(o.rows.map((r) => r.id)).toEqual(['e3', 'new', 'e2', 'e1']);
    expect(o.marks.get('new')).toBe('saving');
  });

  it('hides a deleted entry and replaces an updated one', () => {
    const o = overlayHistory(db, [
      change({ intent: { kind: 'delete', entryId: 'e2' } }),
      change({ intent: { kind: 'update', entryId: 'e1', draft }, preview: row('e1', '2026-10-28T10:00:00Z', 'Outcome') }),
    ]);
    expect(o.rows.map((r) => r.id)).toEqual(['e3', 'e1']);
    expect(o.rows[1].type).toBe('Outcome'); // still being written: the preview, not the old stored row
    expect(o.marks.get('e1')).toBe('saving');
  });

  it('marks a written but unsynced entry and shows its stored row', () => {
    const o = overlayHistory(db, [
      change({ intent: { kind: 'update', entryId: 'e1', draft }, preview: row('e1', '2026-10-28T10:00:00Z', 'Outcome'), state: 'local' }),
    ]);
    expect(o.rows[2]).toBe(db[2]);
    expect(o.marks.get('e1')).toBe('local');
  });

  it('does not overlay a failed change', () => {
    const o = overlayHistory(db, [change({ intent: { kind: 'delete', entryId: 'e2' }, state: 'failed', error: 'x' })]);
    expect(o.rows.map((r) => r.id)).toEqual(['e3', 'e2', 'e1']);
    expect(o.marks.size).toBe(0);
  });

  it('returns the rows untouched when nothing is pending', () => {
    expect(overlayHistory(db, []).rows).toBe(db);
  });
});

describe('overlayHistory after the write', () => {
  const row = (id: string, timestamp: string, type = 'Activity'): HistoryRow => ({ id, timestamp, type, items: [id] });
  const draft = { timestamp: '', typeId: 't', comment: null, items: [] };
  const done = (entryId: string, preview: HistoryRow): PendingChange => ({
    key: 'k', state: 'done', queuedAt: 0, intent: { kind: 'create', entryId, draft }, preview,
  });

  it('keeps showing a written entry until the stored row arrives, with no marker', () => {
    const o = overlayHistory([row('e1', '2026-10-28T10:00:00Z')], [done('new', row('new', '2026-10-28T11:00:00Z'))]);
    expect(o.rows.map((r) => r.id)).toEqual(['new', 'e1']);
    expect(o.marks.size).toBe(0);
  });

  it('prefers the stored row once it is present', () => {
    const stored = row('new', '2026-10-28T11:00:00.000Z', 'Outcome');
    const o = overlayHistory([stored], [done('new', row('new', '2026-10-28T11:00:00Z', 'Activity'))]);
    expect(o.rows).toEqual([stored]);
  });
});
