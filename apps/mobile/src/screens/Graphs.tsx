import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { formatDateRange, type Graph } from '../data/graphs';
import { spacing, typography, useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';

export default function Graphs(props: {
  onBack: () => void;
  onCreate: () => void;
  onView: (graphId: string) => void;
  onClose: (graphId: string) => void;
  graphs: Graph[];
  loading: boolean;
  error: string | null;
}) {
  const theme = useTheme();
  const t = useT();

  const onCreate = props.onCreate;

  const renderCard = ({ item }: { item: Graph }) => {
    const itemsSummary = item.items.map((x) => x.name).slice(0, 3).join(', ');
    const more = Math.max(0, item.items.length - 3);
    const range = formatDateRange(item.dateRange.start, item.dateRange.end);
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        activeOpacity={0.85}
        onPress={() => props.onView(item.id)}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={{ color: theme.textSecondary, ...typography.small }} numberOfLines={1}>
            {itemsSummary}
            {more ? `, +${more}` : ''}
          </Text>
          <Text style={{ color: theme.textSecondary, ...typography.small }}>{range}</Text>
        </View>

        <TouchableOpacity
          hitSlop={HIT_SLOP}
          onPress={() => props.onClose(item.id)}
        >
          <Ionicons name="close" size={18} color={theme.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const hasGraphs = props.graphs.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={props.onBack} style={styles.headerIcon} hitSlop={HIT_SLOP}>
          <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('graphs.title')}</Text>
        <TouchableOpacity onPress={onCreate} style={styles.headerIcon} hitSlop={HIT_SLOP}>
          <Ionicons name="add-circle" size={28} color={theme.accentPrimary} />
        </TouchableOpacity>
      </View>

      {props.loading ? (
        <View style={styles.center}>
          <Text style={{ color: theme.textSecondary }}>{t('common.loading')}</Text>
        </View>
      ) : props.error ? (
        <View style={styles.center}>
          <Text style={{ color: theme.textSecondary }}>{props.error}</Text>
        </View>
      ) : !hasGraphs ? (
        <View style={styles.center}>
          <Ionicons name="stats-chart-outline" size={56} color={theme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>{t('graphs.emptyTitle')}</Text>
          <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>{t('graphs.emptyMessage')}</Text>
          <TouchableOpacity onPress={onCreate} style={[styles.cta, { backgroundColor: theme.accentPrimary }]}>
            <Text style={styles.ctaText}>{t('graphs.create')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={props.graphs}
          keyExtractor={(g) => g.id}
          renderItem={renderCard}
          contentContainerStyle={{ padding: spacing[3] }}
        />
      )}
    </View>
  );
}

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.title },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[4], gap: spacing[2] },
  emptyTitle: { ...typography.title, marginTop: spacing[2] },
  cta: { marginTop: spacing[3], borderRadius: 12, paddingVertical: spacing[3], paddingHorizontal: spacing[4] },
  ctaText: { color: '#fff', fontWeight: '700' },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  cardTitle: { ...typography.body, fontWeight: '600' },
});


