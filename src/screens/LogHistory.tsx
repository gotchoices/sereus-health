import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme, typography, spacing } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import { getLogHistoryMock, LogEntry } from '../data/logHistory';

interface LogHistoryProps {
  variant?: string;
  onAddNew: () => void;
  onClone: (entryId: string) => void;
  onEdit: (entryId: string) => void;
  onOpenGraphs: () => void;
  onNavigateTab: (tab: 'home' | 'catalog' | 'settings') => void;
}

export default function LogHistory({
  variant = 'happy',
  onAddNew,
  onClone,
  onEdit,
  onOpenGraphs,
  onNavigateTab,
}: LogHistoryProps) {
  const theme = useTheme();
  const t = useT();
  
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [filterText, setFilterText] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load data
  useEffect(() => {
    setLoading(true);
    getLogHistoryMock(variant)
      .then((data) => {
        setEntries(data.entries);
        setError(data.error || null);
      })
      .catch(() => {
        setError(t('logHistory.errorLoading'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [variant, t]);
  
  // Filter entries
  const filteredEntries = useMemo(() => {
    if (!filterText.trim()) return entries;
    
    const query = filterText.toLowerCase();
    return entries.filter((entry) => {
      // Search in items
      const itemMatch = entry.items.some((item) =>
        item.name.toLowerCase().includes(query)
      );
      
      // Search in bundles
      const bundleMatch = entry.bundles.some((bundle) =>
        bundle.name.toLowerCase().includes(query)
      );
      
      // Search in comment
      const commentMatch = entry.comment?.toLowerCase().includes(query);
      
      // Search in type
      const typeMatch = entry.type.toLowerCase().includes(query);
      
      // Search in formatted date (basic)
      const dateMatch = entry.timestamp.includes(query);
      
      return itemMatch || bundleMatch || commentMatch || typeMatch || dateMatch;
    });
  }, [entries, filterText]);
  
  // Format timestamp for display
  const formatTimestamp = (isoString: string): string => {
    const date = new Date(isoString);
    // Use device locale
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };
  
  // Get type badge color
  const getTypeBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'activity':
        return theme.accentActivity;
      case 'condition':
        return theme.accentCondition;
      case 'outcome':
        return theme.accentOutcome;
      default:
        return theme.textSecondary;
    }
  };
  
  // Render entry card
  const renderEntry = ({ item }: { item: LogEntry }) => {
    // Combine items and bundles for display
    const displayItems = [
      ...item.items.map((i) => i.name),
      ...item.bundles.map((b) => b.name),
    ];
    
    const isNoteEntry = displayItems.length === 0;
    const primaryDisplay = isNoteEntry ? item.comment || t('logHistory.note') : displayItems.slice(0, 3).join(', ');
    const moreCount = displayItems.length - 3;
    
    // Get first quantifier for summary
    const firstQuantifier = item.quantifiers[0];
    
    return (
      <TouchableOpacity
        style={[styles.entryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => onEdit(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.entryHeader}>
          <Text style={[styles.entryDate, { color: theme.textSecondary }]}>
            {formatTimestamp(item.timestamp)}
          </Text>
          <View style={[styles.typeBadge, { backgroundColor: getTypeBadgeColor(item.type) }]}>
            <Text style={[styles.typeBadgeText, { color: '#ffffff' }]}>{item.type}</Text>
          </View>
        </View>
        
        <Text style={[styles.entryItems, { color: theme.textPrimary }]}>
          {primaryDisplay}
          {moreCount > 0 && (
            <Text style={{ color: theme.textSecondary }}>
              {' '}
              {t('logHistory.itemsMore', { count: moreCount })}
            </Text>
          )}
        </Text>
        
        {firstQuantifier && (
          <Text style={[styles.entryQuantifier, { color: theme.textSecondary }]}>
            {firstQuantifier.name}: {firstQuantifier.value}
            {firstQuantifier.units ? ` ${firstQuantifier.units}` : ''}
          </Text>
        )}
        
        {item.comment && (
          <Text
            style={[styles.entryComment, { color: theme.textSecondary }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.comment}
          </Text>
        )}
        
        <TouchableOpacity
          style={styles.cloneButton}
          onPress={(e) => {
            e.stopPropagation();
            onClone(item.id);
          }}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <Ionicons name="copy-outline" size={20} color={theme.accentPrimary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };
  
  // Empty state
  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {t('common.loading')}
          </Text>
        </View>
      );
    }
    
    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
            {t('common.error')}
          </Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.accentPrimary }]}
            onPress={() => {
              setError(null);
              setLoading(true);
              getLogHistoryMock(variant).then((data) => {
                setEntries(data.entries);
                setError(data.error || null);
                setLoading(false);
              });
            }}
          >
            <Text style={[styles.retryButtonText, { color: '#ffffff' }]}>
              {t('common.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    if (filterText && filteredEntries.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={48} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {t('selectionList.emptyFiltered')}
          </Text>
        </View>
      );
    }
    
    // First-run empty state
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={64} color={theme.textSecondary} />
        <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
          {t('logHistory.emptyTitle')}
        </Text>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          {t('logHistory.emptyMessage')}
        </Text>
      </View>
    );
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.background === '#000000' ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.appTitle, { color: theme.textPrimary }]}>{t('app.title')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setFilterVisible(!filterVisible)}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            style={styles.headerButton}
          >
            <Ionicons name="search" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onOpenGraphs}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            style={styles.headerButton}
          >
            <Ionicons name="stats-chart" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onAddNew}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            style={styles.headerButton}
          >
            <Ionicons name="add-circle" size={28} color={theme.accentPrimary} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Filter Bar */}
      {filterVisible && (
        <View style={[styles.filterBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.filterIcon} />
          <TextInput
            style={[styles.filterInput, { color: theme.textPrimary }]}
            placeholder={t('logHistory.filter')}
            placeholderTextColor={theme.textSecondary}
            value={filterText}
            onChangeText={setFilterText}
            autoFocus
          />
          {filterText.length > 0 && (
            <TouchableOpacity onPress={() => setFilterText('')} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {/* Entry List */}
      <FlatList
        data={filteredEntries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
      />
      
      {/* Bottom Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => onNavigateTab('home')}
          activeOpacity={0.7}
        >
          <Ionicons name="home" size={24} color={theme.accentPrimary} />
          <Text style={[styles.tabLabel, { color: theme.accentPrimary }]}>
            {t('navigation.home')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.tab}
          onPress={() => onNavigateTab('catalog')}
          activeOpacity={0.7}
        >
          <Ionicons name="list" size={24} color={theme.textSecondary} />
          <Text style={[styles.tabLabel, { color: theme.textSecondary }]}>
            {t('navigation.catalog')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.tab}
          onPress={() => onNavigateTab('settings')}
          activeOpacity={0.7}
        >
          <Ionicons name="settings" size={24} color={theme.textSecondary} />
          <Text style={[styles.tabLabel, { color: theme.textSecondary }]}>
            {t('navigation.settings')}
          </Text>
        </TouchableOpacity>
      </View>
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
  appTitle: {
    ...typography.title,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],  // 16
  },
  headerButton: {
    padding: spacing[1],  // 8
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],  // 16
    paddingVertical: spacing[2],    // 8
    borderBottomWidth: 1,
  },
  filterIcon: {
    marginRight: spacing[2],  // 8
  },
  filterInput: {
    flex: 1,
    ...typography.body,
    paddingVertical: spacing[1],  // 8
  },
  listContent: {
    padding: spacing[3],  // 16
    flexGrow: 1,
  },
  entryCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing[3],  // 16
    marginBottom: spacing[2],  // 8
    position: 'relative',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],  // 8
  },
  entryDate: {
    ...typography.body,
    fontSize: 14,
  },
  typeBadge: {
    paddingHorizontal: spacing[2],  // 8
    paddingVertical: spacing[0],    // 4
    borderRadius: 12,
  },
  typeBadgeText: {
    ...typography.small,
    fontWeight: '600',
  },
  entryItems: {
    ...typography.body,
    marginBottom: spacing[1],  // 8
  },
  entryQuantifier: {
    ...typography.small,
    marginTop: spacing[1],  // 8
  },
  entryComment: {
    ...typography.small,
    fontStyle: 'italic',
    marginTop: spacing[1],  // 8
  },
  cloneButton: {
    position: 'absolute',
    top: spacing[3],   // 16
    right: spacing[3],  // 16
    padding: spacing[1],  // 8
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
    marginTop: spacing[2],  // 8
  },
  retryButton: {
    marginTop: spacing[3],  // 16
    paddingHorizontal: spacing[4],  // 20
    paddingVertical: spacing[2],    // 8
    borderRadius: 8,
  },
  retryButtonText: {
    ...typography.body,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: spacing[2],  // 8
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[1],  // 8
  },
  tabLabel: {
    ...typography.small,
    marginTop: spacing[0],  // 4
  },
});
