import { useSyncExternalStore } from 'react';
import { getPendingChanges, subscribePendingChanges, type PendingChange } from './pendingChanges';

/** The pending log-entry changes, re-rendering on every change of state. */
export function usePendingChanges(): readonly PendingChange[] {
  return useSyncExternalStore(subscribePendingChanges, getPendingChanges);
}

/** Counts for the app-wide sync status line. */
export function summarize(changes: readonly PendingChange[]): { waiting: number; failed: number; oldestQueuedAt?: number } {
  let waiting = 0;
  let failed = 0;
  let oldest: number | undefined;
  for (const c of changes) {
    if (c.state === 'failed') failed += 1;
    else if (c.state !== 'done') {
      waiting += 1;
      oldest = oldest === undefined ? c.queuedAt : Math.min(oldest, c.queuedAt);
    }
  }
  return { waiting, failed, oldestQueuedAt: oldest };
}
