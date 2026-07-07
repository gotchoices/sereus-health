/**
 * Executes an approved action plan as idempotent, insert-only writes.
 *
 * Design (per guardrails.md): no UPDATE/DELETE. Every write is query-first —
 * look up by natural identity, insert only if missing — because Quereus has no
 * INSERT OR IGNORE / ON CONFLICT. The whole plan runs in one transaction:
 * all-or-nothing. Parents are ensured (create-if-missing) so a plan that only
 * lists a leaf action still resolves; the user approved the plan's intent.
 *
 * Actions reference catalog entities by NAME; we resolve names → ids against the
 * live DB, which reflects earlier actions in the same transaction.
 */
import { getDatabase } from '../db';
import { newUuid } from '../util/id';
import { toDbDatetime, captureUtcOffsetMinutes } from '../util/datetime';
import type { ActionPlan, PlanAction } from './actionPlan';

type Db = Awaited<ReturnType<typeof getDatabase>>;

export interface ActionResult {
  actionId: string;
  kind: string;
  title: string;
  status: 'created' | 'exists' | 'partial' | 'skipped' | 'error';
  detail?: string;
}

export interface ExecuteResult {
  ok: boolean;
  results: ActionResult[];
  error?: string;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim() : undefined;
const num = (v: unknown): number | null => (typeof v === 'number' && isFinite(v) ? v : null);

/** First non-empty string among the given keys of a data object. */
function pick(data: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const s = str(data[k]);
    if (s) return s;
  }
  return undefined;
}

/**
 * Normalize a members/items array to names. The model may emit plain strings or
 * objects like `{ itemId, itemName }` / `{ name }` / `{ bundleName }` (it often
 * enriches with ids from db_query). We resolve by name for correctness.
 */
function namesOf(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const el of v) {
    if (typeof el === 'string') {
      const s = el.trim();
      if (s) out.push(s);
    } else if (isRecord(el)) {
      const s = pick(el, 'itemName', 'name', 'bundleName', 'memberName');
      if (s) out.push(s);
    }
  }
  return out;
}

// --- idempotent "ensure" helpers (query-first, insert if missing) ---

async function ensureType(db: Db, name: string) {
  const row = await db.get('SELECT id FROM types WHERE name = ?', [name]);
  if (row) return { id: row.id as string, created: false };
  const id = newUuid();
  await db.exec('INSERT INTO types (id, name) VALUES (?, ?)', [id, name]);
  return { id, created: true };
}

async function ensureCategory(db: Db, typeId: string, name: string) {
  const row = await db.get('SELECT id FROM categories WHERE type_id = ? AND name = ?', [typeId, name]);
  if (row) return { id: row.id as string, created: false };
  const id = newUuid();
  await db.exec('INSERT INTO categories (id, type_id, name) VALUES (?, ?, ?)', [id, typeId, name]);
  return { id, created: true };
}

async function ensureItem(db: Db, categoryId: string, name: string, description?: string | null) {
  const row = await db.get('SELECT id FROM items WHERE category_id = ? AND name = ?', [categoryId, name]);
  if (row) return { id: row.id as string, created: false };
  const id = newUuid();
  await db.exec('INSERT INTO items (id, category_id, name, description) VALUES (?, ?, ?, ?)', [
    id,
    categoryId,
    name,
    description ?? null,
  ]);
  return { id, created: true };
}

/** Find an item by name anywhere under a type (items live in categories under types). */
async function findItemInType(db: Db, typeId: string, name: string): Promise<string | null> {
  const row = await db.get(
    'SELECT i.id AS id FROM items i JOIN categories c ON c.id = i.category_id WHERE c.type_id = ? AND i.name = ? LIMIT 1',
    [typeId, name],
  );
  return row ? (row.id as string) : null;
}

async function findBundleInType(db: Db, typeId: string, name: string): Promise<string | null> {
  const row = await db.get('SELECT id FROM bundles WHERE type_id = ? AND name = ?', [typeId, name]);
  return row ? (row.id as string) : null;
}

