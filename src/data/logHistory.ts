import happyJson from '../../mock/data/log-history.happy.json';
import emptyJson from '../../mock/data/log-history.empty.json';

export type LogEntry = {
  id: string;
  type: string;
  title: string;
  timestamp: string; // ISO string in UTC
};

// In a fuller implementation we would respect a mock/variant context and engine APIs.
// For now, this adapter reads from static mock JSON files under mock/data.
const happyData = happyJson as LogEntry[];
const emptyData = emptyJson as LogEntry[];

export type LogHistoryVariant = 'happy' | 'empty';

export function getLogHistoryMock(variant: LogHistoryVariant = 'happy'): LogEntry[] {
  if (variant === 'empty') {
    return emptyData;
  }
  return happyData;
}


