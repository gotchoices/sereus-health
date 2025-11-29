/**
 * Data adapter for LogHistory screen
 * Provides typed interface to mock data and (future) real data sources
 */

// Static imports for Metro bundler (doesn't support dynamic require)
import happyData from '../../mock/data/log-history.happy.json';
import emptyData from '../../mock/data/log-history.empty.json';
import errorData from '../../mock/data/log-history.error.json';

export interface LogEntryItem {
  id: string;
  name: string;
  categoryPath: string[];
}

export interface LogEntryBundle {
  id: string;
  name: string;
}

export interface LogEntryQuantifier {
  itemId: string;
  name: string;
  value: number;
  units?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;  // ISO 8601 UTC
  type: string;       // e.g., 'Activity', 'Condition', 'Outcome'
  items: LogEntryItem[];
  bundles: LogEntryBundle[];
  quantifiers: LogEntryQuantifier[];
  comment: string | null;
}

export interface LogHistoryModel {
  entries: LogEntry[];
  error?: string;
}

const mockVariants: Record<string, any> = {
  happy: happyData,
  empty: emptyData,
  error: errorData,
};

/**
 * Load mock data for LogHistory screen
 * @param variant - One of: happy, empty, error
 */
export async function getLogHistoryMock(variant: string = 'happy'): Promise<LogHistoryModel> {
  const data = mockVariants[variant] || mockVariants.happy;
  
  if (data._error) {
    return {
      entries: [],
      error: data._error,
    };
  }
  
  return {
    entries: data.entries || [],
  };
}
