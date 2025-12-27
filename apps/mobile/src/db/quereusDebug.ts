import { Database } from '@quereus/quereus';
import { createLogger } from '../util/logger';

const logger = createLogger('QuereusDebug');

export type QuereusAggregateReproResult =
  | { ok: true; rows: Array<{ category_id: string; usageCount: number }> }
  | { ok: false; error: unknown };

/**
 * Self-contained Quereus aggregate repro for RN/Hermes debugging.
 *
 * Creates a new in-memory DB (does not touch app DB), inserts rows, and runs a GROUP BY + count() query.
 */
export async function runAggregateRepro(): Promise<QuereusAggregateReproResult> {
  const db = new Database();
  try {
    await db.exec(`
      create table items (id text primary key, category_id text, name text);
      create table log_entry_items (entry_id text, item_id text, source_bundle_id text null, primary key (entry_id, item_id));
    `);

    await db.exec('insert into items (id, category_id, name) values (?, ?, ?)', ['item-1', 'cat-health', 'Getting Started']);
    await db.exec('insert into items (id, category_id, name) values (?, ?, ?)', ['item-2', 'cat-health', 'Another Item']);

    await db.exec('insert into log_entry_items (entry_id, item_id, source_bundle_id) values (?, ?, ?)', ['entry-1', 'item-1', null]);
    await db.exec('insert into log_entry_items (entry_id, item_id, source_bundle_id) values (?, ?, ?)', ['entry-2', 'item-1', null]);
    await db.exec('insert into log_entry_items (entry_id, item_id, source_bundle_id) values (?, ?, ?)', ['entry-2', 'item-2', null]);

    const sql = `
      select
        i.category_id,
        count(lei.entry_id) as usageCount
      from items i
      left join log_entry_items lei on lei.item_id = i.id
      group by i.category_id
      order by i.category_id asc
    `;
    logger.sql(sql);

    const stmt = await db.prepare(sql);
    const rows: any[] = [];
    for await (const r of stmt.all()) rows.push(r);
    await stmt.finalize();

    const mapped = rows.map((r) => ({
      category_id: r.category_id as string,
      usageCount: (r.usageCount as number) ?? 0,
    }));

    logger.info('Aggregate repro rows:', mapped);
    return { ok: true, rows: mapped };
  } catch (error) {
    logger.error('Aggregate repro failed:', error);
    return { ok: false, error };
  } finally {
    try {
      await db.close();
    } catch {
      // ignore
    }
  }
}


