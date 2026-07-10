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

export async function getAllLogEntries(): Promise<LogEntry[]> {
  const db = await getDatabase();

  // Local-nested fetch: three flat, set-based queries assembled in JS — replaces
  // the former per-entry/per-item N+1, which benchmarked ~40× slower on 42 entries
  // (see db/bench.ts). Ordering is preserved: entries by timestamp DESC, and each
  // entry's items/quantifiers by name (the flat scans are globally name-ordered).

  // 1) Entries (newest first).
  const out: LogEntry[] = [];
  const byId = new Map<string, LogEntry>();
  for await (const er of db.eval(`
    SELECT e.id, e.timestamp, e.type_id AS typeId, t.name AS typeName, e.comment,
           e.event_utc_offset_minutes AS eventUtcOffsetMinutes
    FROM log_entries e JOIN types t ON t.id = e.type_id
    ORDER BY e.timestamp DESC
  `)) {
    const entry: LogEntry = {
      id: er.id as string,
      timestamp: fromDbDatetime(er.timestamp as string),
      eventUtcOffsetMinutes: (er.eventUtcOffsetMinutes as number) ?? null,
      typeId: er.typeId as string,
      typeName: er.typeName as string,
      comment: (er.comment as string) ?? null,
      items: [],
    };
    out.push(entry);
    byId.set(entry.id, entry);
  }
  if (out.length === 0) return out;

  // 2) All items in one scan; push under their entry, index for the quantifier join.
  const itemByKey = new Map<string, LogEntryItem>(); // `${entryId}\0${itemId}` -> item
  for await (const ir of db.eval(`
    SELECT lei.entry_id AS entryId, i.id AS itemId, i.name AS name,
           c.id AS categoryId, c.name AS categoryName,
           lei.source_bundle_id AS sourceBundleId, b.name AS sourceBundleName
    FROM log_entry_items lei
    JOIN items i ON i.id = lei.item_id
    JOIN categories c ON c.id = i.category_id
    LEFT JOIN bundles b ON b.id = lei.source_bundle_id
    ORDER BY i.name ASC
  `)) {
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

  // 3) All quantifier values in one scan; attach to their item.
  for await (const qr of db.eval(`
    SELECT qv.entry_id AS entryId, qv.item_id AS itemId,
           q.id AS id, q.name AS name, qv.value AS value,
           q.units AS units, q.min_value AS minValue, q.max_value AS maxValue
    FROM log_entry_quantifier_values qv
    JOIN item_quantifiers q ON q.id = qv.quantifier_id
    ORDER BY q.name ASC
  `)) {
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

  return out;
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

  const itemRows: any[] = [];
  for await (const row of db.eval(`
    SELECT
      i.id,
      i.name,
      c.id as categoryId,
      c.name as categoryName,
      lei.source_bundle_id as sourceBundleId,
      b.name as sourceBundleName
    FROM log_entry_items lei
    JOIN items i ON i.id = lei.item_id
    JOIN categories c ON c.id = i.category_id
    LEFT JOIN bundles b ON b.id = lei.source_bundle_id
    WHERE lei.entry_id = ?
    ORDER BY i.name ASC
  `, [entryId])) {
    itemRows.push(row);
  }

  const items: LogEntryItem[] = [];
  for (const ir of itemRows) {
    const itemId = ir.id as string;
    const quantRows: any[] = [];
    for await (const row of db.eval(`
      SELECT
        q.id,
        q.name,
        qv.value,
        q.units,
        q.min_value as minValue,
        q.max_value as maxValue
      FROM log_entry_quantifier_values qv
      JOIN item_quantifiers q ON q.id = qv.quantifier_id
      WHERE qv.entry_id = ? AND qv.item_id = ?
      ORDER BY q.name ASC
    `, [entryId, itemId])) {
      quantRows.push(row);
    }

    items.push({
      id: itemId,
      name: ir.name as string,
      categoryId: ir.categoryId as string,
      categoryName: ir.categoryName as string,
      sourceBundleId: (ir.sourceBundleId as string) ?? null,
      sourceBundleName: (ir.sourceBundleName as string) ?? null,
      quantifiers: quantRows.map((qr) => ({
        id: qr.id as string,
        name: qr.name as string,
        value: qr.value as number,
        units: (qr.units as string) ?? null,
        minValue: (qr.minValue as number) ?? null,
        maxValue: (qr.maxValue as number) ?? null,
      })),
    });
  }

  return {
    id: entryRow.id as string,
    timestamp: fromDbDatetime(entryRow.timestamp as string),
    eventUtcOffsetMinutes: (entryRow.eventUtcOffsetMinutes as number) ?? null,
    typeId: entryRow.typeId as string,
    typeName: entryRow.typeName as string,
    comment: (entryRow.comment as string) ?? null,
    items,
  };
}


