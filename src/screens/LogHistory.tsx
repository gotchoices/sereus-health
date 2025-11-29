import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { getLogHistoryMock, LogEntry } from '../data/logHistory';
import { useT } from '../i18n/useT';

type Props = {
  // Navigation props will be injected by the navigator in real app; kept loose for now
  navigation?: any;
};

export const LogHistory: React.FC<Props> = ({ navigation }) => {
  const t = useT();
  // For now we always use the "happy" mock variant; later this will be wired
  // to a mock/variant context and deep links per Appeus guidance.
  const entries = getLogHistoryMock('happy');
  const hasEntries = entries.length > 0;

  const handleAdd = () => {
    navigation?.navigate?.('EditEntry');
  };

  const handleClone = (entry: LogEntry) => {
    navigation?.navigate?.('EditEntry', { mode: 'clone', entryId: entry.id });
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('logHistory.header.title')}</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>{t('logHistory.header.add')}</Text>
        </TouchableOpacity>
      </View>

      {hasEntries ? (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{t('logHistory.empty.title')}</Text>
          <Text style={styles.emptyBody}>{t('logHistory.empty.body')}</Text>
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
    backgroundColor: '#0b0c10',
  },
  header: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
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
  row: {
    backgroundColor: '#111827',
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
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
  },
  time: {
    color: '#6b7280',
    fontSize: 12,
  },
  title: {
    color: '#e5e7eb',
    fontSize: 14,
    marginBottom: 4,
  },
  cloneHint: {
    color: '#4b5563',
    fontSize: 12,
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


