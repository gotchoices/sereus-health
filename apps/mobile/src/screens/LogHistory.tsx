import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getLogHistory, type LogEntry } from '../data/logHistory';
import { spacing, typography, useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';

type Tab = 'home' | 'catalog' | 'settings';

export default function LogHistory(props: {
  onAddNew: () => void;
  onClone: (entryId: string) => void;
  onEdit: (entryId: string) => void;
  onOpenGraphs: () => void;
  onNavigateTab: (tab: Tab) => void;
  activeTab: Tab;
}) {
  const theme = useTheme();
  const t = useT();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getLogHistory()
      .then((data) => {
        if (!alive) return;
        setEntries(data);
        setError(null);
      })
      .catch((err) => {
        if (!alive) return;
        // Keep UI error message user-friendly, but log the underlying cause for debugging.
        // eslint-disable-next-line no-console
        console.error('[LogHistory] Failed to load history', err);
        setError(t('logHistory.errorLoading'));
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [t]);

  const filtered = useMemo(() => {
    // Global filter rule: when filter UI is hidden, retain the text but do not filter the list.
    const q = (filterVisible ? filterText : '').trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      if (e.type.toLowerCase().includes(q)) return true;
      if (e.timestamp.toLowerCase().includes(q)) return true;
      if (e.comment?.toLowerCase().includes(q)) return true;
      if (e.items.some((it) => it.toLowerCase().includes(q))) return true;
      if (e.bundles?.some((b) => b.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [entries, filterText, filterVisible]);

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const badgeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t === 'activity') return theme.accentActivity;
    if (t === 'condition') return theme.accentCondition;
    if (t === 'outcome') return theme.accentOutcome;
    return theme.accentPrimary;
  };

  const renderEntry = ({ item }: { item: LogEntry }) => {
    const allNames = [...(item.bundles ?? []), ...(item.items ?? [])];
    const shown = allNames.slice(0, 3);
    const remaining = Math.max(0, allNames.length - shown.length);
    const itemsLine =
      shown.join(', ') + (remaining > 0 ? `, ${t('logHistory.itemsMore', { count: remaining })}` : '');

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
        activeOpacity={0.8}
        onPress={() => props.onEdit(item.id)}
      >
        {/* Line 1 */}
        <View style={styles.row1}>
          <View style={[styles.badge, { backgroundColor: badgeColor(item.type) }]}>
            <Text style={styles.badgeText}>{item.type}</Text>
          </View>
          <Text style={[styles.timestamp, { color: theme.textSecondary }]} numberOfLines={1}>
            {formatTimestamp(item.timestamp)}
          </Text>

          <TouchableOpacity
            style={styles.cloneButton}
            onPress={() => props.onClone(item.id)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="copy-outline" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Line 2 */}
        <Text style={[styles.items, { color: theme.textPrimary }]} numberOfLines={1}>
          {itemsLine}
        </Text>

        {/* Line 3 (optional) */}
        {item.comment ? (
          <Text style={[styles.comment, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.comment}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <Image source={require('../assets/logo.png')} style={styles.logo} />
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('app.title')}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={props.onOpenGraphs} style={styles.headerIcon}>
            <Ionicons name="stats-chart-outline" size={22} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilterVisible((v) => !v)} style={styles.headerIcon}>
            <Ionicons name="search-outline" size={22} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={props.onAddNew} style={styles.headerIcon}>
            <Ionicons name="add-circle" size={28} color={theme.accentPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {filterVisible ? (
        <View style={[styles.filterBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <Ionicons name="search-outline" size={18} color={theme.textSecondary} />
          <TextInput
            value={filterText}
            onChangeText={setFilterText}
            placeholder={t('logHistory.filterPlaceholder')}
            placeholderTextColor={theme.textSecondary}
            style={[styles.filterInput, { color: theme.textPrimary }]}
          />
          {filterText ? (
            <TouchableOpacity onPress={() => setFilterText('')}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <Text style={{ color: theme.textSecondary }}>Loading…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: theme.textSecondary }}>{error}</Text>
          <TouchableOpacity onPress={() => setFilterVisible(false)} style={styles.retry}>
            <Text style={{ color: theme.accentPrimary }}>{t('logHistory.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>{t('logHistory.emptyTitle')}</Text>
          <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>{t('logHistory.emptyMessage')}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(e) => e.id}
          renderItem={renderEntry}
          contentContainerStyle={{ padding: spacing[2] }}
        />
      )}

      {/* Bottom tabs (minimal) */}
      <View style={[styles.tabBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TouchableOpacity style={styles.tab} onPress={() => props.onNavigateTab('home')}>
          <Ionicons
            name="home-outline"
            size={20}
            color={props.activeTab === 'home' ? theme.accentPrimary : theme.textSecondary}
          />
          <Text style={[styles.tabLabel, { color: props.activeTab === 'home' ? theme.accentPrimary : theme.textSecondary }]}>
            {t('navigation.home')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => props.onNavigateTab('catalog')}>
          <Ionicons
            name="list-outline"
            size={20}
            color={props.activeTab === 'catalog' ? theme.accentPrimary : theme.textSecondary}
          />
          <Text
            style={[styles.tabLabel, { color: props.activeTab === 'catalog' ? theme.accentPrimary : theme.textSecondary }]}
          >
            {t('navigation.catalog')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => props.onNavigateTab('settings')}>
          <Ionicons
            name="settings-outline"
            size={20}
            color={props.activeTab === 'settings' ? theme.accentPrimary : theme.textSecondary}
          />
          <Text
            style={[styles.tabLabel, { color: props.activeTab === 'settings' ? theme.accentPrimary : theme.textSecondary }]}
          >
            {t('navigation.settings')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexShrink: 1 },
  logo: { width: 24, height: 24, resizeMode: 'contain' },
  headerTitle: { ...typography.title },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  headerIcon: { paddingHorizontal: spacing[1] },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
  },
  filterInput: { flex: 1, ...typography.body, paddingVertical: 0 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12, // per spec
    marginBottom: 8,
  },
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: 4,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  timestamp: { flex: 1, ...typography.small },
  cloneButton: { paddingLeft: spacing[1] },
  items: { ...typography.body, marginBottom: 4 },
  comment: { fontStyle: 'italic', ...typography.small },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[4], gap: spacing[2] },
  emptyTitle: { ...typography.title, marginBottom: spacing[1] },
  retry: { padding: spacing[2] },
  tabBar: {
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing[2],
  },
  tab: { alignItems: 'center', gap: 4 },
  tabLabel: { ...typography.small },
});


