import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { computeDateRange, getGraphCreateItems, type DatePreset, type GraphCreateItem } from '../data/graphCreate';
import { generateGraphId, type Graph } from '../data/graphs';
import { spacing, typography, useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';

type Group = { category: string; items: GraphCreateItem[] };

export default function GraphCreate(props: { onBack: () => void; onGraphCreated: (graph: Graph) => void }) {
  const theme = useTheme();
  const t = useT();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [preset, setPreset] = useState<DatePreset>('30d');
  const [filter, setFilter] = useState('');
  const [items, setItems] = useState<GraphCreateItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getGraphCreateItems()
      .then((rows) => {
        if (!alive) return;
        setItems(rows);
      })
      .catch(() => {
        if (!alive) return;
        setError(t('graphCreate.errorLoading'));
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [t]);

  const selectedIds = useMemo(() => Object.entries(selected).filter(([, v]) => v).map(([id]) => id), [selected]);
  const canGenerate = useMemo(() => name.trim().length > 0 && selectedIds.length > 0, [name, selectedIds.length]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.name.toLowerCase().includes(q) || it.category.toLowerCase().includes(q));
  }, [filter, items]);

  const groups: Group[] = useMemo(() => {
    const map = new Map<string, GraphCreateItem[]>();
    for (const it of filtered) {
      const cat = it.category || 'Other';
      const xs = map.get(cat) ?? [];
      xs.push(it);
      map.set(cat, xs);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([category, xs]) => ({ category, items: xs.sort((a, b) => a.name.localeCompare(b.name)) }));
  }, [filtered]);

  const onGenerate = () => {
    const range = computeDateRange(preset);
    const chosen = items.filter((it) => selected[it.id]);
    const graph: Graph = {
      id: generateGraphId(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
      items: chosen.map((it) => ({ id: it.id, name: it.name, category: it.category })),
      dateRange: range,
    };
    props.onGraphCreated(graph);
  };

  const toggle = (id: string) => setSelected((p) => ({ ...p, [id]: !p[id] }));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={props.onBack} style={styles.headerIcon} hitSlop={HIT_SLOP}>
          <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>{t('graphCreate.title')}</Text>
        <TouchableOpacity onPress={onGenerate} disabled={!canGenerate} style={styles.headerIcon} hitSlop={HIT_SLOP}>
          <Ionicons name="play-circle" size={22} color={canGenerate ? theme.accentPrimary : theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={{ color: theme.textSecondary }}>{t('common.loading')}</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: theme.textSecondary }}>{error}</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={{ padding: spacing[3], gap: spacing[3] }}>
            <View>
              <Text style={[styles.label, { color: theme.textSecondary }]}>{t('graphCreate.name')}</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t('graphCreate.namePlaceholder')}
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]}
              />
            </View>

            <View>
              <Text style={[styles.label, { color: theme.textSecondary }]}>{t('graphCreate.filterLabel')}</Text>
              <View style={[styles.filterRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                <Ionicons name="search-outline" size={18} color={theme.textSecondary} />
                <TextInput
                  value={filter}
                  onChangeText={setFilter}
                  placeholder={t('common.search')}
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.filterInput, { color: theme.textPrimary }]}
                />
              </View>
            </View>

            <View>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                {t('graphCreate.selectItems')} ({selectedIds.length})
              </Text>
            </View>
          </View>

          <FlatList
            data={groups}
            keyExtractor={(g) => g.category}
            renderItem={({ item: g }) => (
              <View>
                <Text style={[styles.catHeader, { color: theme.textSecondary }]}>{g.category}</Text>
                {g.items.map((it) => {
                  const checked = Boolean(selected[it.id]);
                  return (
                    <TouchableOpacity
                      key={it.id}
                      style={[styles.row, { borderBottomColor: theme.border }]}
                      onPress={() => toggle(it.id)}
                    >
                      <Ionicons
                        name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                        size={20}
                        color={checked ? theme.accentPrimary : theme.border}
                      />
                      <Text style={{ color: theme.textPrimary, flex: 1 }}>{it.name}</Text>
                      <Text style={{ color: theme.textSecondary, ...typography.small }}>{it.category}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={{ color: theme.textSecondary }}>{t('graphCreate.noItems')}</Text>
              </View>
            }
          />

          <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
            <View style={{ flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap' }}>
              <PresetChip label={t('graphCreate.last7Days')} active={preset === '7d'} onPress={() => setPreset('7d')} />
              <PresetChip label={t('graphCreate.last30Days')} active={preset === '30d'} onPress={() => setPreset('30d')} />
              <PresetChip label={t('graphCreate.last90Days')} active={preset === '90d'} onPress={() => setPreset('90d')} />
              <PresetChip label={t('graphCreate.allTime')} active={preset === 'all'} onPress={() => setPreset('all')} />
            </View>

            <TouchableOpacity
              onPress={onGenerate}
              disabled={!canGenerate}
              style={[styles.generate, { backgroundColor: canGenerate ? theme.accentPrimary : theme.border }]}
            >
              <Text style={styles.generateText}>{t('graphCreate.generate')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function PresetChip(props: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={props.onPress}
      style={[
        styles.preset,
        {
          borderColor: props.active ? theme.accentPrimary : theme.border,
          backgroundColor: props.active ? theme.accentPrimary : 'transparent',
        },
      ]}
    >
      <Text style={{ color: props.active ? '#fff' : theme.textPrimary, fontWeight: '600' }}>{props.label}</Text>
    </TouchableOpacity>
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
  label: { ...typography.small, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: spacing[3], paddingVertical: spacing[2], ...typography.body },
  filterRow: { borderWidth: 1, borderRadius: 12, paddingHorizontal: spacing[3], paddingVertical: spacing[2], flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  filterInput: { flex: 1, ...typography.body, paddingVertical: 0 },
  catHeader: { paddingHorizontal: spacing[3], paddingTop: spacing[2], paddingBottom: spacing[1], ...typography.small, fontWeight: '600' },
  row: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  footer: { borderTopWidth: 1, padding: spacing[3], gap: spacing[3] },
  preset: { paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: 999, borderWidth: 1 },
  generate: { borderRadius: 12, paddingVertical: spacing[3], alignItems: 'center', justifyContent: 'center' },
  generateText: { color: '#fff', fontWeight: '700' },
});


