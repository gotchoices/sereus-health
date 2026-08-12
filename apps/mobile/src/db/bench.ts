import { getDatabase } from './index';
import { getAllLogEntries } from './logEntries';

// Dev-only micro-benchmark comparing ways to fetch the full log history
// (entries → items → quantifiers). Run from Settings → Debug. Times three shapes
// on the current dataset so we can pick before adding a fetch limit.

export type BenchResult = {
  label: string;
  ms: number;
  entries: number;
  items: number;
  quants: number;
  error?: string;
};

async function timeIt(
  label: string,
  fn: () => Promise<{ entries: number; items: number; quants: number }>,
): Promise<BenchResult> {
  try {
    const t0 = Date.now();
    const counts = await fn();
    return { label, ms: Date.now() - t0, ...counts };
  } catch (e) {
    return { label, ms: -1, entries: 0, items: 0, quants: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

/** The live app path: whatever `getAllLogEntries` currently does (as of this
 *  change, the local-nested form — so this should now track shape C). */
export async function benchCurrentNPlus1(): Promise<BenchResult> {
  return timeIt('A · getAllLogEntries() [live path]', async () => {
    const entries = await getAllLogEntries();
    let items = 0;
    let quants = 0;
    for (const e of entries) {
      items += e.items.length;
      for (const it of e.items) quants += it.quantifiers.length;
    }
    return { entries: entries.length, items, quants };
  });
}

/** Nested in the DB: one query; Quereus collapses items + quantifiers into native
 *  arrays via json_group_array (correlated sub-selects). */
export async function benchDbNested(): Promise<BenchResult> {
  return timeIt('B · DB-nested (single json_group_array query)', async () => {
    const db = await getDatabase();
    const sql = `
      SELECT
        e.id AS id,
        e.timestamp AS ts,
        t.name AS typeName,
        e.comment AS comment,
        e.event_utc_offset_minutes AS off,
        (SELECT json_group_array(json_object(
            'itemId', i.id,
            'name', i.name,
            'categoryName', c.name,
            'sourceBundleId', lei.source_bundle_id,
            'quantifiers', (
              SELECT json_group_array(json_object(
                'id', q.id, 'name', q.name, 'value', qv.value,
                'units', q.units, 'minValue', q.min_value, 'maxValue', q.max_value))
              FROM log_entry_quantifier_values qv
              JOIN item_quantifiers q ON q.id = qv.quantifier_id
              WHERE qv.entry_id = e.id AND qv.item_id = i.id)))
         FROM log_entry_items lei
         JOIN items i ON i.id = lei.item_id
         JOIN categories c ON c.id = i.category_id
         WHERE lei.entry_id = e.id) AS items
      FROM log_entries e
      JOIN types t ON t.id = e.type_id
      ORDER BY e.timestamp DESC
    `;
    let entries = 0;
    let items = 0;
    let quants = 0;
    for await (const row of db.eval(sql)) {
      entries++;
      const raw = (row as any).items;
      const its: any[] = Array.isArray(raw) ? raw : typeof raw === 'string' ? JSON.parse(raw) : [];
      items += its.length;
      for (const it of its) {
        const qs = it.quantifiers;
        const arr = Array.isArray(qs) ? qs : typeof qs === 'string' ? JSON.parse(qs) : [];
        quants += arr.length;
      }
    }
    return { entries, items, quants };
  });
}

/** Nested locally: three flat set-based queries, assembled/nested in JS. */
export async function benchLocalNested(): Promise<BenchResult> {
  return timeIt('C · Local-nested (3 flat queries + JS assembly)', async () => {
    const db = await getDatabase();

    type EntryRow = { id: string; items: any[] };
    const entries: EntryRow[] = [];
    const byId = new Map<string, EntryRow>();
    for await (const r of db.eval(
      `SELECT e.id AS id, e.timestamp AS ts, t.name AS typeName, e.comment AS comment,
              e.event_utc_offset_minutes AS off
       FROM log_entries e JOIN types t ON t.id = e.type_id
       ORDER BY e.timestamp DESC`,
    )) {
      const row = { id: r.id as string, items: [] as any[] };
      entries.push(row);
      byId.set(row.id, row);
    }

    // Items — one scan; bucket by entry.
    const itemByKey = new Map<string, any>(); // `${entryId}|${itemId}` -> item (with quantifiers[])
    let items = 0;
    for await (const r of db.eval(
      `SELECT lei.entry_id AS entryId, i.id AS itemId, i.name AS itemName,
              c.name AS categoryName, lei.source_bundle_id AS sourceBundleId
       FROM log_entry_items lei JOIN items i ON i.id = lei.item_id JOIN categories c ON c.id = i.category_id`,
    )) {
      const it = {
        itemId: r.itemId as string,
        name: r.itemName as string,
        categoryName: r.categoryName as string,
        sourceBundleId: (r.sourceBundleId as string) ?? null,
        quantifiers: [] as any[],
      };
      items++;
      byId.get(r.entryId as string)?.items.push(it);
      itemByKey.set(`${r.entryId}|${r.itemId}`, it);
    }

    // Quantifier values — one scan; attach to items.
    let quants = 0;
    for await (const r of db.eval(
      `SELECT qv.entry_id AS entryId, qv.item_id AS itemId, q.id AS quantId, q.name AS quantName,
              qv.value AS val, q.units AS units, q.min_value AS minValue, q.max_value AS maxValue
       FROM log_entry_quantifier_values qv JOIN item_quantifiers q ON q.id = qv.quantifier_id`,
    )) {
      const it = itemByKey.get(`${r.entryId}|${r.itemId}`);
      if (it) {
        it.quantifiers.push({
          id: r.quantId as string, name: r.quantName as string, value: r.val as number,
          units: (r.units as string) ?? null, minValue: (r.minValue as number) ?? null, maxValue: (r.maxValue as number) ?? null,
        });
        quants++;
      }
    }

    return { entries: entries.length, items, quants };
  });
}

/** Run all three (warm the path first). Order: local, DB, current-baseline last. */
export async function runQueryBenchmarks(): Promise<BenchResult[]> {
  const db = await getDatabase();
  try {
    for await (const row of db.eval('SELECT count(*) AS n FROM log_entries')) {
      if (row) break; // warmup — touch the path once
    }
  } catch {
    /* ignore warmup errors */
  }
  const results: BenchResult[] = [];
  results.push(await benchLocalNested());
  results.push(await benchDbNested());
  results.push(await benchCurrentNPlus1());
  return results;
}

export function formatBenchResults(results: BenchResult[]): string {
  return results
    .map((r) =>
      r.error
        ? `${r.label}\n   ERROR: ${r.error}`
        : `${r.label}\n   ${r.ms} ms · ${r.entries} entries, ${r.items} items, ${r.quants} quants`,
    )
    .join('\n\n');
}

// ---------------------------------------------------------------------------
// Insert-throughput benchmark (dev-only): individual INSERTs vs a single
// multi-row INSERT, on the LIVE storage stack (optimystic + rn-leveldb). Answers
// whether collapsing N single-row inserts into one multi-row statement actually
// reduces storage work, or whether the backend still pays per row.
//
// Uses a throwaway table it creates and drops. Not wired into any shipped flow.
// ---------------------------------------------------------------------------

export type InsertBenchResult = { label: string; ms: number; rows: number; error?: string };

const BENCH_TABLE = '_bench_scratch';

function benchRows(n: number, prefix: string): Array<[string, number, string, number]> {
  const out: Array<[string, number, string, number]> = [];
  for (let i = 0; i < n; i++) out.push([`${prefix}_${i}`, i, `name_${i}`, i * 7]);
  return out;
}

/** Run insert benchmarks at row count `n`. Each variant starts from an empty
 *  throwaway table (clearing happens OUTSIDE the timed section). Robust to a
 *  previous run that left a transaction open or rows behind. */
export async function runInsertBenchmarks(n = 172): Promise<InsertBenchResult[]> {
  const db = await getDatabase();
  const results: InsertBenchResult[] = [];

  // If a prior run threw mid-transaction, the connection can be left in a txn —
  // clear it so `BEGIN` doesn't fail with "already in a transaction".
  const rollbackIfOpen = async () => {
    try { if (!db.getAutocommit()) await db.exec('ROLLBACK'); } catch { /* ignore */ }
  };

  await rollbackIfOpen();
  try {
    await db.exec(`CREATE TABLE IF NOT EXISTS ${BENCH_TABLE} (id TEXT PRIMARY KEY, a INTEGER, b TEXT, c INTEGER)`);
  } catch (e) {
    results.push({ label: 'setup: CREATE TABLE', ms: -1, rows: 0, error: e instanceof Error ? e.message : String(e) });
    return results; // can't benchmark without the table
  }

  // Clear via DELETE (the app uses this successfully; DROP appears to be a no-op
  // on the strand). Not timed.
  const clear = async () => {
    await rollbackIfOpen();
    await db.exec(`DELETE FROM ${BENCH_TABLE}`);
  };

  const measure = async (label: string, prefix: string, run: (rows: Array<[string, number, string, number]>) => Promise<void>) => {
    try {
      await clear();
      const rows = benchRows(n, prefix);
      const t0 = Date.now();
      await run(rows);
      const ms = Date.now() - t0;
      results.push({ label, ms, rows: n });
    } catch (e) {
      await rollbackIfOpen(); // don't let a failed variant poison the next
      results.push({ label, ms: -1, rows: 0, error: e instanceof Error ? e.message : String(e) });
    }
  };

  // A · N individual single-row inserts, one transaction (mirrors createLogEntry/catalog today).
  await measure(`A · ${n} individual INSERTs (1 txn)`, 'ind', async (rows) => {
    await db.exec('BEGIN');
    for (const r of rows) await db.exec(`INSERT INTO ${BENCH_TABLE} (id,a,b,c) VALUES (?,?,?,?)`, r);
    await db.exec('COMMIT');
  });

  // B · multi-row inserts, chunk 50, one transaction.
  await measure(`B · multi-row INSERT chunk 50 (1 txn)`, 'mr50', async (rows) => {
    await db.exec('BEGIN');
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const ph = batch.map(() => '(?,?,?,?)').join(',');
      await db.exec(`INSERT INTO ${BENCH_TABLE} (id,a,b,c) VALUES ${ph}`, batch.flat());
    }
    await db.exec('COMMIT');
  });

  // C · single multi-row INSERT of all N rows, one transaction.
  await measure(`C · single multi-row INSERT of ${n} (1 txn)`, 'mrall', async (rows) => {
    await db.exec('BEGIN');
    const ph = rows.map(() => '(?,?,?,?)').join(',');
    await db.exec(`INSERT INTO ${BENCH_TABLE} (id,a,b,c) VALUES ${ph}`, rows.flat());
    await db.exec('COMMIT');
  });

  // Leave the throwaway table empty (DELETE works; DROP appears to no-op).
  try { await clear(); } catch { /* ignore */ }

  // Single-line, greppable summary for Metro/logcat (in addition to the Alert).
  // eslint-disable-next-line no-console
  console.log('[InsertBench] ' + results.map((r) => (r.error ? `${r.label}=ERR:${r.error}` : `${r.label}=${r.ms}ms`)).join('  |  '));
  return results;
}

export function formatInsertBenchResults(results: InsertBenchResult[]): string {
  return results
    .map((r) => (r.error ? `${r.label}\n   ERROR: ${r.error}` : `${r.label}\n   ${r.ms} ms (${r.rows} rows)`))
    .join('\n\n');
}

// ---------------------------------------------------------------------------
// FK-impact benchmark (dev-only): the real import cost scales with foreign-key
// count (16 ms/insert FK-free vs 231–470 ms on FK'd tables). This isolates two
// levers on a child table WITH an FK to a populated parent:
//   • multi-row vs individual  (does statement-batching help when FK checks dominate?)
//   • FK enforcement ON vs OFF (how much are the per-row FK reads costing?)
// Smaller N (individual+FK is slow). Cleans up after.
// ---------------------------------------------------------------------------

const FK_PARENT = '_bench_parent';
const FK_CHILD = '_bench_child';

export async function runFkBenchmarks(n = 40): Promise<InsertBenchResult[]> {
  const db = await getDatabase();
  const results: InsertBenchResult[] = [];
  const rollbackIfOpen = async () => {
    try { if (!db.getAutocommit()) await db.exec('ROLLBACK'); } catch { /* ignore */ }
  };
  const setFk = async (on: boolean) => {
    try { await db.exec(`PRAGMA foreign_keys = ${on ? 'ON' : 'OFF'}`); return true; } catch { return false; }
  };

  await rollbackIfOpen();
  try {
    await db.exec(`CREATE TABLE IF NOT EXISTS ${FK_PARENT} (id TEXT PRIMARY KEY)`);
    await db.exec(`CREATE TABLE IF NOT EXISTS ${FK_CHILD} (id TEXT PRIMARY KEY, pid TEXT, FOREIGN KEY (pid) REFERENCES ${FK_PARENT}(id))`);
  } catch (e) {
    results.push({ label: 'setup: CREATE TABLE (FK)', ms: -1, rows: 0, error: e instanceof Error ? e.message : String(e) });
    return results;
  }

  const parents = Array.from({ length: n }, (_, i) => `p_${i}`);
  const childRows = (prefix: string): Array<[string, string]> =>
    Array.from({ length: n }, (_, i) => [`${prefix}_${i}`, parents[i % parents.length]]);

  // reset both tables and repopulate the parent (FK targets must exist)
  const reset = async () => {
    await rollbackIfOpen();
    await setFk(true);
    await db.exec(`DELETE FROM ${FK_CHILD}`);
    await db.exec(`DELETE FROM ${FK_PARENT}`);
    await db.exec('BEGIN');
    await db.exec(`INSERT INTO ${FK_PARENT} (id) VALUES ${parents.map(() => '(?)').join(',')}`, parents);
    await db.exec('COMMIT');
  };

  const individual = async (rows: Array<[string, string]>) => {
    await db.exec('BEGIN');
    for (const r of rows) await db.exec(`INSERT INTO ${FK_CHILD} (id,pid) VALUES (?,?)`, r);
    await db.exec('COMMIT');
  };
  const multirow = async (rows: Array<[string, string]>) => {
    await db.exec('BEGIN');
    await db.exec(`INSERT INTO ${FK_CHILD} (id,pid) VALUES ${rows.map(() => '(?,?)').join(',')}`, rows.flat());
    await db.exec('COMMIT');
  };

  const measure = async (label: string, fkOn: boolean, prefix: string, run: (rows: Array<[string, string]>) => Promise<void>) => {
    try {
      await reset();
      const fkOk = await setFk(fkOn);
      const rows = childRows(prefix);
      const t0 = Date.now();
      await run(rows);
      results.push({ label: `${label}${fkOk ? '' : ' [PRAGMA n/a]'}`, ms: Date.now() - t0, rows: n });
    } catch (e) {
      await rollbackIfOpen();
      results.push({ label, ms: -1, rows: 0, error: e instanceof Error ? e.message : String(e) });
    } finally {
      await setFk(true);
    }
  };

  await measure(`D · individual, FK ON`, true, 'dind', individual);
  await measure(`E · multi-row,  FK ON`, true, 'emr', multirow);
  await measure(`F · individual, FK OFF`, false, 'find', individual);
  await measure(`G · multi-row,  FK OFF`, false, 'gmr', multirow);

  try { await setFk(true); await db.exec(`DELETE FROM ${FK_CHILD}`); await db.exec(`DELETE FROM ${FK_PARENT}`); } catch { /* ignore */ }

  // eslint-disable-next-line no-console
  console.log('[FkBench] ' + results.map((r) => (r.error ? `${r.label}=ERR:${r.error}` : `${r.label}=${r.ms}ms`)).join('  |  '));
  return results;
}

// ---------------------------------------------------------------------------
// REAL-table benchmark (dev-only): individual vs multi-row INSERT into the
// actual `items` schema table (optimystic-backed) — the only test that reflects
// the real import cost. Uses a throwaway type+category it creates and deletes;
// it NEVER touches existing catalog rows (all bench items live under the
// throwaway category and are deleted by that category id).
// ---------------------------------------------------------------------------

const BT_TYPE = 'bench_type_id';
const BT_CAT = 'bench_cat_id';

export async function runRealTableBench(n = 50): Promise<InsertBenchResult[]> {
  const db = await getDatabase();
  const results: InsertBenchResult[] = [];
  const rollbackIfOpen = async () => {
    try { if (!db.getAutocommit()) await db.exec('ROLLBACK'); } catch { /* ignore */ }
  };

  // Throwaway parent type+category so bench items never mingle with real ones.
  const ensureParent = async () => {
    await rollbackIfOpen();
    try { await db.exec(`DELETE FROM items WHERE category_id = ?`, [BT_CAT]); } catch { /* ignore */ }
    await db.exec('BEGIN');
    try {
      await db.exec(`DELETE FROM categories WHERE id = ?`, [BT_CAT]);
      await db.exec(`DELETE FROM types WHERE id = ?`, [BT_TYPE]);
      await db.exec(`INSERT INTO types (id, name, display_order) VALUES (?, ?, ?)`, [BT_TYPE, '_benchtype', 99999]);
      await db.exec(`INSERT INTO categories (id, name, type_id) VALUES (?, ?, ?)`, [BT_CAT, '_benchcat', BT_TYPE]);
      await db.exec('COMMIT');
    } catch (e) { await db.exec('ROLLBACK'); throw e; }
  };

  const clearItems = async () => {
    await rollbackIfOpen();
    await db.exec(`DELETE FROM items WHERE category_id = ?`, [BT_CAT]);
  };

  const itemRows = (prefix: string): Array<[string, string, null, string]> =>
    Array.from({ length: n }, (_, i) => [`bi_${prefix}_${i}`, `_benchitem_${prefix}_${i}`, null, BT_CAT]);

  try {
    await ensureParent();
  } catch (e) {
    results.push({ label: 'setup: throwaway type+category', ms: -1, rows: 0, error: e instanceof Error ? e.message : String(e) });
    return results;
  }

  const measure = async (label: string, prefix: string, run: (rows: Array<[string, string, null, string]>) => Promise<void>) => {
    try {
      await clearItems();
      const rows = itemRows(prefix);
      const t0 = Date.now();
      await run(rows);
      results.push({ label, ms: Date.now() - t0, rows: n });
    } catch (e) {
      await rollbackIfOpen();
      results.push({ label, ms: -1, rows: 0, error: e instanceof Error ? e.message : String(e) });
    }
  };

  await measure(`REAL items · individual (1 txn)`, 'ind', async (rows) => {
    await db.exec('BEGIN');
    for (const r of rows) await db.exec(`INSERT INTO items (id, name, description, category_id) VALUES (?, ?, ?, ?)`, r);
    await db.exec('COMMIT');
  });

  await measure(`REAL items · multi-row chunk 50 (1 txn)`, 'mr', async (rows) => {
    await db.exec('BEGIN');
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      await db.exec(`INSERT INTO items (id, name, description, category_id) VALUES ${batch.map(() => '(?,?,?,?)').join(',')}`, batch.flat());
    }
    await db.exec('COMMIT');
  });

  // Full cleanup: bench items, then the throwaway category + type.
  try {
    await clearItems();
    await db.exec(`DELETE FROM categories WHERE id = ?`, [BT_CAT]);
    await db.exec(`DELETE FROM types WHERE id = ?`, [BT_TYPE]);
  } catch { /* ignore */ }

  // eslint-disable-next-line no-console
  console.log('[RealBench] ' + results.map((r) => (r.error ? `${r.label}=ERR:${r.error}` : `${r.label}=${r.ms}ms`)).join('  |  '));
  return results;
}
