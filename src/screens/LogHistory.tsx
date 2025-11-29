import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { getLogHistoryMock, LogEntry } from '../data/logHistory';
import { useT } from '../i18n/useT';
import { useTheme } from '../theme/useTheme';

type Props = {
  // Navigation props will be injected by a navigator in the future.
  navigation?: any;
  onAddNew?: () => void;
  onClone?: (entryId: string) => void;
  onOpenCatalog?: () => void;
  onOpenGraphs?: () => void;
  onOpenSereus?: () => void;
};

export const LogHistory: React.FC<Props> = ({
  navigation,
  onAddNew,
  onClone,
  onOpenCatalog,
  onOpenGraphs,
  onOpenSereus,
}) => {
  const t = useT();
  const theme = useTheme();
  // For now we always use the "happy" mock variant; later this will be wired
  // to a mock/variant context and deep links per Appeus guidance.
  const entries = getLogHistoryMock('happy');
  const [filter, setFilter] = useState('');

  const filteredEntries = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) {
      return entries;
    }
    return entries.filter((entry) => {
      const haystack = `${entry.type} ${entry.title}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [entries, filter]);

  const hasEntries = filteredEntries.length > 0;

  const handleAdd = () => {
    if (onAddNew) {
      onAddNew();
    } else {
      navigation?.navigate?.('EditEntry');
    }
  };

  const handleClone = (entry: LogEntry) => {
    if (onClone) {
      onClone(entry.id);
    } else {
      navigation?.navigate?.('EditEntry', { mode: 'clone', entryId: entry.id });
    }
  };

  const renderItem = ({ item }: { item: LogEntry }) => {
    const localTime = new Date(item.timestamp).toLocaleString();
    return (
      <TouchableOpacity style={styles.row} onPress={() => handleClone(item)}>
        <View style={styles.rowHeader}>
          <Text style={styles.type}>{item.type}</Text>
          <Text style={styles.time}>{localTime}</Text>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.cloneHint}>{t('logHistory.row.cloneHint')}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          {t('logHistory.header.title')}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.textButton}
            onPress={onOpenGraphs}
            disabled={!onOpenGraphs}>
            <Text style={[styles.textButtonLabel, { color: theme.textSecondary }]}>
              {t('logHistory.header.graphs')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.textButton}
            onPress={onOpenSereus}
            disabled={!onOpenSereus}>
            <Text style={[styles.textButtonLabel, { color: theme.textSecondary }]}>
              {t('logHistory.header.sereus')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.textButton}
            onPress={onOpenCatalog}
            disabled={!onOpenCatalog}>
            <Text style={[styles.textButtonLabel, { color: theme.textSecondary }]}>
              {t('logHistory.header.catalog')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
            <Text style={styles.addButtonText}>{t('logHistory.header.add')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterRow}>
        <TextInput
          style={[styles.filterInput, { backgroundColor: theme.surface, color: theme.textPrimary }]}
          value={filter}
          onChangeText={setFilter}
          placeholder={t('logHistory.filter.placeholder')}
          placeholderTextColor={theme.textSecondary}
        />
      </View>

      {hasEntries ? (
        <FlatList
          data={filteredEntries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={[styles.separator, { borderBottomColor: theme.border }]} />}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
            {t('logHistory.empty.title')}
          </Text>
          <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
            {t('logHistory.empty.body')}
          </Text>
          <TouchableOpacity style={styles.primaryCta} onPress={handleAdd}>
            <Text style={styles.primaryCtaText}>{t('logHistory.empty.cta')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
  },
  headerActions: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  textButtonLabel: {
    fontSize: 13,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#1f6feb',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  filterRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterInput: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
  },
  row: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  type: {
    fontSize: 12,
    fontWeight: '500',
  },
  time: {
    fontSize: 12,
  },
  title: {
    fontSize: 14,
    marginBottom: 4,
  },
  cloneHint: {
    fontSize: 12,
  },
  separator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#e5e7eb',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyBody: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  primaryCta: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#1f6feb',
  },
  primaryCtaText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default LogHistory;


