/**
 * Graphs Screen
 * 
 * Browse and manage Bob's collection of saved/named graphs.
 * Graphs are ephemeral - they exist while the app is running.
 * 
 * @see design/generated/screens/Graphs.md
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme, typography, spacing } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import { getGraphs, formatDateRange, type Graph } from '../data/graphs';

interface GraphsProps {
  onBack: () => void;
  onCreateGraph?: () => void;
  onViewGraph?: (graphId: string) => void;
  onCloseGraph?: (graphId: string) => void;
  graphs?: Graph[];  // Managed by parent (App.tsx) for ephemeral storage
}

export default function Graphs({ 
  onBack, 
  onCreateGraph,
  onViewGraph,
  onCloseGraph,
  graphs: propsGraphs,
}: GraphsProps) {
  const theme = useTheme();
  const t = useT();
  const [localGraphs, setLocalGraphs] = useState<Graph[]>([]);
  
  // Use props graphs if provided, otherwise load from mock
  const graphs = propsGraphs ?? localGraphs;
  
  // Load initial graphs from mock data only if not managed by parent
  useEffect(() => {
    if (!propsGraphs) {
      const initialGraphs = getGraphs();
      setLocalGraphs(initialGraphs);
    }
  }, [propsGraphs]);
  
  const handleCloseGraph = (graphId: string) => {
    if (onCloseGraph) {
      onCloseGraph(graphId);
    } else {
      setLocalGraphs(prev => prev.filter(g => g.id !== graphId));
    }
  };
  
  const handleViewGraph = (graphId: string) => {
    if (onViewGraph) {
      onViewGraph(graphId);
    }
  };
  
  const handleCreateGraph = () => {
    if (onCreateGraph) {
      onCreateGraph();
    }
  };
  
  const renderGraphCard = ({ item: graph }: { item: Graph }) => {
    const itemNames = graph.items.slice(0, 3).map(i => i.name).join(', ');
    const moreCount = graph.items.length > 3 ? graph.items.length - 3 : 0;
    
    return (
      <TouchableOpacity
        style={[styles.graphCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => handleViewGraph(graph.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          {/* Graph icon */}
          <View style={[styles.graphIcon, { backgroundColor: theme.accentPrimary + '20' }]}>
            <Ionicons name="stats-chart" size={24} color={theme.accentPrimary} />
          </View>
          
          {/* Graph info */}
          <View style={styles.cardInfo}>
            <Text style={[styles.graphName, { color: theme.textPrimary }]} numberOfLines={1}>
              {graph.name}
            </Text>
            <Text style={[styles.graphItems, { color: theme.textSecondary }]} numberOfLines={1}>
              {itemNames}{moreCount > 0 ? ` +${moreCount}` : ''}
            </Text>
            <Text style={[styles.graphDate, { color: theme.textSecondary }]}>
              {formatDateRange(graph.dateRange.start, graph.dateRange.end)}
            </Text>
          </View>
          
          {/* Close button */}
          <TouchableOpacity
            onPress={() => handleCloseGraph(graph.id)}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            style={styles.closeButton}
          >
            <Ionicons name="close-circle" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="stats-chart-outline" size={64} color={theme.textSecondary} />
      <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
        {t('graphs.emptyTitle')}
      </Text>
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
        {t('graphs.emptyMessage')}
      </Text>
      
      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: theme.accentPrimary }]}
        onPress={handleCreateGraph}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.createButtonText}>{t('graphs.createGraph')}</Text>
      </TouchableOpacity>
    </View>
  );
  
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
        <Text style={[styles.title, { color: theme.textPrimary }]}>
          {t('graphs.title')}
        </Text>
        <TouchableOpacity
          style={styles.headerAction}
          onPress={handleCreateGraph}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons name="add-circle" size={28} color={theme.accentPrimary} />
        </TouchableOpacity>
      </View>
      
      {/* Content */}
      {graphs.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyScrollContent}>
          {renderEmptyState()}
        </ScrollView>
      ) : (
        <FlatList
          data={graphs}
          keyExtractor={(item) => item.id}
          renderItem={renderGraphCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    paddingHorizontal: spacing[3],  // 16
    paddingVertical: spacing[2],    // 8
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacing[1],  // 4
  },
  title: {
    ...typography.title,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerAction: {
    padding: spacing[1],  // 4
  },
  listContent: {
    padding: spacing[3],  // 16
  },
  graphCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing[3],  // 16
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],  // 16
  },
  graphIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: spacing[3],  // 16
    marginRight: spacing[2],  // 8
  },
  graphName: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing[0],  // 4
  },
  graphItems: {
    ...typography.small,
    marginBottom: spacing[0],  // 4
  },
  graphDate: {
    ...typography.small,
  },
  closeButton: {
    padding: spacing[1],  // 4
  },
  emptyScrollContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],  // 20
    paddingVertical: spacing[5],    // 24
  },
  emptyTitle: {
    ...typography.title,
    marginTop: spacing[3],  // 16
    marginBottom: spacing[2],  // 8
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing[4],  // 20
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],  // 20
    paddingVertical: spacing[2],    // 8
    borderRadius: 24,
    gap: spacing[1],  // 4
  },
  createButtonText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '600',
  },
});
