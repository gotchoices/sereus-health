/**
 * Development-only write timing (see src/db/perf.ts).  When `HEALTH_PERF=1`, opening
 * `health://perf/write` logs one entry through the app's real save path (`createLogEntry`):
 * the first Type, three of its items, comment `perf-write`.  It logs
 *
 *   [perf] write <ms> items=3
 *
 * so scripts/perf can time a log-entry save the way a user triggers one.  Entries it makes are
 * marked by their comment and can be deleted.
 *
 * `health://perf/submit` saves the same way through the background path the editor uses
 * (src/sync/pendingChanges.ts) and logs
 *
 *   [perf] submit ack=<ms> commit=<ms> items=3
 *
 * — `ack` is what the user waits for (the editor closes), `commit` is when the write landed.
 */
import { Linking } from 'react-native';
import { PERF_ENABLED } from './perf';
import { getDatabase } from './index';
import { createLogEntry } from './logEntries';
import { onChangeCommitted, submitLogChange } from '../sync/pendingChanges';
import { newUuid } from '../util/id';

const WRITE_LINK = 'health://perf/write';
const SUBMIT_LINK = 'health://perf/submit';

async function pickItems(): Promise<{ typeId: string; typeName: string; picked: Array<{ id: string; name: string }> } | null> {
  const db = await getDatabase();
  const type = await db.get('SELECT id, name FROM types ORDER BY display_order, name LIMIT 1');
  if (!type) return null;
  const categoryIds = new Set<string>();
  for await (const r of db.eval('SELECT id FROM categories WHERE type_id = ?', [type.id as string])) categoryIds.add(r.id as string);
  const items: Array<{ id: string; name: string }> = [];
  for await (const r of db.eval('SELECT id, name, category_id FROM items')) {
    if (categoryIds.has(r.category_id as string)) items.push({ id: r.id as string, name: r.name as string });
  }
  return { typeId: type.id as string, typeName: type.name as string, picked: items.sort(() => Math.random() - 0.5).slice(0, 3) };
}

async function timedSubmit(): Promise<void> {
  const choice = await pickItems();
  if (!choice) { console.info('[perf] submit skipped: no types'); return; }
  const entryId = newUuid();
  const timestamp = new Date().toISOString();
  const t0 = Date.now();
  const committed = new Promise<number>((resolve) => {
    const off = onChangeCommitted(({ entryId: id }) => { if (id === entryId) { off(); resolve(Date.now() - t0); } });
  });
  await submitLogChange(
    { kind: 'create', entryId, draft: { timestamp, typeId: choice.typeId, comment: 'perf-write', items: choice.picked.map((p) => ({ id: p.id, isBundle: false, values: {} })) } },
    { id: entryId, timestamp, type: choice.typeName, items: choice.picked.map((p) => p.name), comment: 'perf-write' },
  );
  const ack = Date.now() - t0;
  console.info(`[perf] submit ack=${ack} commit=${await committed} items=${choice.picked.length}`);
}

async function timedWrite(): Promise<void> {
  const db = await getDatabase();
  const type = await db.get('SELECT id FROM types ORDER BY display_order, name LIMIT 1');
  if (!type) { console.info('[perf] write skipped: no types'); return; }
  const categoryIds = new Set<string>();
  for await (const r of db.eval('SELECT id FROM categories WHERE type_id = ?', [type.id as string])) categoryIds.add(r.id as string);
  const items: string[] = [];
  for await (const r of db.eval('SELECT id, category_id FROM items')) {
    if (categoryIds.has(r.category_id as string)) items.push(r.id as string);
  }
  const picked = items.sort(() => Math.random() - 0.5).slice(0, 3);
  const t0 = Date.now();
  await createLogEntry({
    timestamp: new Date().toISOString(),
    typeId: type.id as string,
    comment: 'perf-write',
    items: picked.map((itemId) => ({ itemId, sourceBundleId: null, quantifiers: [] })),
  });
  console.info(`[perf] write ${Date.now() - t0} items=${picked.length}`);
}

if (PERF_ENABLED) {
  const onUrl = (url: string | null) => {
    if (url?.startsWith(WRITE_LINK)) timedWrite().catch((err) => console.warn('[perf] write failed:', err));
    else if (url?.startsWith(SUBMIT_LINK)) timedSubmit().catch((err) => console.warn('[perf] submit failed:', err));
  };
  Linking.addEventListener('url', ({ url }) => onUrl(url));
}