// --- per-action execution ---

async function executeAction(db: Db, a: PlanAction): Promise<ActionResult> {
  const base = { actionId: a.actionId, kind: a.kind, title: a.title };
  const data = a.data ?? {};
  const skip = (detail: string): ActionResult => ({ ...base, status: 'skipped', detail });

  switch (a.kind) {
    case 'catalog.createType': {
      const name = pick(data, 'name', 'typeName', 'type');
      if (!name) return skip('missing name');
      const { created } = await ensureType(db, name);
      return { ...base, status: created ? 'created' : 'exists' };
    }

    case 'catalog.createCategory': {
      const typeName = pick(data, 'type', 'typeName');
      const name = pick(data, 'name', 'category', 'categoryName');
      if (!typeName || !name) return skip('missing type or category name');
      const type = await ensureType(db, typeName);
      const { created } = await ensureCategory(db, type.id, name);
      return { ...base, status: created ? 'created' : 'exists' };
    }

    case 'catalog.createItem': {
      const typeName = pick(data, 'type', 'typeName');
      const categoryName = pick(data, 'category', 'categoryName');
      const name = pick(data, 'name', 'item', 'itemName');
      if (!typeName || !categoryName || !name) return skip('missing type, category, or item name');
      const type = await ensureType(db, typeName);
      const category = await ensureCategory(db, type.id, categoryName);
      const { created } = await ensureItem(db, category.id, name, str(data.description) ?? null);
      return { ...base, status: created ? 'created' : 'exists' };
    }

    case 'catalog.createQuantifier': {
      const typeName = pick(data, 'type', 'typeName');
      const categoryName = pick(data, 'category', 'categoryName');
      const itemName = pick(data, 'item', 'itemName');
      const name = pick(data, 'name', 'quantifierName');
      if (!typeName || !categoryName || !itemName || !name) {
        return skip('missing type/category/item/quantifier name');
      }
      const type = await ensureType(db, typeName);
      const category = await ensureCategory(db, type.id, categoryName);
      const item = await ensureItem(db, category.id, itemName);
      const existing = await db.get('SELECT id FROM item_quantifiers WHERE item_id = ? AND name = ?', [
        item.id,
        name,
      ]);
      if (existing) return { ...base, status: 'exists' };
      await db.exec(
        'INSERT INTO item_quantifiers (id, item_id, name, min_value, max_value, units) VALUES (?, ?, ?, ?, ?, ?)',
        [newUuid(), item.id, name, num(data.minValue), num(data.maxValue), str(data.units) ?? null],
      );
      return { ...base, status: 'created' };
    }

    case 'catalog.createBundle': {
      const typeName = pick(data, 'type', 'typeName');
      const name = pick(data, 'name', 'bundle', 'bundleName');
      if (!typeName || !name) return skip('missing type or bundle name');
      const type = await ensureType(db, typeName);

      let bundleId = await findBundleInType(db, type.id, name);
      const bundleCreated = !bundleId;
      if (!bundleId) {
        bundleId = newUuid();
        await db.exec('INSERT INTO bundles (id, type_id, name) VALUES (?, ?, ?)', [bundleId, type.id, name]);
      }

      const missing: string[] = [];
      let order = 0;
      for (const memberName of namesOf(data.members)) {
        const itemId = await findItemInType(db, type.id, memberName);
        if (itemId) {
          const has = await db.get(
            'SELECT 1 AS x FROM bundle_members WHERE bundle_id = ? AND item_id = ?',
            [bundleId, itemId],
          );
          if (!has) {
            await db.exec(
              'INSERT INTO bundle_members (id, bundle_id, item_id, member_bundle_id, display_order) VALUES (?, ?, ?, ?, ?)',
              [newUuid(), bundleId, itemId, null, order],
            );
          }
          order++;
          continue;
        }
        const nestedId = await findBundleInType(db, type.id, memberName);
        if (nestedId && nestedId !== bundleId) {
          const has = await db.get(
            'SELECT 1 AS x FROM bundle_members WHERE bundle_id = ? AND member_bundle_id = ?',
            [bundleId, nestedId],
          );
          if (!has) {
            await db.exec(
              'INSERT INTO bundle_members (id, bundle_id, item_id, member_bundle_id, display_order) VALUES (?, ?, ?, ?, ?)',
              [newUuid(), bundleId, null, nestedId, order],
            );
          }
          order++;
          continue;
        }
        missing.push(memberName);
      }

      const detail = missing.length ? `members not found (skipped): ${missing.join(', ')}` : undefined;
      const status: ActionResult['status'] = missing.length
        ? 'partial'
        : bundleCreated
          ? 'created'
          : 'exists';
      return { ...base, status, detail };
    }

    case 'logs.createEntry': {
      const typeName = pick(data, 'type', 'typeName');
      if (!typeName) return skip('missing type');
      const type = await ensureType(db, typeName);
      const iso = pick(data, 'timestampUtc', 'timestamp') ?? new Date().toISOString();
      const comment = str(data.comment) ?? null;

      const entryId = newUuid();
      await db.exec(
        'INSERT INTO log_entries (id, timestamp, type_id, comment, event_utc_offset_minutes) VALUES (?, ?, ?, ?, ?)',
        [entryId, toDbDatetime(iso), type.id, comment, captureUtcOffsetMinutes(iso)],
      );

      const missing: string[] = [];
      for (const itemName of namesOf(data.items)) {
        const itemId = await findItemInType(db, type.id, itemName);
        if (!itemId) {
          missing.push(itemName);
          continue;
        }
        const has = await db.get('SELECT 1 AS x FROM log_entry_items WHERE entry_id = ? AND item_id = ?', [
          entryId,
          itemId,
        ]);
        if (!has) {
          await db.exec('INSERT INTO log_entry_items (entry_id, item_id, source_bundle_id) VALUES (?, ?, ?)', [
            entryId,
            itemId,
            null,
          ]);
        }
      }

      const detail = missing.length ? `items not found (skipped): ${missing.join(', ')}` : undefined;
      return { ...base, status: missing.length ? 'partial' : 'created', detail };
    }

    default:
      return skip(`unknown action kind: ${a.kind}`);
  }
}

