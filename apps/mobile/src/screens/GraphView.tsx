import React from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { formatDateRange, type Graph } from '../data/graphs';
import { spacing, typography, useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';

const ITEM_COLORS = [
  '#4C9AFF',
  '#36B37E',
  '#FF5630',
  '#FFAB00',
  '#6554C0',
  '#00B8D9',
  '#FF8B00',
  '#8993A4',
];

export default function GraphView(props: { graph: Graph; onBack: () => void }) {
  const theme = useTheme();
  const t = useT();

  const handleShare = async () => {
    try {
      const itemNames = props.graph.items.map((i) => i.name).join(', ');
      const dateRange = formatDateRange(props.graph.dateRange.start, props.graph.dateRange.end);
      const message = `${props.graph.name}\n\nItems: ${itemNames}\nDate Range: ${dateRange}\n\n(${t('graphView.chartPending')})`;
      await Share.share({ message, title: props.graph.name });
    } catch {
      Alert.alert(t('common.error'), t('graphView.shareError'));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={props.onBack} style={styles.headerIcon} hitSlop={HIT_SLOP}>
          <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
          {props.graph.name}
        </Text>
        <TouchableOpacity onPress={handleShare} style={styles.headerIcon} hitSlop={HIT_SLOP}>
          <Ionicons name="share-outline" size={22} color={theme.accentPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing[3], gap: spacing[3] }}>
        <View style={[styles.graphBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="stats-chart" size={64} color={theme.textSecondary} />
          <Text style={[styles.boxTitle, { color: theme.textPrimary }]}>{t('graphView.visualization')}</Text>
          <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>{t('graphView.chartPending')}</Text>
          <Text style={{ color: theme.textSecondary, marginTop: spacing[2] }}>
            {t('graphView.dateRange')}: {formatDateRange(props.graph.dateRange.start, props.graph.dateRange.end)}
          </Text>
        </View>

        <View style={[styles.legend, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.legendTitle, { color: theme.textPrimary }]}>{t('graphView.legend')}</Text>
          {props.graph.items.map((it, idx) => (
            <View key={it.id} style={styles.legendRow}>
              <View style={[styles.swatch, { backgroundColor: ITEM_COLORS[idx % ITEM_COLORS.length] }]} />
              <Text style={{ color: theme.textPrimary, flex: 1 }}>{it.name}</Text>
              <Text style={{ color: theme.textSecondary, ...typography.small }}>{it.category}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
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
    gap: spacing[2],
  },
  headerIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title, flex: 1 },
  graphBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing[4],
    alignItems: 'center',
    gap: spacing[2],
  },
  boxTitle: { ...typography.body, fontWeight: '700' },
  legend: { borderWidth: 1, borderRadius: 12, padding: spacing[3], gap: spacing[2] },
  legendTitle: { ...typography.body, fontWeight: '700' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  swatch: { width: 10, height: 10, borderRadius: 3 },
});


