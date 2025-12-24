import { getVariant } from '../mock';

export type EditEntryMode = 'new' | 'edit' | 'clone';

export type QuantifierValue = {
  label: string;
  value: number;
  units: string;
};

export type EditEntryModel = {
  id: string;
  mode: EditEntryMode;
  type: string;
  title: string;
  timestamp: string;
  comment: string;
  quantifiers: QuantifierValue[];
};

export type StatRow = { id: string; name: string; usageCount: number };
export type ItemStatRow = StatRow & { isBundle: boolean };

export type EditEntryStats = {
  typeStats: StatRow[];
  categoryStats: Record<string, StatRow[]>;
  itemStats: Record<string, ItemStatRow[]>;
};

function loadEntryMock(variant: string): EditEntryModel {
  // Require avoids TS json-module config differences.
  switch (variant) {
    case 'error':
      return require('../../mock/data/edit-entry.error.json') as EditEntryModel;
    case 'happy':
    default:
      return require('../../mock/data/edit-entry.happy.json') as EditEntryModel;
  }
}

function loadStatsMock(variant: string): EditEntryStats {
  switch (variant) {
    case 'empty':
      return require('../../mock/data/edit-entry-stats.empty.json') as EditEntryStats;
    case 'happy':
    default:
      return require('../../mock/data/edit-entry-stats.happy.json') as EditEntryStats;
  }
}

export async function getEditEntry(mode: EditEntryMode, entryId?: string): Promise<EditEntryModel> {
  const variant = getVariant();
  if (variant === 'error') {
    throw new Error('mock:error');
  }

  if (mode === 'new') {
    return {
      id: entryId ?? 'new',
      mode,
      type: '',
      title: '',
      timestamp: new Date().toISOString(),
      comment: '',
      quantifiers: [],
    };
  }

  const base = loadEntryMock(variant);
  return {
    ...base,
    id: entryId ?? base.id,
    mode,
    timestamp: mode === 'clone' ? new Date().toISOString() : base.timestamp,
  };
}

export async function getEditEntryStats(): Promise<EditEntryStats> {
  const variant = getVariant();
  // Treat "error" as a data failure for stats too (keeps behavior consistent).
  if (variant === 'error') {
    throw new Error('mock:error');
  }
  return loadStatsMock(variant);
}

export async function getTypeStats(): Promise<StatRow[]> {
  return (await getEditEntryStats()).typeStats ?? [];
}

export async function getCategoryStats(typeId: string): Promise<StatRow[]> {
  const stats = await getEditEntryStats();
  return stats.categoryStats?.[typeId] ?? [];
}

export async function getItemStats(categoryId: string): Promise<ItemStatRow[]> {
  const stats = await getEditEntryStats();
  return stats.itemStats?.[categoryId] ?? [];
}

export async function createLogEntry(_data: unknown): Promise<{ success: true; entryId: string }> {
  // Stub: replace with Quereus-backed implementation later.
  return { success: true, entryId: `entry-${Date.now()}` };
}

export async function updateLogEntry(_entryId: string, _data: unknown): Promise<{ success: true }> {
  return { success: true };
}

export async function deleteLogEntry(_entryId: string): Promise<{ success: true }> {
  return { success: true };
}


