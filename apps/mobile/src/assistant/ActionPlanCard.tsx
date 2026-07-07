import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { spacing, typography, useTheme } from '../theme/useTheme';
import type { ActionPlan } from './actionPlan';

interface Props {
  plan: ActionPlan;
  /** Selected actionIds. */
  selected: Set<string>;
  onToggle: (actionId: string) => void;
  onDismiss: () => void;
  /** Provided once execution is wired (D3). When absent, Approve is disabled. */
  onApprove?: () => void;
  busy?: boolean;
}

export default function ActionPlanCard({ plan, selected, onToggle, onDismiss, onApprove, busy }: Props) {
  const theme = useTheme();
  const selectedCount = plan.actions.filter((a) => selected.has(a.actionId)).length;
  const canApprove = !!onApprove && selectedCount > 0 && !busy;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Ionicons name="clipboard-outline" size={18} color={theme.accentPrimary} />
        <Text style={[styles.summary, { color: theme.textPrimary }]}>{plan.summary}</Text>
      </View>

      {plan.actions.map((a) => {
        const checked = selected.has(a.actionId);
        return (
          <TouchableOpacity
            key={a.actionId}
            style={styles.actionRow}
            onPress={() => onToggle(a.actionId)}
            disabled={busy}
          >
            <Ionicons
              name={checked ? 'checkbox' : 'square-outline'}
              size={20}
              color={checked ? theme.accentPrimary : theme.textSecondary}
            />
            <View style={styles.actionText}>
              <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>{a.title}</Text>
              <Text style={[styles.actionKind, { color: theme.textSecondary }]}>{a.kind}</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      <View style={styles.footer}>
        <TouchableOpacity onPress={onDismiss} disabled={busy} style={styles.dismissBtn} hitSlop={HIT_SLOP}>
          <Text style={{ color: theme.textSecondary }}>Dismiss</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onApprove}
          disabled={!canApprove}
          style={[
            styles.approveBtn,
            { backgroundColor: canApprove ? theme.accentPrimary : theme.border },
          ]}
        >
          <Text style={{ color: canApprove ? '#fff' : theme.textSecondary, fontWeight: '600' }}>
            {onApprove ? `Approve (${selectedCount})` : 'Approve — coming soon'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing[3],
    gap: spacing[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  summary: {
    ...typography.body,
    fontWeight: '600',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    ...typography.body,
  },
  actionKind: {
    ...typography.small,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing[3],
    marginTop: spacing[1],
  },
  dismissBtn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
  },
  approveBtn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: 8,
  },
});
