/**
 * GraphView Screen
 * 
 * Display a generated graph showing selected items over time.
 * MVP: Placeholder implementation until charting library is selected.
 * 
 * @see design/generated/screens/GraphView.md
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme, typography, spacing } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import { formatDateRange, type Graph } from '../data/graphs';

interface GraphViewProps {
  graph: Graph;
  onBack: () => void;
}

// Color palette for graph items
const ITEM_COLORS = [
  '#4C9AFF', // Blue
  '#36B37E', // Green
  '#FF5630', // Red
  '#FFAB00', // Yellow
  '#6554C0', // Purple
  '#00B8D9', // Cyan
  '#FF8B00', // Orange
  '#8993A4', // Gray
];

export default function GraphView({ graph, onBack }: GraphViewProps) {
  const theme = useTheme();
  const t = useT();
  
  const handleShare = async () => {
    try {
      const itemNames = graph.items.map(i => i.name).join(', ');
      const dateRange = formatDateRange(graph.dateRange.start, graph.dateRange.end);
      
      const message = `${graph.name}\n\nItems: ${itemNames}\nDate Range: ${dateRange}\n\n(Graph image would be attached when charting library is implemented)`;
      
      await Share.share({
        message,
        title: graph.name,
      });
    } catch (error) {
      Alert.alert(t('common.error'), t('graphView.shareError'));
    }
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
          {graph.name}
        </Text>
        <TouchableOpacity
          onPress={handleShare}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={styles.shareButton}
        >
          <Ionicons name="share-outline" size={24} color={theme.accentPrimary} />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Graph Placeholder */}
        <View style={[styles.graphContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.graphPlaceholder}>
            <Ionicons name="stats-chart" size={64} color={theme.textSecondary} />
            <Text style={[styles.placeholderTitle, { color: theme.textPrimary }]}>
              Graph Visualization
            </Text>
            <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
              Chart library integration pending.{'\n'}
              Share button will export graph as image.
            </Text>
          </View>
          
          {/* Simulated axis labels */}
          <View style={styles.axisLabels}>
            <Text style={[styles.axisLabel, { color: theme.textSecondary }]}>
              {formatDateRange(graph.dateRange.start, graph.dateRange.end)}
            </Text>
          </View>
        </View>
        
        {/* Legend */}
        <View style={[styles.legendContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.legendTitle, { color: theme.textPrimary }]}>
            Legend
          </Text>
          {graph.items.map((item, index) => (
            <View key={item.id} style={styles.legendItem}>
              <View 
                style={[
                  styles.legendColor, 
                  { backgroundColor: ITEM_COLORS[index % ITEM_COLORS.length] }
                ]} 
              />
              <Text style={[styles.legendText, { color: theme.textPrimary }]}>
                {item.name}
              </Text>
              <Text style={[styles.legendCategory, { color: theme.textSecondary }]}>
                {item.category}
              </Text>
            </View>
          ))}
        </View>
        
        {/* Graph Info */}
        <View style={[styles.infoContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
              Created
            </Text>
            <Text style={[styles.infoValue, { color: theme.textPrimary }]}>
              {new Date(graph.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
              Items
            </Text>
            <Text style={[styles.infoValue, { color: theme.textPrimary }]}>
              {graph.items.length}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
              Date Range
            </Text>
            <Text style={[styles.infoValue, { color: theme.textPrimary }]}>
              {formatDateRange(graph.dateRange.start, graph.dateRange.end)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacing[1],
  },
  title: {
    ...typography.title,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing[2],
  },
  shareButton: {
    padding: spacing[1],
  },
  content: {
    flex: 1,
    padding: spacing[3],
  },
  graphContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing[3],
  },
  graphPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[5] * 2,
    paddingHorizontal: spacing[4],
  },
  placeholderTitle: {
    ...typography.title,
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  placeholderText: {
    ...typography.body,
    textAlign: 'center',
  },
  axisLabels: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  axisLabel: {
    ...typography.small,
  },
  legendContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing[3],
    marginBottom: spacing[3],
  },
  legendTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing[2],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[1],
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: spacing[2],
  },
  legendText: {
    ...typography.body,
    flex: 1,
  },
  legendCategory: {
    ...typography.small,
  },
  infoContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing[3],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[1],
  },
  infoLabel: {
    ...typography.body,
  },
  infoValue: {
    ...typography.body,
    fontWeight: '500',
  },
});

