/**
 * Development-only write timing (see src/db/perf.ts).  When `HEALTH_PERF=1`, opening
 * `health://perf/write` logs one entry through the app's real save path (`createLogEntry`):
 * the first Type, three of its items, comment `perf-write`.  It logs
 *
 *   [perf] write <ms> items=3
 *
 * so scripts/perf can time a log-entry save the way a user triggers one.  Entries it makes are
 * marked by their comment and can be deleted.
 */
import { Linking } from 'react-native';
import { PERF_ENABLED } from './perf';
import { getDatabase } from './index';
import { createLogEntry } from './logEntries';

const WRITE_LINK = 'health://perf/write';

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
  };
  Linking.addEventListener('url', ({ url }) => onUrl(url));
}
