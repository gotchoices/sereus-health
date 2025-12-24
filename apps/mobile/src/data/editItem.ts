import { getVariant } from '../mock';
import { getConfigureCatalog, type CatalogType } from './configureCatalog';

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
  const variant = getVariant();
  if (variant === 'error') {
    throw new Error('mock:error');
  }

  const { items } = await getConfigureCatalog();

  const editing = Boolean(params.itemId);
  const existing = params.itemId ? items.find((it) => it.id === params.itemId) : undefined;

  const type: CatalogType = editing
    ? (existing?.type ?? params.type ?? 'Activity')
    : (params.type ?? 'Activity');

  const categories = uniqBy(
    items.filter((it) => it.type === type).map((it) => ({ id: it.category, name: it.category })),
    (c) => c.id
  ).sort((a, b) => a.name.localeCompare(b.name));

  const item: ItemEdit = editing
    ? {
        id: existing?.id ?? params.itemId,
        name: existing?.name ?? '',
        description: '',
        type,
        category: existing?.category ?? '',
        quantifiers: [],
      }
    : {
        name: '',
        description: '',
        type,
        category: '',
        quantifiers: [],
      };

  return { item, categories };
}

export async function saveItem(_item: ItemEdit): Promise<{ success: true; id: string }> {
  // Stub: replace with Quereus-backed persistence.
  return { success: true, id: _item.id ?? `item-${Date.now()}` };
}


