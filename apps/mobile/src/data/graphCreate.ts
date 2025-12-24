import { getVariant } from '../mock';
import { getConfigureCatalog } from './configureCatalog';

export type GraphCreateItem = { id: string; name: string; category: string };

export type DatePreset = '7d' | '30d' | '90d' | 'all';

export function computeDateRange(preset: DatePreset): { start: string; end: string } {
  const end = new Date();
  const endIso = end.toISOString().slice(0, 10);
  if (preset === 'all') return { start: '1970-01-01', end: endIso };

  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const startIso = start.toISOString().slice(0, 10);
  return { start: startIso, end: endIso };
}

export async function getGraphCreateItems(): Promise<GraphCreateItem[]> {
  const variant = getVariant();
  if (variant === 'error') {
    throw new Error('mock:error');
  }

  const catalog = await getConfigureCatalog();
  return (catalog.items ?? []).map((it) => ({
    id: it.id,
    name: it.name,
    category: it.category,
  }));
}


