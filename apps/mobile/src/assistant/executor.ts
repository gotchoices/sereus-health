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
import {
  addScheduled,
  deleteScheduled,
  getReminders,
  normalizeTimeOfDay,
  setInactivity,
  updateScheduled,
} from '../data/reminders';
import { syncReminders } from '../services/reminders/notifications';

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
 * Normalize a members/items array to id/name references. The model may emit plain
 * strings (names) or objects like `{ itemId, itemName }` — it often enriches with
 * ids from db_query. We keep both and resolve id-first, name-fallback.
 */
function itemRefsOf(v: unknown): Array<{ id?: string; name?: string }> {
  if (!Array.isArray(v)) return [];
  const out: Array<{ id?: string; name?: string }> = [];
  for (const el of v) {
    if (typeof el === 'string') {
      const s = el.trim();
      if (s) out.push({ name: s });
    } else if (isRecord(el)) {
      const id = str(el.itemId) ?? str(el.id) ?? str(el.memberBundleId) ?? str(el.bundleId);
      const name = pick(el, 'itemName', 'name', 'bundleName', 'memberName');
      if (id || name) out.push({ id, name });
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

/** Does a scheduled reminder with this id exist in device-local storage? */
async function scheduledReminderExists(id: string): Promise<boolean> {
  const state = await getReminders();
  return state.scheduled.some((r) => r.id === id);
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

/** True if a row with this id exists in the given table. */
async function idExists(db: Db, table: 'types' | 'categories' | 'items', id: string): Promise<boolean> {
  const row = await db.get(`SELECT id FROM ${table} WHERE id = ?`, [id]);
  return !!row;
}

/**
 * Resolve a type from a provided `typeId` (preferred, when it exists) or by name
 * (`type`/`typeName`, created if missing). The model frequently supplies the real
 * id from db_query — accept it — but never trust an id blindly (FK-safe).
 */
async function resolveType(db: Db, data: Record<string, unknown>) {
  const id = str(data.typeId);
  if (id && (await idExists(db, 'types', id))) return { id, created: false };
  const name = pick(data, 'type', 'typeName');
  return name ? ensureType(db, name) : null;
}

/** Resolve a category from `categoryId` (valid) or `category`/`categoryName` under typeId. */
async function resolveCategory(db: Db, typeId: string, data: Record<string, unknown>) {
  const id = str(data.categoryId);
  if (id && (await idExists(db, 'categories', id))) return { id, created: false };
  const name = pick(data, 'category', 'categoryName');
  return name ? ensureCategory(db, typeId, name) : null;
}

/** Resolve an item reference (id-first, name-fallback) to an existing item id under a type. */
async function resolveItemId(db: Db, typeId: string, ref: { id?: string; name?: string }): Promise<string | null> {
  if (ref.id && (await idExists(db, 'items', ref.id))) return ref.id;
  return ref.name ? findItemInType(db, typeId, ref.name) : null;
}

// --- per-action execution ---

async function executeAction(db: Db, a: PlanAction): Promise<ActionResult> {
  const base = { actionId: a.actionId, kind: a.kind, title: a.title };
  const data = a.data ?? {};
  // Include the fields the model actually sent, so a "missing X" skip is diagnosable.
  const skip = (detail: string): ActionResult => ({
    ...base,
    status: 'skipped',
    detail: `${detail} — received fields: [${Object.keys(data).join(', ') || 'none'}]`,
  });

  switch (a.kind) {
    case 'catalog.createType': {
      const name = pick(data, 'name', 'typeName', 'type');
      if (!name) return skip('missing name');
      const { created } = await ensureType(db, name);
      return { ...base, status: created ? 'created' : 'exists' };
    }

    case 'catalog.createCategory': {
      const type = await resolveType(db, data);
      if (!type) return skip('missing type (type/typeName or typeId)');
      const name = pick(data, 'name', 'category', 'categoryName');
      if (!name) return skip('missing category name');
      const { created } = await ensureCategory(db, type.id, name);
      return { ...base, status: created ? 'created' : 'exists' };
    }

    case 'catalog.createItem': {
      const type = await resolveType(db, data);
      if (!type) return skip('missing type (type/typeName or typeId)');
      const category = await resolveCategory(db, type.id, data);
      if (!category) return skip('missing category (category/categoryName or categoryId)');
      const name = pick(data, 'name', 'item', 'itemName');
      if (!name) return skip('missing item name');
      const { created } = await ensureItem(db, category.id, name, str(data.description) ?? null);
      return { ...base, status: created ? 'created' : 'exists' };
    }

    case 'catalog.createQuantifier': {
      const type = await resolveType(db, data);
      if (!type) return skip('missing type (type/typeName or typeId)');
      const name = pick(data, 'name', 'quantifierName');
      if (!name) return skip('missing quantifier name');
      // Resolve the item by id (valid) or by name under the type; else ensure under category.
      let itemId = await resolveItemId(db, type.id, { id: str(data.itemId), name: pick(data, 'item', 'itemName') });
      if (!itemId) {
        const category = await resolveCategory(db, type.id, data);
        const itemName = pick(data, 'item', 'itemName');
        if (!category || !itemName) return skip('missing item (item/itemName or a valid itemId, plus category)');
        itemId = (await ensureItem(db, category.id, itemName)).id;
      }
      const existing = await db.get('SELECT id FROM item_quantifiers WHERE item_id = ? AND name = ?', [
        itemId,
        name,
      ]);
      if (existing) return { ...base, status: 'exists' };
      await db.exec(
        'INSERT INTO item_quantifiers (id, item_id, name, min_value, max_value, units) VALUES (?, ?, ?, ?, ?, ?)',
        [newUuid(), itemId, name, num(data.minValue), num(data.maxValue), str(data.units) ?? null],
      );
      return { ...base, status: 'created' };
    }

    case 'catalog.createBundle': {
      const type = await resolveType(db, data);
      if (!type) return skip('missing type (type/typeName or typeId)');
      const name = pick(data, 'name', 'bundle', 'bundleName');
      if (!name) return skip('missing bundle name');

      let bundleId = await findBundleInType(db, type.id, name);
      const bundleCreated = !bundleId;
      if (!bundleId) {
        bundleId = newUuid();
        await db.exec('INSERT INTO bundles (id, type_id, name) VALUES (?, ?, ?)', [bundleId, type.id, name]);
      }

      const missing: string[] = [];
      let order = 0;
      for (const ref of itemRefsOf(data.members)) {
        const memberName = ref.name ?? ref.id ?? '?';
        const itemId = await resolveItemId(db, type.id, ref);
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
      const type = await resolveType(db, data);
      if (!type) return skip('missing type (type/typeName or typeId)');
      const iso = pick(data, 'timestampUtc', 'timestamp') ?? new Date().toISOString();
      const comment = str(data.comment) ?? null;

      const entryId = newUuid();
      await db.exec(
        'INSERT INTO log_entries (id, timestamp, type_id, comment, event_utc_offset_minutes) VALUES (?, ?, ?, ?, ?)',
        [entryId, toDbDatetime(iso), type.id, comment, captureUtcOffsetMinutes(iso)],
      );

      const missing: string[] = [];
      for (const ref of itemRefsOf(data.items)) {
        const itemId = await resolveItemId(db, type.id, ref);
        if (!itemId) {
          missing.push(ref.name ?? ref.id ?? '?');
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

    // --- Reminders (device-local; not SQL). Re-synced to notifee after the plan commits. ---

    case 'reminders.setInactivity': {
      const hours = num(data.intervalHours);
      const off = hours == null || hours <= 0;
      await setInactivity(off ? null : hours);
      return { ...base, status: 'created', detail: off ? 'nudge off' : `nudge every ${Math.round(hours!)}h` };
    }

    case 'reminders.createScheduled': {
      const timeOfDay = pick(data, 'timeOfDay', 'time');
      if (!timeOfDay) return skip('missing timeOfDay (HH:MM)');
      await addScheduled({ timeOfDay, label: str(data.label) });
      return { ...base, status: 'created', detail: normalizeTimeOfDay(timeOfDay) };
    }

    case 'reminders.updateScheduled': {
      const id = pick(data, 'id', 'reminderId');
      if (!id) return skip('missing reminder id');
      if (!(await scheduledReminderExists(id))) return skip(`reminder not found: ${id}`);
      await updateScheduled(id, {
        timeOfDay: pick(data, 'timeOfDay', 'time'),
        label: data.label !== undefined ? String(data.label) : undefined,
        enabled: typeof data.enabled === 'boolean' ? data.enabled : undefined,
      });
      return { ...base, status: 'created', detail: 'updated' };
    }

    case 'reminders.deleteScheduled': {
      const id = pick(data, 'id', 'reminderId');
      if (!id) return skip('missing reminder id');
      if (!(await scheduledReminderExists(id))) return skip(`reminder not found: ${id}`);
      await deleteScheduled(id);
      return { ...base, status: 'created', detail: 'deleted' };
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
    // Reminder actions write device-local storage (outside SQL); re-schedule notifee.
    if (actions.some((a) => a.kind.startsWith('reminders.'))) {
      await syncReminders().catch(() => {});
    }
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
