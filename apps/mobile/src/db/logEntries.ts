import { getDatabase } from './index';
import { newUuid } from '../util/id';
import { toDbDatetime, fromDbDatetime, captureUtcOffsetMinutes } from '../util/datetime';
import { noteLogActivity } from '../services/reminders/notifications';

export interface LogEntry {
  id: string;
  timestamp: string;
  /** Local UTC offset (minutes; local = UTC + offset) in effect when logged; null if not captured. */
  eventUtcOffsetMinutes?: number | null;
  typeId: string;
  typeName: string;
  comment: string | null;
  items: LogEntryItem[];
}

export interface LogEntryItem {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  sourceBundleId: string | null;
  sourceBundleName: string | null;
  quantifiers: LogEntryQuantifier[];
}

export interface LogEntryQuantifier {
  id: string;
  name: string;
  value: number;
  units: string | null;
  minValue: number | null;
  maxValue: number | null;
}

export interface CreateLogEntryInput {
  timestamp: string;
  typeId: string;
  comment: string | null;
  /**
   * Originating-zone offset (minutes; local = UTC + offset). Normally omitted so
   * it's captured from this device's zone at `timestamp`. Backup **restore**
   * passes the value from the backup so the original zone survives a device move.
   */
  eventUtcOffsetMinutes?: number | null;
  items: Array<{
    itemId: string;
    sourceBundleId: string | null;
    quantifiers: Array<{ quantifierId: string; value: number }>;
  }>;
}

export async function createLogEntry(input: CreateLogEntryInput): Promise<string> {
  const db = await getDatabase();
  const entryId = newUuid();

  await db.exec('BEGIN');
  try {
    await db.exec('INSERT INTO log_entries (id, timestamp, type_id, comment, event_utc_offset_minutes) VALUES (?, ?, ?, ?, ?)', [
      entryId,
      toDbDatetime(input.timestamp),
      input.typeId,
      input.comment,
      input.eventUtcOffsetMinutes !== undefined
        ? input.eventUtcOffsetMinutes
        : captureUtcOffsetMinutes(input.timestamp),
    ]);

    for (const item of input.items) {
      await db.exec('INSERT INTO log_entry_items (entry_id, item_id, source_bundle_id) VALUES (?, ?, ?)', [
        entryId,
        item.itemId,
        item.sourceBundleId,
      ]);

      for (const q of item.quantifiers) {
        await db.exec(
          'INSERT INTO log_entry_quantifier_values (entry_id, item_id, quantifier_id, value) VALUES (?, ?, ?, ?)',
          [entryId, item.itemId, q.quantifierId, q.value]
        );
      }
    }

    await db.exec('COMMIT');
    // Logging resets the inactivity nudge (fire-and-forget; never block the write).
    noteLogActivity().catch(() => {});
    return entryId;
  } catch (e) {
    await db.exec('ROLLBACK');
    throw e;
  }
}

export async function updateLogEntry(entryId: string, input: CreateLogEntryInput): Promise<void> {
  const db = await getDatabase();

  await db.exec('BEGIN');
  try {
    await db.exec('UPDATE log_entries SET timestamp = ?, type_id = ?, comment = ?, event_utc_offset_minutes = ? WHERE id = ?', [
      toDbDatetime(input.timestamp),
      input.typeId,
      input.comment,
      captureUtcOffsetMinutes(input.timestamp),
      entryId,
    ]);

    // Replace child rows. Quereus 4.3.1 fixed the scanning-DELETE tree-mutation
    // bug, so a plain predicate DELETE is safe again (no FK between these two
    // child tables, so delete order is free).
    await db.exec('DELETE FROM log_entry_quantifier_values WHERE entry_id = ?', [entryId]);
    await db.exec('DELETE FROM log_entry_items WHERE entry_id = ?', [entryId]);

    for (const item of input.items) {
      await db.exec('INSERT INTO log_entry_items (entry_id, item_id, source_bundle_id) VALUES (?, ?, ?)', [
        entryId,
        item.itemId,
        item.sourceBundleId,
      ]);

      for (const q of item.quantifiers) {
        await db.exec(
          'INSERT INTO log_entry_quantifier_values (entry_id, item_id, quantifier_id, value) VALUES (?, ?, ?, ?)',
          [entryId, item.itemId, q.quantifierId, q.value]
        );
      }
    }

    await db.exec('COMMIT');
  } catch (e) {
    await db.exec('ROLLBACK');
    throw e;
  }
}

