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
import { getEditItem, saveItem, type CategoryOption, type ItemEdit, type QuantifierEdit } from '../data/editItem';
import type { CatalogType } from '../data/configureCatalog';

const TYPES: CatalogType[] = ['Activity', 'Condition', 'Outcome'];

export default function EditItem(props: { itemId?: string; type?: CatalogType; onBack: () => void }) {
  const theme = useTheme();
  const t = useT();

  const editing = Boolean(props.itemId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [item, setItem] = useState<ItemEdit>({
    name: '',
    description: '',
    type: props.type ?? 'Activity',
    category: '',
    quantifiers: [],
  });
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  // Modals
  const [categoryModal, setCategoryModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [createCategoryModal, setCreateCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [quantModal, setQuantModal] = useState(false);
  const [editingQuantIndex, setEditingQuantIndex] = useState<number | null>(null);
  const [qName, setQName] = useState('');
  const [qMin, setQMin] = useState('');
  const [qMax, setQMax] = useState('');
  const [qUnits, setQUnits] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getEditItem({ itemId: props.itemId, type: props.type })
      .then((res) => {
        if (!alive) return;
        setItem(res.item);
        setCategories(res.categories);
      })
      .catch(() => {
        if (!alive) return;
        setError(t('editItem.loadError'));
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [props.itemId, props.type, t]);

  // When type changes in create mode, refresh category options.
  useEffect(() => {
    if (editing) return;
    // Recompute categories based on current catalog (cheap) by reusing getEditItem.
    let alive = true;
    getEditItem({ type: item.type })
      .then((res) => {
        if (!alive) return;
        setCategories(res.categories);
        // Reset category if it no longer exists
        if (item.category && !res.categories.some((c) => c.id === item.category)) {
          setItem((prev) => ({ ...prev, category: '' }));
        }
      })
      .catch(() => {
        if (!alive) return;
        // leave categories as-is
      });
    return () => {
      alive = false;
    };
  }, [editing, item.category, item.type]);

  const title = editing ? t('editItem.editTitle') : t('editItem.addTitle');

  const canSave = useMemo(() => {
    if (!item.name.trim()) return false;
    if (!item.category.trim()) return false;
    return true;
  }, [item.category, item.name]);

  const filteredCategories = useMemo(() => {
    const q = categoryFilter.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, categoryFilter]);

  const openQuantifierEditor = (idx: number | null) => {
    setEditingQuantIndex(idx);
    const q = idx != null ? item.quantifiers[idx] : undefined;
    setQName(q?.name ?? '');
    setQMin(q?.minValue != null ? String(q.minValue) : '');
    setQMax(q?.maxValue != null ? String(q.maxValue) : '');
    setQUnits(q?.units ?? '');
    setQuantModal(true);
  };

  const saveQuantifier = () => {
    if (!qName.trim()) {
      Alert.alert(t('editItem.validationTitle'), t('editItem.quantifierNameRequired'));
      return;
    }
    const next: QuantifierEdit = {
      ...(editingQuantIndex != null ? item.quantifiers[editingQuantIndex] : {}),
      name: qName.trim(),
      minValue: qMin.trim() ? Number(qMin) : undefined,
      maxValue: qMax.trim() ? Number(qMax) : undefined,
      units: qUnits.trim() ? qUnits.trim() : undefined,
    };
    setItem((prev) => {
      const qs = [...prev.quantifiers];
      if (editingQuantIndex == null) qs.push(next);
      else qs[editingQuantIndex] = next;
      return { ...prev, quantifiers: qs };
    });
    setQuantModal(false);
  };

  const onPressSave = async () => {
    setError(null);
    try {
      await saveItem(item);
      props.onBack();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[EditItem] Save failed', err);
      if (__DEV__) {
        Alert.alert('Save failed', String(err));
      }
      setError(t('editItem.saveError'));
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
        <TouchableOpacity
          onPress={onPressSave}
          disabled={!canSave}
          style={styles.headerIcon}
          hitSlop={HIT_SLOP}
        >
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
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('editItem.nameLabel')}</Text>
            <TextInput
              value={item.name}
              onChangeText={(v) => setItem((p) => ({ ...p, name: v }))}
              placeholder={t('editItem.namePlaceholder')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]}
            />
          </View>

          {/* Description */}
          <View>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('editItem.descriptionLabel')}</Text>
            <TextInput
              value={item.description ?? ''}
              onChangeText={(v) => setItem((p) => ({ ...p, description: v }))}
              placeholder={t('editItem.descriptionPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[styles.textArea, { borderColor: theme.border, color: theme.textPrimary }]}
            />
          </View>

          {/* Type */}
          <View>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('editItem.typeLabel')}</Text>
            <View style={styles.typeRow}>
              {TYPES.map((ty) => {
                const selected = ty === item.type;
                return (
                  <TouchableOpacity
                    key={String(ty)}
                    onPress={() => {
                      if (editing) return;
                      setItem((p) => ({ ...p, type: ty, category: '' }));
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

          {/* Category */}
          <View>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('editItem.categoryLabel')}</Text>
            <TouchableOpacity
              onPress={() => setCategoryModal(true)}
              style={[styles.selector, { backgroundColor: theme.surface, borderColor: theme.border }]}
              activeOpacity={0.85}
            >
              <Text style={[styles.selectorText, { color: item.category ? theme.textPrimary : theme.textSecondary }]}>
                {item.category ? item.category : t('editItem.selectCategory')}
              </Text>
              <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Quantifiers */}
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('editItem.quantifiers')}</Text>
              <TouchableOpacity onPress={() => openQuantifierEditor(null)} hitSlop={HIT_SLOP}>
                <Ionicons name="add-circle" size={22} color={theme.accentPrimary} />
              </TouchableOpacity>
            </View>

            {item.quantifiers.length === 0 ? (
              <Text style={{ color: theme.textSecondary }}>{t('editItem.noQuantifiers')}</Text>
            ) : (
              <View style={{ gap: spacing[2] }}>
                {item.quantifiers.map((q, idx) => (
                  <View key={`${q.name}-${idx}`} style={[styles.quantRow, { borderColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>{q.name}</Text>
                      <Text style={{ color: theme.textSecondary, ...typography.small }}>
                        {q.minValue != null || q.maxValue != null
                          ? `${q.minValue ?? ''}${q.minValue != null && q.maxValue != null ? '–' : ''}${q.maxValue ?? ''}`
                          : t('editItem.noRange')}
                        {q.units ? ` (${q.units})` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => openQuantifierEditor(idx)} hitSlop={HIT_SLOP}>
                      <Ionicons name="create-outline" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert(t('editItem.deleteQuantTitle'), t('editItem.deleteQuantConfirm'), [
                          { text: t('common.cancel'), style: 'cancel' },
                          {
                            text: t('common.delete'),
                            style: 'destructive',
                            onPress: () =>
                              setItem((p) => ({ ...p, quantifiers: p.quantifiers.filter((_, i) => i !== idx) })),
                          },
                        ]);
                      }}
                      hitSlop={HIT_SLOP}
                    >
                      <Ionicons name="trash-outline" size={18} color={theme.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Category modal */}
      <Modal visible={categoryModal} animationType="slide" onRequestClose={() => setCategoryModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t('editItem.selectCategory')}</Text>
            <TouchableOpacity onPress={() => setCategoryModal(false)} hitSlop={HIT_SLOP}>
              <Ionicons name="close" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={[styles.modalFilter, { borderBottomColor: theme.border }]}>
            <Ionicons name="search-outline" size={18} color={theme.textSecondary} />
            <TextInput
              value={categoryFilter}
              onChangeText={setCategoryFilter}
              placeholder={t('common.search')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.modalFilterInput, { color: theme.textPrimary }]}
            />
          </View>
          <FlatList
            data={filteredCategories}
            keyExtractor={(c) => c.id}
            renderItem={({ item: c }) => (
              <TouchableOpacity
                style={[styles.modalRow, { borderBottomColor: theme.border }]}
                onPress={() => {
                  setItem((p) => ({ ...p, category: c.id }));
                  setCategoryModal(false);
                  setCategoryFilter('');
                }}
              >
                <Text style={{ color: theme.textPrimary, flex: 1 }}>{c.name}</Text>
                {c.id === item.category ? <Ionicons name="checkmark" size={18} color={theme.accentPrimary} /> : null}
              </TouchableOpacity>
            )}
            ListFooterComponent={
              <TouchableOpacity
                style={[styles.modalRow, { borderBottomColor: theme.border }]}
                onPress={() => {
                  setCategoryModal(false);
                  setCreateCategoryModal(true);
                  setNewCategoryName(categoryFilter.trim());
                }}
              >
                <Ionicons name="add" size={18} color={theme.accentPrimary} />
                <Text style={{ color: theme.accentPrimary, fontWeight: '600' }}>{t('editItem.createCategory')}</Text>
              </TouchableOpacity>
            }
          />
        </View>
      </Modal>

      {/* Create category modal */}
      <Modal visible={createCategoryModal} transparent animationType="fade" onRequestClose={() => setCreateCategoryModal(false)}>
        <View style={styles.backdrop}>
          <View style={[styles.dialog, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.dialogTitle, { color: theme.textPrimary }]}>{t('editItem.newCategory')}</Text>
            <TextInput
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder={t('editItem.categoryNamePlaceholder')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]}
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity onPress={() => setCreateCategoryModal(false)}>
                <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const name = newCategoryName.trim();
                  if (!name) return;
                  // Local-only: append to options and select immediately.
                  setCategories((prev) => {
                    if (prev.some((c) => c.id === name)) return prev;
                    return [...prev, { id: name, name }].sort((a, b) => a.name.localeCompare(b.name));
                  });
                  setItem((p) => ({ ...p, category: name }));
                  setCreateCategoryModal(false);
                  setNewCategoryName('');
                }}
              >
                <Text style={{ color: theme.accentPrimary, fontWeight: '700' }}>{t('common.done')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Quantifier modal */}
      <Modal visible={quantModal} animationType="slide" onRequestClose={() => setQuantModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {editingQuantIndex == null ? t('editItem.addQuantifier') : t('editItem.editQuantifier')}
            </Text>
            <TouchableOpacity onPress={() => setQuantModal(false)} hitSlop={HIT_SLOP}>
              <Ionicons name="close" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing[3], gap: spacing[3] }}>
            <View>
              <Text style={[styles.label, { color: theme.textSecondary }]}>{t('editItem.quantifierName')}</Text>
              <TextInput
                value={qName}
                onChangeText={setQName}
                placeholder={t('editItem.quantifierNamePlaceholder')}
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]}
              />
            </View>
            <View>
              <Text style={[styles.label, { color: theme.textSecondary }]}>{t('editItem.minValue')}</Text>
              <TextInput value={qMin} onChangeText={setQMin} keyboardType="numeric" style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]} />
            </View>
            <View>
              <Text style={[styles.label, { color: theme.textSecondary }]}>{t('editItem.maxValue')}</Text>
              <TextInput value={qMax} onChangeText={setQMax} keyboardType="numeric" style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]} />
            </View>
            <View>
              <Text style={[styles.label, { color: theme.textSecondary }]}>{t('editItem.units')}</Text>
              <TextInput
                value={qUnits}
                onChangeText={setQUnits}
                placeholder={t('editItem.unitsPlaceholder')}
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]}
              />
            </View>
            <TouchableOpacity onPress={saveQuantifier} style={[styles.primaryButton, { backgroundColor: theme.accentPrimary }]}>
              <Text style={styles.primaryButtonText}>{t('common.done')}</Text>
            </TouchableOpacity>
          </ScrollView>
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
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    minHeight: 96,
    textAlignVertical: 'top',
    ...typography.body,
  },
  typeRow: { flexDirection: 'row', gap: spacing[2] },
  typeChip: { paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: 999, borderWidth: 1 },
  selector: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  selectorText: { ...typography.body, flex: 1 },
  card: { borderWidth: 1, borderRadius: 12, padding: spacing[3] },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[2] },
  sectionTitle: { ...typography.body, fontWeight: '600' },
  quantRow: {
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
  modalRow: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: spacing[3] },
  dialog: { width: '100%', borderRadius: 12, borderWidth: 1, padding: spacing[3], gap: spacing[3] },
  dialogTitle: { ...typography.title },
  dialogActions: { flexDirection: 'row', justifyContent: 'space-between' },
  primaryButton: { borderRadius: 12, paddingVertical: spacing[3], alignItems: 'center', justifyContent: 'center', marginTop: spacing[2] },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});


