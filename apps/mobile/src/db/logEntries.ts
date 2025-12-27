import { getDatabase } from './index';
import { newUuid } from '../util/id';

export interface LogEntry {
  id: string;
  timestamp: string;
  typeId: string;
  typeName: string;
  comment: string | null;
  items: LogEntryItem[];
}

export interface LogEntryItem {
  id: string;
  name: string;
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
    await db.exec('INSERT INTO log_entries (id, timestamp, type_id, comment) VALUES (?, ?, ?, ?)', [
      entryId,
      input.timestamp,
      input.typeId,
      input.comment,
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
    await db.exec('UPDATE log_entries SET timestamp = ?, type_id = ?, comment = ? WHERE id = ?', [
      input.timestamp,
      input.typeId,
      input.comment,
      entryId,
    ]);

    await db.exec('DELETE FROM log_entry_items WHERE entry_id = ?', [entryId]);
    await db.exec('DELETE FROM log_entry_quantifier_values WHERE entry_id = ?', [entryId]);

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
  await db.exec('DELETE FROM log_entries WHERE id = ?', [entryId]);
}

export async function getAllLogEntries(): Promise<LogEntry[]> {
  const db = await getDatabase();

  const entryStmt = await db.prepare(`
    SELECT 
      e.id,
      e.timestamp,
      e.type_id as typeId,
      t.name as typeName,
      e.comment
    FROM log_entries e
    JOIN types t ON t.id = e.type_id
    ORDER BY e.timestamp DESC
  `);

  const entryRows: any[] = [];
  for await (const row of entryStmt.all()) entryRows.push(row);
  await entryStmt.finalize();

  const out: LogEntry[] = [];

  for (const er of entryRows) {
    const entryId = er.id as string;

    const itemStmt = await db.prepare(`
      SELECT 
        i.id,
        i.name,
        c.name as categoryName,
        lei.source_bundle_id as sourceBundleId,
        b.name as sourceBundleName
      FROM log_entry_items lei
      JOIN items i ON i.id = lei.item_id
      JOIN categories c ON c.id = i.category_id
      LEFT JOIN bundles b ON b.id = lei.source_bundle_id
      WHERE lei.entry_id = ?
      ORDER BY i.name ASC
    `);

    const itemRows: any[] = [];
    for await (const row of itemStmt.all([entryId])) itemRows.push(row);
    await itemStmt.finalize();

    const items: LogEntryItem[] = [];
    for (const ir of itemRows) {
      const itemId = ir.id as string;
      const quantStmt = await db.prepare(`
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
      `);
      const quantRows: any[] = [];
      for await (const row of quantStmt.all([entryId, itemId])) quantRows.push(row);
      await quantStmt.finalize();

      items.push({
        id: itemId,
        name: ir.name as string,
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
      timestamp: er.timestamp as string,
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

  const entryRow = await (
    await db.prepare(`
      SELECT 
        e.id,
        e.timestamp,
        e.type_id as typeId,
        t.name as typeName,
        e.comment
      FROM log_entries e
      JOIN types t ON t.id = e.type_id
      WHERE e.id = ?
    `)
  ).get([entryId]);

  if (!entryRow) return null;

  const itemStmt = await db.prepare(`
    SELECT 
      i.id,
      i.name,
      c.name as categoryName,
      lei.source_bundle_id as sourceBundleId,
      b.name as sourceBundleName
    FROM log_entry_items lei
    JOIN items i ON i.id = lei.item_id
    JOIN categories c ON c.id = i.category_id
    LEFT JOIN bundles b ON b.id = lei.source_bundle_id
    WHERE lei.entry_id = ?
    ORDER BY i.name ASC
  `);

  const itemRows: any[] = [];
  for await (const row of itemStmt.all([entryId])) itemRows.push(row);
  await itemStmt.finalize();

  const items: LogEntryItem[] = [];
  for (const ir of itemRows) {
    const itemId = ir.id as string;
    const quantStmt = await db.prepare(`
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
    `);
    const quantRows: any[] = [];
    for await (const row of quantStmt.all([entryId, itemId])) quantRows.push(row);
    await quantStmt.finalize();

    items.push({
      id: itemId,
      name: ir.name as string,
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
    timestamp: entryRow.timestamp as string,
    typeId: entryRow.typeId as string,
    typeName: entryRow.typeName as string,
    comment: (entryRow.comment as string) ?? null,
    items,
  };
}