export async function deleteLogEntry(entryId: string): Promise<void> {
  const db = await getDatabase();

  // Delete children first (their FKs reference log_entries with no ON DELETE
  // CASCADE, so deleting the parent alone would orphan/violate), then the parent.
  // Quereus 4.3.1 fixed the scanning-DELETE tree-mutation bug, so a plain
  // predicate DELETE is safe again.
  await db.exec('BEGIN');
  try {
    await db.exec('DELETE FROM log_entry_quantifier_values WHERE entry_id = ?', [entryId]);
    await db.exec('DELETE FROM log_entry_items WHERE entry_id = ?', [entryId]);
    await db.exec('DELETE FROM log_entries WHERE id = ?', [entryId]);
    await db.exec('COMMIT');
  } catch (e) {
    await db.exec('ROLLBACK');
    throw e;
  }
}

/** Build the shell LogEntry (no items yet) from an entries-query row. */
function mkEntry(er: any): LogEntry {
  return {
    id: er.id as string,
    timestamp: fromDbDatetime(er.timestamp as string),
    eventUtcOffsetMinutes: (er.eventUtcOffsetMinutes as number) ?? null,
    typeId: er.typeId as string,
    typeName: er.typeName as string,
    comment: (er.comment as string) ?? null,
    items: [],
  };
}

/**
 * Fill entries' items + quantifiers with two flat, set-based scans assembled in
 * JS — the shared engine behind getAllLogEntries / getLogEntriesPage /
 * getLogEntryById (replaces the old per-entry/per-item N+1, ~40× slower; see
 * db/bench.ts). Pass `entryIds` to scope the scans via `entry_id IN (...)` (a page
 * or a single entry); omit it to scan every row ("fetch everything"). Mutates the
 * entries held in `byId` in place. Items/quantifiers come back name-ordered.
 */
async function hydrateEntries(
  db: Awaited<ReturnType<typeof getDatabase>>,
  byId: Map<string, LogEntry>,
  entryIds?: string[],
): Promise<void> {
  if (byId.size === 0) return;
  const scoped = entryIds !== undefined;
  const ph = scoped ? entryIds!.map(() => '?').join(',') : '';
  const params = scoped ? entryIds! : [];

  const itemByKey = new Map<string, LogEntryItem>(); // `${entryId}\0${itemId}` -> item
  for await (const ir of db.eval(
    `SELECT lei.entry_id AS entryId, i.id AS itemId, i.name AS name,
            c.id AS categoryId, c.name AS categoryName,
            lei.source_bundle_id AS sourceBundleId, b.name AS sourceBundleName
     FROM log_entry_items lei
     JOIN items i ON i.id = lei.item_id
     JOIN categories c ON c.id = i.category_id
     LEFT JOIN bundles b ON b.id = lei.source_bundle_id
     ${scoped ? `WHERE lei.entry_id IN (${ph})` : ''}
     ORDER BY i.name ASC`,
    params,
  )) {
    const entry = byId.get(ir.entryId as string);
    if (!entry) continue;
    const item: LogEntryItem = {
      id: ir.itemId as string,
      name: ir.name as string,
      categoryId: ir.categoryId as string,
      categoryName: ir.categoryName as string,
      sourceBundleId: (ir.sourceBundleId as string) ?? null,
      sourceBundleName: (ir.sourceBundleName as string) ?? null,
      quantifiers: [],
    };
    entry.items.push(item);
    itemByKey.set(`${ir.entryId as string}\0${ir.itemId as string}`, item);
  }

  for await (const qr of db.eval(
    `SELECT qv.entry_id AS entryId, qv.item_id AS itemId,
            q.id AS id, q.name AS name, qv.value AS value,
            q.units AS units, q.min_value AS minValue, q.max_value AS maxValue
     FROM log_entry_quantifier_values qv
     JOIN item_quantifiers q ON q.id = qv.quantifier_id
     ${scoped ? `WHERE qv.entry_id IN (${ph})` : ''}
     ORDER BY q.name ASC`,
    params,
  )) {
    const item = itemByKey.get(`${qr.entryId as string}\0${qr.itemId as string}`);
    if (!item) continue;
    item.quantifiers.push({
      id: qr.id as string,
      name: qr.name as string,
      value: qr.value as number,
      units: (qr.units as string) ?? null,
      minValue: (qr.minValue as number) ?? null,
      maxValue: (qr.maxValue as number) ?? null,
    });
  }
}

