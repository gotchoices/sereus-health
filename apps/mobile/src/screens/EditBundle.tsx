import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { spacing, typography, useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import { getEditBundle, saveBundle, type AvailableItem, type BundleEdit } from '../data/editBundle';
import type { CatalogType } from '../data/configureCatalog';

const TYPES: CatalogType[] = ['Activity', 'Condition', 'Outcome'];

export default function EditBundle(props: { bundleId?: string; type?: CatalogType; onBack: () => void }) {
  const theme = useTheme();
  const t = useT();

  const editing = Boolean(props.bundleId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bundle, setBundle] = useState<BundleEdit>({ name: '', type: props.type ?? 'Activity', items: [] });
  const [available, setAvailable] = useState<AvailableItem[]>([]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerFilter, setPickerFilter] = useState('');
  const [pending, setPending] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getEditBundle({ bundleId: props.bundleId, type: props.type })
      .then((res) => {
        if (!alive) return;
        setBundle(res.bundle);
        setAvailable(res.availableItems);
      })
      .catch(() => {
        if (!alive) return;
        setError(t('editBundle.loadError'));
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [props.bundleId, props.type, t]);

  // When type changes (create mode), filter available items and clear members.
  useEffect(() => {
    if (editing) return;
    setAvailable((prev) => prev.filter((it) => it.type === bundle.type));
    setBundle((b) => ({ ...b, items: [] }));
    setPending({});
    setPickerFilter('');
  }, [bundle.type, editing]);

  const title = editing ? t('editBundle.editTitle') : t('editBundle.addTitle');

  const canSave = useMemo(() => {
    if (!bundle.name.trim()) return false;
    if (bundle.items.length < 1) return false;
    return true;
  }, [bundle.items.length, bundle.name]);

  const memberIds = useMemo(() => new Set(bundle.items.map((m) => m.itemId)), [bundle.items]);

  const filteredAvailable = useMemo(() => {
    const q = pickerFilter.trim().toLowerCase();
    const items = available.filter((it) => it.type === bundle.type);
    if (!q) return items;
    return items.filter((it) => it.name.toLowerCase().includes(q) || it.category.toLowerCase().includes(q));
  }, [available, bundle.type, pickerFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, AvailableItem[]>();
    for (const it of filteredAvailable) {
      const key = it.category || 'Other';
      const xs = map.get(key) ?? [];
      xs.push(it);
      map.set(key, xs);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredAvailable]);

  const selectedCount = useMemo(() => Object.values(pending).filter(Boolean).length, [pending]);

  const openPicker = () => {
    const next: Record<string, boolean> = {};
    for (const it of available.filter((x) => x.type === bundle.type)) {
      if (memberIds.has(it.id)) next[it.id] = true;
    }
    setPending(next);
    setPickerOpen(true);
  };

  const applyPicker = () => {
    const selectedIds = Object.entries(pending)
      .filter(([, v]) => v)
      .map(([id]) => id);
    const itemsById = new Map(available.map((it) => [it.id, it]));
    setBundle((b) => ({
      ...b,
      items: selectedIds.map((id, idx) => {
        const it = itemsById.get(id);
        return {
          itemId: id,
          itemName: it?.name ?? id,
          categoryName: it?.category ?? '',
          displayOrder: idx,
        };
      }),
    }));
    setPickerOpen(false);
    setPickerFilter('');
  };

  const onPressSave = async () => {
    setError(null);
    try {
      await saveBundle(bundle);
      props.onBack();
    } catch {
      setError(t('editBundle.saveError'));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={props.onBack} style={styles.headerIcon} hitSlop={HIT_SLOP}>
          <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        <TouchableOpacity onPress={onPressSave} disabled={!canSave} style={styles.headerIcon} hitSlop={HIT_SLOP}>
          <Ionicons name="save-outline" size={20} color={canSave ? theme.accentPrimary : theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={{ color: theme.textSecondary }}>{t('common.loading')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing[3], gap: spacing[3] }}>
          {error ? (
            <View style={[styles.banner, { backgroundColor: theme.bannerError }]}>
              <Text style={{ color: theme.textPrimary }}>{error}</Text>
            </View>
          ) : null}

          {/* Name */}
          <View>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('editBundle.nameLabel')}</Text>
            <TextInput
              value={bundle.name}
              onChangeText={(v) => setBundle((b) => ({ ...b, name: v }))}
              placeholder={t('editBundle.namePlaceholder')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]}
            />
          </View>

          {/* Type */}
          <View>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('editBundle.typeLabel')}</Text>
            <View style={styles.typeRow}>
              {TYPES.map((ty) => {
                const selected = ty === bundle.type;
                return (
                  <TouchableOpacity
                    key={String(ty)}
                    onPress={() => {
                      if (editing) return;
                      setBundle((b) => ({ ...b, type: ty, items: [] }));
                    }}
                    disabled={editing}
                    style={[
                      styles.typeChip,
                      {
                        borderColor: selected ? theme.accentPrimary : theme.border,
                        backgroundColor: selected ? theme.accentPrimary : 'transparent',
                        opacity: editing ? 0.6 : 1,
                      },
                    ]}
                  >
                    <Text style={{ color: selected ? '#fff' : theme.textPrimary, fontWeight: '600' }}>{String(ty)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Items in bundle */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('editBundle.itemsInBundle')}</Text>
              <TouchableOpacity onPress={openPicker} hitSlop={HIT_SLOP}>
                <Ionicons name="add-circle" size={22} color={theme.accentPrimary} />
              </TouchableOpacity>
            </View>

            {bundle.items.length === 0 ? (
              <Text style={{ color: theme.textSecondary }}>{t('editBundle.emptyItems')}</Text>
            ) : (
              <View style={{ gap: spacing[2] }}>
                {bundle.items
                  .slice()
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((m, idx) => (
                    <View key={m.itemId} style={[styles.memberRow, { borderColor: theme.border }]}>
                      <Ionicons name="reorder-three-outline" size={18} color={theme.textSecondary} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>{m.itemName}</Text>
                        <Text style={{ color: theme.textSecondary, ...typography.small }}>{m.categoryName}</Text>
                      </View>

                      {/* Simple reordering controls (instead of drag) */}
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <TouchableOpacity
                          onPress={() => {
                            if (idx === 0) return;
                            setBundle((b) => {
                              const ordered = b.items.slice().sort((a, b2) => a.displayOrder - b2.displayOrder);
                              const tmp = ordered[idx - 1];
                              ordered[idx - 1] = ordered[idx];
                              ordered[idx] = tmp;
                              return {
                                ...b,
                                items: ordered.map((x, i) => ({ ...x, displayOrder: i })),
                              };
                            });
                          }}
                          hitSlop={HIT_SLOP}
                        >
                          <Ionicons name="chevron-up" size={18} color={theme.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setBundle((b) => {
                              const ordered = b.items.slice().sort((a, b2) => a.displayOrder - b2.displayOrder);
                              if (idx >= ordered.length - 1) return b;
                              const tmp = ordered[idx + 1];
                              ordered[idx + 1] = ordered[idx];
                              ordered[idx] = tmp;
                              return {
                                ...b,
                                items: ordered.map((x, i) => ({ ...x, displayOrder: i })),
                              };
                            });
                          }}
                          hitSlop={HIT_SLOP}
                        >
                          <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            if (bundle.items.length <= 1) {
                              Alert.alert(t('editBundle.minOneTitle'), t('editBundle.minOneBody'));
                              return;
                            }
                            setBundle((b) => ({
                              ...b,
                              items: b.items.filter((x) => x.itemId !== m.itemId).map((x, i) => ({ ...x, displayOrder: i })),
                            }));
                          }}
                          hitSlop={HIT_SLOP}
                        >
                          <Ionicons name="trash-outline" size={18} color={theme.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Picker modal */}
      <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t('editBundle.addItemsTitle')}</Text>
            <TouchableOpacity onPress={applyPicker} hitSlop={HIT_SLOP}>
              <Text style={{ color: theme.accentPrimary, fontWeight: '700' }}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.modalFilter, { borderBottomColor: theme.border }]}>
            <Ionicons name="search-outline" size={18} color={theme.textSecondary} />
            <TextInput
              value={pickerFilter}
              onChangeText={setPickerFilter}
              placeholder={t('editBundle.searchItems')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.modalFilterInput, { color: theme.textPrimary }]}
            />
          </View>

          <FlatList
            data={grouped}
            keyExtractor={([cat]) => cat}
            renderItem={({ item: [cat, xs] }) => (
              <View>
                <Text style={[styles.catHeader, { color: theme.textSecondary }]}>{cat}</Text>
                {xs.map((it) => {
                  const checked = Boolean(pending[it.id]);
                  const disabled = memberIds.has(it.id);
                  return (
                    <TouchableOpacity
                      key={it.id}
                      style={[styles.pickRow, { borderBottomColor: theme.border, opacity: disabled ? 0.5 : 1 }]}
                      onPress={() => {
                        if (disabled) return;
                        setPending((p) => ({ ...p, [it.id]: !p[it.id] }));
                      }}
                      disabled={disabled}
                    >
                      <Ionicons
                        name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                        size={20}
                        color={checked ? theme.accentPrimary : theme.border}
                      />
                      <Text style={{ color: theme.textPrimary, flex: 1 }}>{it.name}</Text>
                      {disabled ? <Text style={{ color: theme.textSecondary }}>{t('editBundle.alreadyInBundle')}</Text> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          />

          <View style={[styles.pickerFooter, { borderTopColor: theme.border, backgroundColor: theme.surface }]}>
            <TouchableOpacity
              onPress={applyPicker}
              style={[styles.primaryButton, { backgroundColor: theme.accentPrimary }]}
            >
              <Text style={styles.primaryButtonText}>
                {t('editBundle.addSelected', { count: selectedCount })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerTitle: { ...typography.title, flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[4] },
  banner: { padding: spacing[3], borderRadius: 12 },
  label: { ...typography.small, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    ...typography.body,
  },
  typeRow: { flexDirection: 'row', gap: spacing[2] },
  typeChip: { paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: 999, borderWidth: 1 },
  card: { borderWidth: 1, borderRadius: 12, padding: spacing[3] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[2] },
  sectionTitle: { ...typography.body, fontWeight: '600' },
  memberRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  modalContainer: { flex: 1 },
  modalHeader: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { ...typography.title },
  modalFilter: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  modalFilterInput: { flex: 1, ...typography.body, paddingVertical: 0 },
  catHeader: { paddingHorizontal: spacing[3], paddingTop: spacing[3], paddingBottom: spacing[1], ...typography.small, fontWeight: '600' },
  pickRow: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  pickerFooter: { padding: spacing[3], borderTopWidth: 1 },
  primaryButton: { borderRadius: 12, paddingVertical: spacing[3], alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});


