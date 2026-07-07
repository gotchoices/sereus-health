import { getVariant } from '../mock';
import { USE_QUEREUS } from '../db/config';
import { ensureDatabaseInitialized } from '../db/init';
import { upsertBundle } from '../db/catalog';
import { getConfigureCatalog, type CatalogType } from './configureCatalog';

export type BundleMemberEdit = {
  itemId: string;
  itemName: string;
  categoryName: string;
  displayOrder: number;
};

export type BundleEdit = {
  id?: string;
  name: string;
  type: CatalogType;
  items: BundleMemberEdit[];
};

export type AvailableItem = {
  id: string;
  name: string;
  category: string;
  type: CatalogType;
};

export async function getEditBundle(params: { bundleId?: string; type?: CatalogType }): Promise<{
  bundle: BundleEdit;
  availableItems: AvailableItem[];
}> {
  const variant = getVariant();
  if (variant === 'error') {
    throw new Error('mock:error');
  }

  const catalog = await getConfigureCatalog();
  const editing = Boolean(params.bundleId);
  const existing = params.bundleId ? catalog.bundles.find((b) => b.id === params.bundleId) : undefined;

  const type: CatalogType = editing ? (existing?.type ?? params.type ?? 'Activity') : (params.type ?? 'Activity');
  const availableItems: AvailableItem[] = catalog.items
    .filter((it) => it.type === type)
    .map((it) => ({ id: it.id, name: it.name, category: it.category, type: it.type }));

  const itemsById = new Map(availableItems.map((it) => [it.id, it]));

  const members: BundleMemberEdit[] = (existing?.itemIds ?? [])
    .map((itemId, idx) => {
      const it = itemsById.get(itemId);
      return {
        itemId,
        itemName: it?.name ?? itemId,
        categoryName: it?.category ?? '',
        displayOrder: idx,
      };
    })
    .filter(Boolean);

  const bundle: BundleEdit = editing
    ? {
        id: existing?.id ?? params.bundleId,
        name: existing?.name ?? '',
        type,
        items: members,
      }
    : {
        name: '',
        type,
        items: [],
      };

  return { bundle, availableItems };
}

export async function saveBundle(bundle: BundleEdit): Promise<{ success: true; id: string }> {
  if (!USE_QUEREUS) {
    return { success: true, id: bundle.id ?? `bundle-mock-${Date.now()}` };
  }
  await ensureDatabaseInitialized();
  const id = await upsertBundle({
    id: bundle.id,
    name: bundle.name.trim(),
    typeName: String(bundle.type),
    members: bundle.items
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((m, idx) => ({ itemId: m.itemId, displayOrder: idx })),
  });
  return { success: true, id };
}


