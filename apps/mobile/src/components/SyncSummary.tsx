import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { spacing, typography, useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import { usePendingChanges, summarize } from '../sync/usePendingChanges';
import { dismissChange, type PendingChange } from '../sync/pendingChanges';

function describe(c: PendingChange): string {
  const p = c.preview;
  if (!p) return c.intent.kind;
  const what = [...(p.bundles ?? []), ...p.items].slice(0, 2).join(', ');
  return `${p.type}${what ? ` — ${what}` : ''}`;
}

/**
 * Sereus Connections → Sync (screens/sereus-connections.md): the detail behind the app-wide
 * status line — what is waiting, since when, and any change not saved.
 */
export default function SyncSummary(props: { hasNodes: boolean }) {
  const theme = useTheme();
  const t = useT();
  const changes = usePendingChanges();
  const { waiting, oldestQueuedAt } = summarize(changes);
  const failed = changes.filter((c) => c.state === 'failed');

  const line = (icon: string, text: string, color = theme.textSecondary, onDismiss?: () => void) => (
    <View key={text} style={styles.row}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.text, { color: theme.textPrimary }]}>{text}</Text>
      {onDismiss ? (
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={16} color={theme.textSecondary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {failed.map((c) => line('alert-circle-outline', t('sync.notSavedItem', { what: describe(c) }), theme.error, () => dismissChange(c.key)))}
      {!props.hasNodes
        ? line('phone-portrait-outline', t('sync.onlyThisDevice'))
        : waiting
          ? line('cloud-offline-outline', t('sync.waitingDetail', {
              count: waiting,
              time: new Date(oldestQueuedAt ?? Date.now()).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
            }))
          : line('cloud-done-outline', t('sync.allSynced'))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  text: { ...typography.small, flex: 1 },
});
