import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { spacing, typography, useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import { usePendingChanges } from '../sync/usePendingChanges';
import type { PendingChange } from '../sync/pendingChanges';

/** A save still being written is not "waiting to sync" until it has taken this long. */
const SLOW_SAVE_MS = 3000;

function counts(changes: readonly PendingChange[], now: number): { waiting: number; failed: number } {
  let waiting = 0;
  let failed = 0;
  for (const c of changes) {
    if (c.state === 'failed') failed += 1;
    else if (c.state === 'local' || (c.state === 'saving' && now - c.queuedAt >= SLOW_SAVE_MS)) waiting += 1;
  }
  return { waiting, failed };
}

/**
 * The app-wide sync status line (global/async-activity.md → Sync status): one quiet line while
 * anything is unsynced or not saved, nothing otherwise. A normal quick save never shows it.
 */
export default function SyncStatusLine(props: { onPress?: () => void }) {
  const theme = useTheme();
  const t = useT();
  const changes = usePendingChanges();
  const [now, setNow] = useState(() => Date.now());

  // Re-check once a still-saving change could cross the slow-save threshold.
  useEffect(() => {
    const saving = changes.filter((c) => c.state === 'saving');
    if (!saving.length) return;
    const nextDue = Math.min(...saving.map((c) => c.queuedAt + SLOW_SAVE_MS)) - Date.now();
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, nextDue) + 50);
    return () => clearTimeout(timer);
  }, [changes, now]);

  const { waiting, failed } = counts(changes, Math.max(now, Date.now()));
  if (!waiting && !failed) return null;

  const parts: string[] = [];
  if (failed) parts.push(t('sync.notSavedCount', { count: failed }));
  if (waiting) parts.push(t('sync.waitingCount', { count: waiting }));
  return (
    <TouchableOpacity
      disabled={!props.onPress}
      onPress={props.onPress}
      style={[styles.line, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
    >
      <Ionicons
        name={failed ? 'alert-circle-outline' : 'cloud-offline-outline'}
        size={14}
        color={failed ? theme.error : theme.textSecondary}
      />
      <Text style={[styles.text, { color: theme.textSecondary }]} numberOfLines={1}>
        {parts.join(' · ')}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: { ...typography.small },
});
