import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { spacing, typography, useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import { createLogger } from '../util/logger';
import {
  createLogEntry,
  deleteLogEntry,
  EditEntryMode,
  getCategoryStats,
  getEditEntry,
  getItemStats,
  getTypeStats,
  ItemStatRow,
  StatRow,
  updateLogEntry,
} from '../data/editEntry';

type PickerRow = { id: string; name: string; usageCount: number };

const logger = createLogger('EditEntry');

function sortByUsageThenName<T extends PickerRow>(rows: T[]) {
  return [...rows].sort((a, b) => {
    if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
    return a.name.localeCompare(b.name);
  });
}

function pickMostUsed<T extends PickerRow>(rows: T[]): T | null {
  if (!rows.length) return null;
  return sortByUsageThenName(rows)[0] ?? null;
}

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function EditEntry(props: {
  mode: EditEntryMode;
  entryId?: string;
  onBack: () => void;
}) {
  const theme = useTheme();
  const t = useT();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data backing pickers
  const [types, setTypes] = useState<StatRow[]>([]);
  const [categories, setCategories] = useState<StatRow[]>([]);
  const [items, setItems] = useState<ItemStatRow[]>([]);

  // Form state
  const [typeId, setTypeId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [timestamp, setTimestamp] = useState<string>(new Date().toISOString());
  const [comment, setComment] = useState<string>('');
  const [quantifiers, setQuantifiers] = useState<Array<{ label: string; value: number; units: string }>>([]);

  // UI state
  const [typeModal, setTypeModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [itemsModal, setItemsModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [itemsFilter, setItemsFilter] = useState('');

  // Date/time picker state (legacy parity)
  const [dateTimeModalVisible, setDateTimeModalVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Load initial data (entry + stats)
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    Promise.all([getTypeStats(), getEditEntry(props.mode, props.entryId)])
      .then(([typeStats, entry]) => {
        if (!alive) return;
        const sortedTypes = sortByUsageThenName(typeStats);
        setTypes(sortedTypes);
        setTimestamp(entry.timestamp);
        setComment(entry.comment ?? '');
        setQuantifiers(entry.quantifiers ?? []);

        // Map entry.type (name) -> typeId if possible.
        const matchedType =
          sortedTypes.find((r) => r.name.toLowerCase() === (entry.type ?? '').toLowerCase()) ??
          (props.mode === 'new' ? pickMostUsed(sortedTypes) : null);
        setTypeId(matchedType?.id ?? '');

        // Hydrate edit/clone selections when available.
        if (props.mode !== 'new') {
          if (entry.categoryId) setCategoryId(entry.categoryId);
          if (entry.itemIds?.length) setSelectedItemIds(entry.itemIds);
        }
      })
      .catch((err) => {
        if (!alive) return;
        logger.error('Failed to load', err);
        setError(t('editEntry.errorLoading'));
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [props.entryId, props.mode, t]);

  // When type changes, load categories and auto-pick default in new mode.
  useEffect(() => {
    let alive = true;
    if (!typeId) {
      setCategories([]);
      setCategoryId('');
      return;
    }

    getCategoryStats(typeId)
      .then((rows) => {
        if (!alive) return;
        const sorted = sortByUsageThenName(rows);
        setCategories(sorted);
        // Only auto-pick category for new mode (keeps edit/clone stable).
        if (props.mode === 'new') {
          setCategoryId(pickMostUsed(sorted)?.id ?? '');
        }
      })
      .catch((err) => {
        if (!alive) return;
        logger.error('Failed to load categories', { typeId }, err);
        setError(t('editEntry.errorLoading'));
      });

    return () => {
      alive = false;
    };
  }, [props.mode, t, typeId]);

  // When category changes, load items and clear selection (spec: reset items when category changed).
  useEffect(() => {
    let alive = true;
    if (!categoryId) {
      setItems([]);
      setSelectedItemIds([]);
      return;
    }

    getItemStats(categoryId)
      .then((rows) => {
        if (!alive) return;
        const sorted = sortByUsageThenName(rows);
        setItems(sorted);
        // If existing selection contains IDs not in this category, clear.
        setSelectedItemIds((prev) => prev.filter((id) => sorted.some((r) => r.id === id)));
      })
      .catch((err) => {
        if (!alive) return;
        logger.error('Failed to load items', { categoryId }, err);
        setError(t('editEntry.errorLoading'));
      });

    return () => {
      alive = false;
    };
  }, [categoryId, t]);

  const selectedType = useMemo(() => types.find((x) => x.id === typeId) ?? null, [typeId, types]);
  const selectedCategory = useMemo(() => categories.find((x) => x.id === categoryId) ?? null, [categoryId, categories]);
  const selectedItems = useMemo(() => items.filter((x) => selectedItemIds.includes(x.id)), [items, selectedItemIds]);

  const timestampDate = useMemo(() => {
    const d = new Date(timestamp);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }, [timestamp]);

  const handleDateTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      if (pickerMode === 'date') {
        setShowDatePicker(false);
        if (event.type === 'set' && selectedDate) {
          setTimestamp(selectedDate.toISOString());
          // show time picker after date is selected
          setTimeout(() => {
            setPickerMode('time');
            setShowTimePicker(true);
          }, 100);
        }
      } else {
        setShowTimePicker(false);
        if (event.type === 'set' && selectedDate) {
          setTimestamp(selectedDate.toISOString());
        }
      }
      return;
    }

    // iOS - inline picker
    if (selectedDate) setTimestamp(selectedDate.toISOString());
  };

  const openDateTimePicker = () => {
    if (Platform.OS === 'android') {
      setPickerMode('date');
      setShowDatePicker(true);
      return;
    }
    setDateTimeModalVisible(true);
  };

  const canSave = useMemo(() => {
    if (!typeId) return false;
    if (!timestamp) return false;
    if (selectedItemIds.length > 0 && !categoryId) return false;
    return true;
  }, [categoryId, selectedItemIds.length, timestamp, typeId]);

  const title =
    props.mode === 'edit'
      ? t('editEntry.titleEdit')
      : props.mode === 'clone'
        ? t('editEntry.titleClone')
        : t('editEntry.titleNew');

  const primaryLabel =
    props.mode === 'edit' ? t('editEntry.save') : props.mode === 'clone' ? t('editEntry.clone') : t('editEntry.add');

  const toggleItem = (id: string) => {
    setSelectedItemIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const onPressDelete = () => {
    if (!props.entryId) return;
    Alert.alert(t('editEntry.deleteTitle'), t('editEntry.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteLogEntry(props.entryId!);
            props.onBack();
          } catch {
            setError(t('editEntry.errorSaving'));
          }
        },
      },
    ]);
  };

  const onPressSave = async () => {
    setError(null);
    const payload = {
      mode: props.mode,
      entryId: props.entryId,
      typeId,
      categoryId: categoryId || null,
      itemIds: selectedItemIds,
      timestamp,
      comment: comment || null,
      quantifiers,
    };
    try {
      if (props.mode === 'edit' && props.entryId) {
        await updateLogEntry(props.entryId, payload);
      } else {
        await createLogEntry(payload);
      }
      props.onBack();
    } catch {
      setError(t('editEntry.errorSaving'));
    }
  };

  const filteredTypes = useMemo(() => {
    const q = typeFilter.trim().toLowerCase();
    if (!q) return types;
    return types.filter((r) => r.name.toLowerCase().includes(q));
  }, [typeFilter, types]);

  const filteredCategories = useMemo(() => {
    const q = categoryFilter.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((r) => r.name.toLowerCase().includes(q));
  }, [categories, categoryFilter]);

  const filteredItems = useMemo(() => {
    const q = itemsFilter.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) => r.name.toLowerCase().includes(q));
  }, [items, itemsFilter]);

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
        {props.mode === 'edit' ? (
          <TouchableOpacity onPress={onPressDelete} style={styles.headerIcon} hitSlop={HIT_SLOP}>
            <Ionicons name="trash-outline" size={20} color={theme.error} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerIcon} />
        )}
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

          {/* Type */}
          <View>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('editEntry.type')}</Text>
            <TouchableOpacity
              onPress={() => setTypeModal(true)}
              style={[styles.selector, { backgroundColor: theme.surface, borderColor: theme.border }]}
              activeOpacity={0.85}
            >
              <Text style={[styles.selectorText, { color: selectedType ? theme.textPrimary : theme.textSecondary }]}>
                {selectedType ? selectedType.name : t('editEntry.selectType')}
              </Text>
              <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Category */}
          <View>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('editEntry.category')}</Text>
            <TouchableOpacity
              onPress={() => typeId && setCategoryModal(true)}
              style={[
                styles.selector,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  opacity: typeId ? 1 : 0.5,
                },
              ]}
              activeOpacity={0.85}
              disabled={!typeId}
            >
              <Text style={[styles.selectorText, { color: selectedCategory ? theme.textPrimary : theme.textSecondary }]}>
                {selectedCategory ? selectedCategory.name : t('editEntry.selectCategory')}
              </Text>
              <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Items */}
          <View>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('editEntry.items')}</Text>
            <TouchableOpacity
              onPress={() => categoryId && setItemsModal(true)}
              style={[
                styles.selector,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  opacity: categoryId ? 1 : 0.5,
                },
              ]}
              activeOpacity={0.85}
              disabled={!categoryId}
            >
              <Text style={[styles.selectorText, { color: selectedItems.length ? theme.textPrimary : theme.textSecondary }]} numberOfLines={1}>
                {selectedItems.length ? selectedItems.map((x) => x.name).join(', ') : t('editEntry.selectItems')}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Quantifiers (simple v1: edits the loaded quantifier values) */}
          {quantifiers.length ? (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('editEntry.quantifiers')}</Text>
              <View style={{ gap: spacing[2] }}>
                {quantifiers.map((q, idx) => (
                  <View key={`${q.label}-${idx}`} style={{ gap: 6 }}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>
                      {q.label} {q.units ? `(${q.units})` : ''}
                    </Text>
                    <TextInput
                      value={String(q.value)}
                      onChangeText={(txt) => {
                        const n = Number(txt);
                        setQuantifiers((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, value: Number.isFinite(n) ? n : p.value } : p))
                        );
                      }}
                      keyboardType="numeric"
                      style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]}
                    />
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Timestamp (placeholder, until DateTimePicker slice introduces native picker) */}
          <View>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('editEntry.timestamp')}</Text>
            <TouchableOpacity
              onPress={openDateTimePicker}
              style={[styles.selector, { backgroundColor: theme.surface, borderColor: theme.border }]}
              activeOpacity={0.85}
            >
              <Text style={[styles.selectorText, { color: theme.textPrimary }]}>{formatTimestamp(timestamp)}</Text>
              <Ionicons name="time-outline" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Comment */}
          <View>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('editEntry.comment')}</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder={t('editEntry.commentPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[styles.textArea, { borderColor: theme.border, color: theme.textPrimary }]}
            />
          </View>

          {/* Footer CTA */}
          <TouchableOpacity
            onPress={onPressSave}
            disabled={!canSave}
            style={[
              styles.primaryButton,
              { backgroundColor: canSave ? theme.accentPrimary : theme.border },
            ]}
          >
            <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Date/time picker (Android) */}
      {showDatePicker ? (
        <DateTimePicker value={timestampDate} mode="date" display="default" onChange={handleDateTimeChange} />
      ) : null}
      {showTimePicker ? (
        <DateTimePicker value={timestampDate} mode="time" display="default" onChange={handleDateTimeChange} />
      ) : null}

      {/* Date/time picker (iOS modal) */}
      <Modal visible={dateTimeModalVisible} animationType="slide" transparent onRequestClose={() => setDateTimeModalVisible(false)}>
        <View style={styles.dateTimeModalBackdrop}>
          <View style={[styles.dateTimeModalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.dateTimeModalHeader, { borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => setDateTimeModalVisible(false)} hitSlop={HIT_SLOP}>
                <Text style={{ color: theme.accentPrimary, fontWeight: '700' }}>{t('common.done')}</Text>
              </TouchableOpacity>
              <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{t('editEntry.timestamp')}</Text>
              <TouchableOpacity
                onPress={() => setTimestamp(new Date().toISOString())}
                hitSlop={HIT_SLOP}
              >
                <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>{t('common.now')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.dateTimePickerWrap}>
              <DateTimePicker value={timestampDate} mode="datetime" display="inline" onChange={handleDateTimeChange} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Type modal */}
      <Modal visible={typeModal} animationType="slide" onRequestClose={() => setTypeModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t('editEntry.selectType')}</Text>
            <TouchableOpacity onPress={() => setTypeModal(false)} hitSlop={HIT_SLOP}>
              <Ionicons name="close" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={[styles.modalFilter, { borderBottomColor: theme.border }]}>
            <Ionicons name="search-outline" size={18} color={theme.textSecondary} />
            <TextInput
              value={typeFilter}
              onChangeText={setTypeFilter}
              placeholder={t('common.search')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.modalFilterInput, { color: theme.textPrimary }]}
            />
          </View>
          <FlatList
            data={filteredTypes}
            keyExtractor={(r) => r.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.modalRow, { borderBottomColor: theme.border }]}
                onPress={() => {
                  setTypeId(item.id);
                  // Reset dependent fields per spec.
                  setCategoryId('');
                  setSelectedItemIds([]);
                  setTypeModal(false);
                  setTypeFilter('');
                }}
              >
                <Text style={{ color: theme.textPrimary, flex: 1 }}>{item.name}</Text>
                {item.id === typeId ? <Ionicons name="checkmark" size={18} color={theme.accentPrimary} /> : null}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Category modal */}
      <Modal visible={categoryModal} animationType="slide" onRequestClose={() => setCategoryModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t('editEntry.selectCategory')}</Text>
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
            keyExtractor={(r) => r.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.modalRow, { borderBottomColor: theme.border }]}
                onPress={() => {
                  setCategoryId(item.id);
                  setSelectedItemIds([]);
                  setCategoryModal(false);
                  setCategoryFilter('');
                }}
              >
                <Text style={{ color: theme.textPrimary, flex: 1 }}>{item.name}</Text>
                {item.id === categoryId ? <Ionicons name="checkmark" size={18} color={theme.accentPrimary} /> : null}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Items modal */}
      <Modal visible={itemsModal} animationType="slide" onRequestClose={() => setItemsModal(false)}>
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>{t('editEntry.selectItems')}</Text>
            <TouchableOpacity
              onPress={() => {
                setItemsModal(false);
                setItemsFilter('');
              }}
              hitSlop={HIT_SLOP}
            >
              <Text style={{ color: theme.accentPrimary, fontWeight: '600' }}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.modalFilter, { borderBottomColor: theme.border }]}>
            <Ionicons name="search-outline" size={18} color={theme.textSecondary} />
            <TextInput
              value={itemsFilter}
              onChangeText={setItemsFilter}
              placeholder={t('common.search')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.modalFilterInput, { color: theme.textPrimary }]}
            />
          </View>
          <FlatList
            data={filteredItems}
            keyExtractor={(r) => r.id}
            renderItem={({ item }) => {
              const checked = selectedItemIds.includes(item.id);
              return (
                <TouchableOpacity
                  style={[styles.modalRow, { borderBottomColor: theme.border }]}
                  onPress={() => toggleItem(item.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.textPrimary }}>{item.name}</Text>
                    {item.isBundle ? (
                      <Text style={{ color: theme.textSecondary, ...typography.small }}>{t('editEntry.bundle')}</Text>
                    ) : null}
                  </View>
                  {checked ? <Ionicons name="checkmark-circle" size={20} color={theme.accentPrimary} /> : <Ionicons name="ellipse-outline" size={20} color={theme.border} />}
                </TouchableOpacity>
              );
            }}
          />
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
  sectionTitle: { ...typography.body, fontWeight: '600', marginBottom: spacing[2] },
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
  primaryButton: {
    borderRadius: 12,
    paddingVertical: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
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

  // iOS date/time picker modal
  dateTimeModalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  dateTimeModalCard: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dateTimeModalHeader: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateTimePickerWrap: { padding: spacing[2] },
});