export async function getAllLogEntries(): Promise<LogEntry[]> {
  const db = await getDatabase();
  const out: LogEntry[] = [];
  const byId = new Map<string, LogEntry>();
  for await (const er of db.eval(`
    SELECT e.id, e.timestamp, e.type_id AS typeId, t.name AS typeName, e.comment,
           e.event_utc_offset_minutes AS eventUtcOffsetMinutes
    FROM log_entries e JOIN types t ON t.id = e.type_id
    ORDER BY e.timestamp DESC
  `)) {
    const entry = mkEntry(er);
    out.push(entry);
    byId.set(entry.id, entry);
  }
  await hydrateEntries(db, byId); // full scan (no id filter)
  return out;
}

export type LogCursor = { ts: string; id: string };

/**
 * Keyset-paginated log entries, newest first. `cursor` is the opaque position
 * from the previous page's `nextCursor` (null = first page). Same local-nested
 * shape as getAllLogEntries, but bounded: a `LIMIT`ed entries page, then its
 * items/quantifiers via `entry_id IN (...)`. `nextCursor` is null when exhausted.
 */
export async function getLogEntriesPage(
  cursor: LogCursor | null,
  limit: number,
): Promise<{ entries: LogEntry[]; nextCursor: LogCursor | null }> {
  const db = await getDatabase();
  const fetchN = Math.max(1, limit) + 1; // peek one extra to detect a further page

  // 1) Entries page — keyset by (timestamp, id) DESC (id breaks timestamp ties).
  const where = cursor ? 'WHERE (e.timestamp < ? OR (e.timestamp = ? AND e.id < ?))' : '';
  const params = cursor ? [cursor.ts, cursor.ts, cursor.id] : [];
  const raw: any[] = [];
  for await (const er of db.eval(
    `SELECT e.id, e.timestamp, e.type_id AS typeId, t.name AS typeName, e.comment,
            e.event_utc_offset_minutes AS eventUtcOffsetMinutes
     FROM log_entries e JOIN types t ON t.id = e.type_id
     ${where}
     ORDER BY e.timestamp DESC, e.id DESC
     LIMIT ${fetchN}`,
    params,
  )) {
    raw.push(er);
  }

  const hasMore = raw.length > limit;
  const pageRows = hasMore ? raw.slice(0, limit) : raw;
  if (pageRows.length === 0) return { entries: [], nextCursor: null };

  const out: LogEntry[] = [];
  const byId = new Map<string, LogEntry>();
  for (const er of pageRows) {
    const entry = mkEntry(er);
    out.push(entry);
    byId.set(entry.id, entry);
  }
  const lastRow = pageRows[pageRows.length - 1];
  const nextCursor: LogCursor | null = hasMore ? { ts: lastRow.timestamp as string, id: lastRow.id as string } : null;

  await hydrateEntries(db, byId, out.map((e) => e.id)); // scoped to this page
  return { entries: out, nextCursor };
}

export async function getLogEntryById(entryId: string): Promise<LogEntry | null> {
  const db = await getDatabase();

  const entryRow = await db.get(`
      SELECT
        e.id,
        e.timestamp,
        e.type_id as typeId,
        t.name as typeName,
        e.comment,
        e.event_utc_offset_minutes as eventUtcOffsetMinutes
      FROM log_entries e
      JOIN types t ON t.id = e.type_id
      WHERE e.id = ?
    `, [entryId]);

  if (!entryRow) return null;

  // Same batched hydration as the list paths (no more per-item quantifier N+1).
  const entry = mkEntry(entryRow);
  const byId = new Map<string, LogEntry>([[entry.id, entry]]);
  await hydrateEntries(db, byId, [entry.id]);
  return entry;
}


