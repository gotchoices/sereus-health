import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { spacing, typography, useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import { track } from '../util/activity';
import { getItemsForType, type TypeItem } from '../data/editEntry';
import QuickAddItem, { type QuickAddResult } from './QuickAddItem';

/**
 * Reusable item picker for logging + bundle editing (async-activity.md, general.md
 * inline-creation). Searches all items + bundles of a Type across categories, with an
 * optional category filter and an inline "+ Create '<query>'" affordance.
 */
export default function ItemPicker(props: {
  visible: boolean;
  typeId: string;
  typeName: string;
  selectedIds: string[];
  includeBundles?: boolean; // default true
  onToggle: (row: TypeItem) => void;
  onCreated: (item: QuickAddResult) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const [rows, setRows] = useState<TypeItem[]>([]);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [quickAdd, setQuickAdd] = useState(false);

  const reload = () => {
    if (!props.typeId) return;
    track(getItemsForType(props.typeId)).then(setRows).catch(() => setRows([]));
  };

  useEffect(() => {
    if (props.visible) { setQuery(''); setCategoryFilter(null); reload(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.visible, props.typeId]);

  const categoryNames = useMemo(
    () => Array.from(new Set(rows.filter((r) => r.categoryName).map((r) => r.categoryName as string))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (props.includeBundles === false && r.isBundle) return false;
      if (categoryFilter && r.categoryName !== categoryFilter) return false;
      if (q && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, query, categoryFilter, props.includeBundles]);

  const exactExists = useMemo(
    () => rows.some((r) => r.name.trim().toLowerCase() === query.trim().toLowerCase()),
    [rows, query],
  );
  const showCreate = query.trim().length > 0 && !exactExists;

  return (
    <Modal visible={props.visible} animationType="slide" onRequestClose={props.onClose}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{t('editEntry.selectItems')}</Text>
          <TouchableOpacity onPress={props.onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={{ color: theme.accentPrimary, fontWeight: '700' }}>{t('common.done')}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.search, { borderBottomColor: theme.border }]}>
          <Ionicons name="search-outline" size={18} color={theme.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('common.search')}
            placeholderTextColor={theme.textSecondary}
            style={[styles.searchInput, { color: theme.textPrimary }]}
          />
        </View>

        {categoryNames.length > 1 ? (
          <View style={styles.filterRow}>
            <TouchableOpacity
              onPress={() => setCategoryFilter(null)}
              style={[styles.filterChip, { borderColor: theme.border, backgroundColor: !categoryFilter ? theme.accentPrimary : theme.surface }]}
            >
              <Text style={{ color: !categoryFilter ? '#fff' : theme.textSecondary, ...typography.small }}>{t('editEntry.allCategories')}</Text>
            </TouchableOpacity>
            {categoryNames.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setCategoryFilter((prev) => (prev === c ? null : c))}
                style={[styles.filterChip, { borderColor: theme.border, backgroundColor: categoryFilter === c ? theme.accentPrimary : theme.surface }]}
              >
                <Text style={{ color: categoryFilter === c ? '#fff' : theme.textSecondary, ...typography.small }}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          ListHeaderComponent={
            showCreate ? (
              <TouchableOpacity
                style={[styles.createRow, { borderBottomColor: theme.border }]}
                onPress={() => setQuickAdd(true)}
              >
                <Ionicons name="add-circle" size={20} color={theme.accentPrimary} />
                <Text style={{ color: theme.accentPrimary, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                  {t('editEntry.pickerCreate', { name: query.trim() })}
                </Text>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => {
            const checked = props.selectedIds.includes(item.id);
            return (
              <TouchableOpacity style={[styles.row, { borderBottomColor: theme.border }]} onPress={() => props.onToggle(item)}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.textPrimary }}>
                    {item.isBundle ? '📦 ' : ''}{item.name}
                  </Text>
                  {item.categoryName ? (
                    <Text style={{ color: theme.textSecondary, ...typography.small }}>{item.categoryName}</Text>
                  ) : null}
                </View>
                <Ionicons
                  name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={checked ? theme.accentPrimary : theme.border}
                />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            !showCreate ? (
              <Text style={[styles.empty, { color: theme.textSecondary }]}>{t('editEntry.pickerEmpty')}</Text>
            ) : null
          }
        />

        <QuickAddItem
          visible={quickAdd}
          typeName={props.typeName}
          initialName={query.trim()}
          onCancel={() => setQuickAdd(false)}
          onCreated={(created) => {
            setQuickAdd(false);
            setQuery('');
            reload();
            props.onCreated(created);
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[3], paddingVertical: spacing[3], borderBottomWidth: 1,
  },
  title: { ...typography.title },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderBottomWidth: 1 },
  searchInput: { flex: 1, ...typography.body, paddingVertical: 0 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], padding: spacing[2] },
  filterChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: spacing[3], paddingVertical: 6 },
  createRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[3], paddingVertical: spacing[3], borderBottomWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[3], paddingVertical: spacing[3], borderBottomWidth: 1 },
  empty: { textAlign: 'center', padding: spacing[5] },
});
