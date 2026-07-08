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
      captureUtcOffsetMinutes(input.timestamp),
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

  // Snapshot the current child rows BEFORE any mutation (drain the cursors fully).
  // Quereus throws "Path is invalid due to mutation of the tree" if a table is
  // deleted-from via a scanning DELETE (`WHERE entry_id = ?`) that removes rows —
  // the delete mutates the b-tree the scan is walking. We avoid that two ways:
  //   1. If the child set is unchanged (the common case — editing only the time
  //      or comment), skip child mutation entirely and just update log_entries.
  //   2. When children DO change, delete each row by full primary key (a point
  //      delete, not a scan) after reading the keys into memory.
  const prevItems: Array<{ itemId: string; sourceBundleId: string | null }> = [];
  for await (const r of db.eval('SELECT item_id, source_bundle_id FROM log_entry_items WHERE entry_id = ?', [entryId])) {
    prevItems.push({ itemId: r.item_id as string, sourceBundleId: (r.source_bundle_id as string) ?? null });
  }
  const prevQuants: Array<{ itemId: string; quantifierId: string; value: number }> = [];
  for await (const r of db.eval('SELECT item_id, quantifier_id, value FROM log_entry_quantifier_values WHERE entry_id = ?', [entryId])) {
    prevQuants.push({ itemId: r.item_id as string, quantifierId: r.quantifier_id as string, value: r.value as number });
  }

  // Build normalized signatures to decide whether the children actually changed.
  const sigItems = (rows: Array<{ itemId: string; sourceBundleId: string | null }>) =>
    rows.map((x) => `${x.itemId}|${x.sourceBundleId ?? ''}`).sort().join(',');
  const sigQuants = (rows: Array<{ itemId: string; quantifierId: string; value: number }>) =>
    rows.map((x) => `${x.itemId}|${x.quantifierId}|${x.value}`).sort().join(',');

  const nextItems = input.items.map((it) => ({ itemId: it.itemId, sourceBundleId: it.sourceBundleId }));
  const nextQuants = input.items.flatMap((it) =>
    it.quantifiers.map((q) => ({ itemId: it.itemId, quantifierId: q.quantifierId, value: q.value })),
  );
  const childrenChanged =
    sigItems(prevItems) !== sigItems(nextItems) || sigQuants(prevQuants) !== sigQuants(nextQuants);

  await db.exec('BEGIN');
  try {
    await db.exec('UPDATE log_entries SET timestamp = ?, type_id = ?, comment = ?, event_utc_offset_minutes = ? WHERE id = ?', [
      toDbDatetime(input.timestamp),
      input.typeId,
      input.comment,
      captureUtcOffsetMinutes(input.timestamp),
      entryId,
    ]);

    if (childrenChanged) {
      // Point-delete existing children by full PK (never a scanning DELETE).
      for (const q of prevQuants) {
        await db.exec('DELETE FROM log_entry_quantifier_values WHERE entry_id = ? AND item_id = ? AND quantifier_id = ?', [
          entryId,
          q.itemId,
          q.quantifierId,
        ]);
      }
      for (const it of prevItems) {
        await db.exec('DELETE FROM log_entry_items WHERE entry_id = ? AND item_id = ?', [entryId, it.itemId]);
      }

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
  // CASCADE, so deleting the parent alone would orphan/violate). Snapshot the
  // child keys first, then point-delete by full PK — never a scanning DELETE,
  // which trips Quereus's "Path is invalid due to mutation of the tree".
  const items: string[] = [];
  for await (const r of db.eval('SELECT item_id FROM log_entry_items WHERE entry_id = ?', [entryId])) {
    items.push(r.item_id as string);
  }
  const quants: Array<{ itemId: string; quantifierId: string }> = [];
  for await (const r of db.eval('SELECT item_id, quantifier_id FROM log_entry_quantifier_values WHERE entry_id = ?', [entryId])) {
    quants.push({ itemId: r.item_id as string, quantifierId: r.quantifier_id as string });
  }

  await db.exec('BEGIN');
  try {
    for (const q of quants) {
      await db.exec('DELETE FROM log_entry_quantifier_values WHERE entry_id = ? AND item_id = ? AND quantifier_id = ?', [
        entryId,
        q.itemId,
        q.quantifierId,
      ]);
    }
    for (const itemId of items) {
      await db.exec('DELETE FROM log_entry_items WHERE entry_id = ? AND item_id = ?', [entryId, itemId]);
    }
    await db.exec('DELETE FROM log_entries WHERE id = ?', [entryId]);
    await db.exec('COMMIT');
  } catch (e) {
    await db.exec('ROLLBACK');
    throw e;
  }
}

export async function getAllLogEntries(): Promise<LogEntry[]> {
  const db = await getDatabase();

  const entryRows: any[] = [];
  for await (const row of db.eval(`
    SELECT
      e.id,
      e.timestamp,
      e.type_id as typeId,
      t.name as typeName,
      e.comment,
      e.event_utc_offset_minutes as eventUtcOffsetMinutes
    FROM log_entries e
    JOIN types t ON t.id = e.type_id
    ORDER BY e.timestamp DESC
  `)) {
    entryRows.push(row);
  }

  const out: LogEntry[] = [];

  for (const er of entryRows) {
    const entryId = er.id as string;

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

    out.push({
      id: entryId,
      timestamp: fromDbDatetime(er.timestamp as string),
      eventUtcOffsetMinutes: (er.eventUtcOffsetMinutes as number) ?? null,
      typeId: er.typeId as string,
      typeName: er.typeName as string,
      comment: (er.comment as string) ?? null,
      items,
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


