import { getVariant } from '../mock';
import { USE_QUEREUS } from '../db/config';
import { ensureDatabaseInitialized } from '../db/init';
import { getCategoriesForType, getItemDetail, upsertItem } from '../db/catalog';
import { getConfigureCatalog, type CatalogType } from './configureCatalog';
import { createLogger } from '../util/logger';

const logger = createLogger('EditItem:data');

export type QuantifierEdit = {
  id?: string;
  name: string;
  minValue?: number;
  maxValue?: number;
  units?: string;
};

export type ItemEdit = {
  id?: string;
  name: string;
  description?: string;
  type: CatalogType;
  category: string;
  quantifiers: QuantifierEdit[];
};

export type CategoryOption = { id: string; name: string };

function uniqBy<T>(xs: T[], key: (x: T) => string) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of xs) {
    const k = key(x);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

export async function getEditItem(params: { itemId?: string; type?: CatalogType }): Promise<{
  item: ItemEdit;
  categories: CategoryOption[];
}> {
  if (USE_QUEREUS) {
    await ensureDatabaseInitialized();
    const editing = Boolean(params.itemId);
    const type: CatalogType = params.type ?? 'Activity';

    if (editing && params.itemId) {
      const existing = await getItemDetail(params.itemId);
      if (!existing) throw new Error('not found');
      const categories = await getCategoriesForType(existing.type);
      return {
        item: {
          id: existing.id,
          name: existing.name,
          description: existing.description ?? '',
          type: existing.type,
          category: existing.category,
          quantifiers: (existing.quantifiers ?? []).map((q) => ({
            id: q.id,
            name: q.name,
            minValue: q.minValue ?? undefined,
            maxValue: q.maxValue ?? undefined,
            units: q.units ?? undefined,
          })),
        },
        categories: categories.map((c) => ({ id: c.name, name: c.name })),
      };
    }

    const categories = await getCategoriesForType(type);
    return {
      item: { name: '', description: '', type, category: '', quantifiers: [] },
      categories: categories.map((c) => ({ id: c.name, name: c.name })),
    };
  }

  const variant = getVariant();
  if (variant === 'error') {
    throw new Error('mock:error');
  }

  const { items } = await getConfigureCatalog();

  const editing = Boolean(params.itemId);
  const existing = params.itemId ? items.find((it) => it.id === params.itemId) : undefined;

  const type: CatalogType = editing ? (existing?.type ?? params.type ?? 'Activity') : (params.type ?? 'Activity');

  const categories = uniqBy(items.filter((it) => it.type === type).map((it) => ({ id: it.category, name: it.category })), (c) => c.id).sort(
    (a, b) => a.name.localeCompare(b.name)
  );

  const item: ItemEdit = editing
    ? { id: existing?.id ?? params.itemId, name: existing?.name ?? '', description: '', type, category: existing?.category ?? '', quantifiers: [] }
    : { name: '', description: '', type, category: '', quantifiers: [] };

  return { item, categories };
}

export async function saveItem(_item: ItemEdit): Promise<{ success: true; id: string }> {
  if (USE_QUEREUS) {
    await ensureDatabaseInitialized();
    const id = await upsertItem({
      id: _item.id,
      name: _item.name.trim(),
      description: _item.description ?? null,
      typeName: String(_item.type),
      categoryName: _item.category.trim(),
      quantifiers: (_item.quantifiers ?? []).map((q) => ({
        id: q.id,
        name: q.name.trim(),
        minValue: q.minValue,
        maxValue: q.maxValue,
        units: q.units,
      })),
    });
    logger.info('Saved item (Quereus)', { id, name: _item.name, type: _item.type, category: _item.category });
    return { success: true, id };
  }
  return { success: true, id: _item.id ?? `item-${Date.now()}` };
}


