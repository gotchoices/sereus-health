import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getConfigureCatalog, type CatalogBundle, type CatalogItem, type CatalogType } from '../data/configureCatalog';
import { spacing, typography, useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';

type Tab = 'home' | 'catalog' | 'settings';
type ViewMode = 'items' | 'bundles';

const TYPES: CatalogType[] = ['Activity', 'Condition', 'Outcome'];

function accentForType(type: CatalogType, theme: ReturnType<typeof useTheme>) {
  const t = String(type).toLowerCase();
  if (t === 'activity') return theme.accentActivity;
  if (t === 'condition') return theme.accentCondition;
  if (t === 'outcome') return theme.accentOutcome;
  return theme.accentPrimary;
}

export default function ConfigureCatalog(props: {
  onNavigateTab: (tab: Tab) => void;
  activeTab: Tab;
  onAddItem?: (type: CatalogType) => void;
  onAddBundle?: (type: CatalogType) => void;
  onEditItem?: (itemId: string) => void;
  onEditBundle?: (bundleId: string) => void;
}) {
  const theme = useTheme();
  const t = useT();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterText, setFilterText] = useState('');

  const [catalogType, setCatalogType] = useState<CatalogType>('Activity');
  const [viewMode, setViewMode] = useState<ViewMode>('items');

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [bundles, setBundles] = useState<CatalogBundle[]>([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    getConfigureCatalog()
      .then((data) => {
        if (!alive) return;
        setItems(data.items ?? []);
        setBundles(data.bundles ?? []);
      })
      .catch(() => {
        if (!alive) return;
        setError(t('configureCatalog.errorLoading'));
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [t]);

  const typedItems = useMemo(() => items.filter((it) => it.type === catalogType), [catalogType, items]);
  const typedBundles = useMemo(() => bundles.filter((b) => b.type === catalogType), [bundles, catalogType]);

  const filteredItems = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return typedItems;
    return typedItems.filter((it) => it.name.toLowerCase().includes(q) || it.category.toLowerCase().includes(q));
  }, [filterText, typedItems]);

  const filteredBundles = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return typedBundles;
    return typedBundles.filter((b) => b.name.toLowerCase().includes(q));
  }, [filterText, typedBundles]);

  const onPressAdd = () => {
    if (viewMode === 'items') {
      if (props.onAddItem) return props.onAddItem(catalogType);
      Alert.alert(t('common.notImplementedTitle'), t('common.notImplementedBody'));
      return;
    }
    if (props.onAddBundle) return props.onAddBundle(catalogType);
    Alert.alert(t('common.notImplementedTitle'), t('common.notImplementedBody'));
  };

  const activeAccent = accentForType(catalogType, theme);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('configureCatalog.title')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setFilterVisible((v) => !v)} style={styles.headerIcon} hitSlop={HIT_SLOP}>
            <Ionicons name="search-outline" size={22} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onPressAdd} style={styles.headerIcon} hitSlop={HIT_SLOP}>
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
            placeholder={t('configureCatalog.filterPlaceholder')}
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

      {/* Type selector */}
      <View style={[styles.typeRow, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        {TYPES.map((ty) => {
          const selected = ty === catalogType;
          return (
            <TouchableOpacity
              key={ty}
              onPress={() => setCatalogType(ty)}
              style={[
                styles.typeChip,
                {
                  borderColor: selected ? activeAccent : theme.border,
                  backgroundColor: selected ? activeAccent : 'transparent',
                },
              ]}
            >
              <Text style={{ color: selected ? '#fff' : theme.textPrimary, fontWeight: '600' }}>{String(ty)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* View toggle */}
      <View style={[styles.viewToggle, { borderBottomColor: theme.border, backgroundColor: theme.surface }]}>
        <TouchableOpacity
          onPress={() => setViewMode('items')}
          style={[
            styles.viewTab,
            {
              borderBottomColor: viewMode === 'items' ? theme.accentPrimary : 'transparent',
            },
          ]}
        >
          <Text style={{ color: viewMode === 'items' ? theme.accentPrimary : theme.textSecondary, fontWeight: '600' }}>
            {t('configureCatalog.items')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewMode('bundles')}
          style={[
            styles.viewTab,
            {
              borderBottomColor: viewMode === 'bundles' ? theme.accentPrimary : 'transparent',
            },
          ]}
        >
          <Text style={{ color: viewMode === 'bundles' ? theme.accentPrimary : theme.textSecondary, fontWeight: '600' }}>
            {t('configureCatalog.bundles')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.center}>
          <Text style={{ color: theme.textSecondary }}>{t('common.loading')}</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: theme.textSecondary }}>{error}</Text>
        </View>
      ) : viewMode === 'items' ? (
        filteredItems.length === 0 ? (
          <View style={styles.center}>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>{t('configureCatalog.emptyItemsTitle')}</Text>
            <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>{t('configureCatalog.emptyItemsBody')}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(it) => it.id}
            contentContainerStyle={{ padding: spacing[3] }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
                activeOpacity={0.85}
                onPress={() => {
                  if (props.onEditItem) return props.onEditItem(item.id);
                  Alert.alert(t('common.notImplementedTitle'), t('common.notImplementedBody'));
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.textPrimary, ...typography.body, fontWeight: '600' }}>{item.name}</Text>
                  <Text style={{ color: theme.textSecondary, ...typography.small }}>{item.category}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          />
        )
      ) : filteredBundles.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>{t('configureCatalog.emptyBundlesTitle')}</Text>
          <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>{t('configureCatalog.emptyBundlesBody')}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBundles}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: spacing[3] }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
              activeOpacity={0.85}
              onPress={() => {
                if (props.onEditBundle) return props.onEditBundle(item.id);
                Alert.alert(t('common.notImplementedTitle'), t('common.notImplementedBody'));
              }}
            >
              <Ionicons name="layers-outline" size={18} color={theme.accentPrimary} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.textPrimary, ...typography.body, fontWeight: '600' }}>{item.name}</Text>
                <Text style={{ color: theme.textSecondary, ...typography.small }}>
                  {t('configureCatalog.bundleCount', { count: item.itemCount })}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
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
  typeRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
  },
  typeChip: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: 999,
    borderWidth: 1,
  },
  viewToggle: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  viewTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 2,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[4], gap: spacing[2] },
  emptyTitle: { ...typography.title, marginBottom: spacing[1] },
  tabBar: {
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing[2],
  },
  tab: { alignItems: 'center', gap: 4 },
  tabLabel: { ...typography.small },
});


