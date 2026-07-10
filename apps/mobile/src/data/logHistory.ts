import { USE_QUEREUS } from '../db/config';
import { ensureDatabaseInitialized } from '../db/init';
import { getAllLogEntries, getLogEntriesPage, type LogEntry as DbLogEntry, type LogCursor } from '../db/logEntries';
import { getVariant } from '../mock';

// ─────────────────────────────────────────────────────────────────────────────
// History fetch page size — how many entries the Home list loads per batch as
// you scroll (infinite scroll). Tweak here. Larger = fewer fetches but slower
// each; smaller = snappier fetches, more of them. ~30 fills a few screens.
export const HISTORY_PAGE_SIZE = 30;
// ─────────────────────────────────────────────────────────────────────────────

export type { LogCursor } from '../db/logEntries';

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'Activity' | 'Condition' | 'Outcome' | string;
  items: string[];
  bundles?: string[];
  comment?: string;
}

/** Map a DB log entry to the flat shape the History list renders. */
function toDataEntry(e: DbLogEntry): LogEntry {
  const bundleNames = new Set<string>();
  for (const it of e.items) if (it.sourceBundleName) bundleNames.add(it.sourceBundleName);
  return {
    id: e.id,
    timestamp: e.timestamp,
    type: e.typeName,
    items: e.items.map((it) => it.name),
    bundles: bundleNames.size ? Array.from(bundleNames) : undefined,
    comment: e.comment ?? undefined,
  };
}

type MockItem = { id: string; name: string; category: string };
type MockBundle = { id: string; name: string };
type MockEntry = {
  id: string;
  timestamp: string;
  type: string;
  items: MockItem[];
  bundles: MockBundle[];
  quantifiers: Array<{ itemId: string; name: string; value: number; units: string }>;
  comment: string | null;
};

type MockData = { entries: MockEntry[] };

function loadMock(variant: string): MockData {
  // Require avoids TS json-module config differences.
  switch (variant) {
    case 'empty':
      return require('../../mock/data/log-history.empty.json') as MockData;
    case 'error':
      return require('../../mock/data/log-history.error.json') as MockData;
    case 'happy':
    default:
      return require('../../mock/data/log-history.happy.json') as MockData;
  }
}

export async function getLogHistory(): Promise<LogEntry[]> {
  if (!USE_QUEREUS) {
    const variant = getVariant();
    if (variant === 'error') {
      throw new Error('mock:error');
    }
    const raw = loadMock(variant).entries ?? [];

    return raw.map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      type: e.type,
      items: (e.items ?? []).map((it) => it.name),
      bundles: (e.bundles ?? []).length ? e.bundles.map((b) => b.name) : undefined,
      comment: e.comment ?? undefined,
    }));
  }

  await ensureDatabaseInitialized();
  return (await getAllLogEntries()).map(toDataEntry);
}

/**
 * One page of history, newest first, for infinite scroll. `cursor` is the opaque
 * `nextCursor` from the previous page (null = first page). `nextCursor` is null
 * when there are no more entries.
 */
export async function getLogHistoryPage(
  cursor: LogCursor | null = null,
  limit: number = HISTORY_PAGE_SIZE,
): Promise<{ entries: LogEntry[]; nextCursor: LogCursor | null }> {
  if (!USE_QUEREUS) {
    // Mock has no real pagination: first page returns everything, then it's done.
    if (cursor) return { entries: [], nextCursor: null };
    return { entries: await getLogHistory(), nextCursor: null };
  }
  await ensureDatabaseInitialized();
  const { entries, nextCursor } = await getLogEntriesPage(cursor, limit);
  return { entries: entries.map(toDataEntry), nextCursor };
}