/**
 * Execute the selected actions of an approved plan in one transaction.
 * All-or-nothing: a hard error rolls back everything.
 */
export async function executePlan(plan: ActionPlan, selectedIds: Set<string>): Promise<ExecuteResult> {
  const actions = plan.actions.filter((a) => selectedIds.has(a.actionId));
  if (actions.length === 0) return { ok: true, results: [] };

  const db = await getDatabase();
  const results: ActionResult[] = [];
  await db.exec('BEGIN');
  try {
    for (const a of actions) {
      results.push(await executeAction(db, a));
    }
    await db.exec('COMMIT');
    return { ok: true, results };
  } catch (e) {
    try {
      await db.exec('ROLLBACK');
    } catch {
      /* ignore rollback failure */
    }
    return { ok: false, results, error: e instanceof Error ? e.message : String(e) };
  }
}

/** A short human-readable summary of an execution, for the chat transcript. */
export function summarizeExecution(result: ExecuteResult): string {
  if (!result.ok) return `Couldn't apply the plan: ${result.error ?? 'unknown error'}. No changes were made.`;
  const created = result.results.filter((r) => r.status === 'created').length;
  const existed = result.results.filter((r) => r.status === 'exists').length;
  const notes = result.results.filter((r) => r.detail);
  const lines = [`Done — applied ${result.results.length} action(s): ${created} created, ${existed} already existed.`];
  for (const n of notes) lines.push(`• ${n.title}: ${n.detail}`);
  return lines.join('\n');
}
