import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import { track } from '../util/activity';
import ComboField from '../components/ComboField';
import {
  createInlineItem,
  createLogEntry,
  deleteLogEntry,
  EditEntryMode,
  getBundleItemIds,
  getCategoriesForTypeName,
  getEditEntry,
  getItemQuantifiers,
  getItemsForType,
  getTypeStats,
  ItemQuantifierDef,
  SaveItem,
  StatRow,
  TypeItem,
  updateLogEntry,
} from '../data/editEntry';

const logger = createLogger('EditEntry');

type AddedItem = {
  id: string;
  name: string;
  categoryName: string | null;
  isBundle: boolean;
  quantifiers: ItemQuantifierDef[];
  values: Record<string, number>;
};

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function EditEntry(props: { mode: EditEntryMode; entryId?: string; onBack: () => void }) {
  const theme = useTheme();
  const t = useT();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [types, setTypes] = useState<StatRow[]>([]);
  const [typeId, setTypeId] = useState('');
  const [addedItems, setAddedItems] = useState<AddedItem[]>([]);
  const [timestamp, setTimestamp] = useState(new Date().toISOString());
  const [comment, setComment] = useState('');

  const [typeItems, setTypeItems] = useState<TypeItem[]>([]);
  const [typeCategories, setTypeCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [draft, setDraft] = useState<{ name: string; category: string; qName: string; qMin: string; qMax: string; qUnits: string } | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [iosPicker, setIosPicker] = useState(false);

  const typeName = useMemo(() => types.find((x) => x.id === typeId)?.name ?? '', [types, typeId]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    track(Promise.all([getTypeStats(), getEditEntry(props.mode, props.entryId)]))
      .then(([typeStats, entry]) => {
        if (!alive) return;
        const sorted = [...typeStats].sort((a, b) => (b.usageCount - a.usageCount) || a.name.localeCompare(b.name));
        setTypes(sorted);
        setTimestamp(entry.timestamp);
        setComment(entry.comment ?? '');

        const matchedType =
          sorted.find((r) => r.name.toLowerCase() === (entry.type ?? '').toLowerCase()) ??
          (props.mode === 'new' ? sorted[0] : undefined);
        setTypeId(matchedType?.id ?? '');

        if (props.mode !== 'new' && entry.items?.length) {
          setAddedItems(entry.items.map((it) => ({
            id: it.id,
            name: it.name,
            categoryName: it.categoryName,
            isBundle: it.isBundle,
            quantifiers: it.quantifiers.map((q) => ({ id: q.id, name: q.name, minValue: q.minValue, maxValue: q.maxValue, units: q.units })),
            values: Object.fromEntries(it.quantifiers.filter((q) => q.value != null).map((q) => [q.id, q.value as number])),
          })));
        }
      })
      .catch((err) => { if (alive) { logger.error('load failed', err); setError(t('editEntry.errorLoading')); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [props.entryId, props.mode, t]);

  // Load items + categories for the picker/draft when the Type changes.
  useEffect(() => {
    if (!typeId) { setTypeItems([]); setTypeCategories([]); return; }
    let alive = true;
    track(Promise.all([getItemsForType(typeId), getCategoriesForTypeName(typeName)]))
      .then(([items, cats]) => { if (alive) { setTypeItems(items); setTypeCategories(cats); } })
      .catch(() => { /* leave empty */ });
    return () => { alive = false; };
  }, [typeId, typeName]);

  const selectType = (id: string) => {
    if (id === typeId) return;
    const apply = () => { setTypeId(id); setAddedItems([]); };
    if (addedItems.length) {
      Alert.alert(t('editEntry.changeTypeTitle'), t('editEntry.changeTypeBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.done'), onPress: apply },
      ]);
    } else apply();
  };

  const addFromRow = async (row: TypeItem) => {
    if (addedItems.some((a) => a.id === row.id)) return;
    const quantifiers = row.isBundle ? [] : await track(getItemQuantifiers(row.id));
    setAddedItems((prev) => [...prev, { id: row.id, name: row.name, categoryName: row.categoryName, isBundle: row.isBundle, quantifiers, values: {} }]);
  };

  const confirmDraft = async () => {
    if (!draft || !draft.name.trim() || !draft.category.trim()) return;
    const quantifiers = draft.qName.trim()
      ? [{ name: draft.qName.trim(), minValue: draft.qMin.trim() ? Number(draft.qMin) : undefined, maxValue: draft.qMax.trim() ? Number(draft.qMax) : undefined, units: draft.qUnits.trim() || undefined }]
      : [];
    const created = await track(createInlineItem({ typeName, categoryName: draft.category.trim(), name: draft.name.trim(), quantifiers }));
    setAddedItems((prev) => prev.some((a) => a.id === created.id)
      ? prev
      : [...prev, { id: created.id, name: draft.name.trim(), categoryName: draft.category.trim(), isBundle: false, quantifiers: created.quantifiers, values: {} }]);
    setDraft(null);
  };

  const setQuantValue = (itemId: string, quantId: string, text: string) => {
    const n = Number(text);
    setAddedItems((prev) => prev.map((a) => {
      if (a.id !== itemId) return a;
      const values = { ...a.values };
      if (text.trim() === '' || !Number.isFinite(n)) delete values[quantId];
      else values[quantId] = n;
      return { ...a, values };
    }));
  };

  const timestampDate = useMemo(() => {
    const d = new Date(timestamp);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }, [timestamp]);

  const shiftHours = (h: number) => setTimestamp(new Date(timestampDate.getTime() + h * 3600e3).toISOString());

  const openPicker = () => {
    if (Platform.OS === 'android') { setPickerMode('date'); setShowDatePicker(true); }
    else setIosPicker(true);
  };
  const onDateTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      if (pickerMode === 'date') {
        setShowDatePicker(false);
        if (event.type === 'set' && selected) { setTimestamp(selected.toISOString()); setTimeout(() => { setPickerMode('time'); setShowTimePicker(true); }, 100); }
      } else { setShowTimePicker(false); if (event.type === 'set' && selected) setTimestamp(selected.toISOString()); }
      return;
    }
    if (selected) setTimestamp(selected.toISOString());
  };

  const canSave = !!typeId && !!timestamp && addedItems.length > 0;

  const onPressSave = async () => {
    setError(null);
    try {
      const items: SaveItem[] = [];
      for (const a of addedItems) {
        if (a.isBundle) {
          const memberIds = await track(getBundleItemIds(a.id));
          for (const mid of memberIds) items.push({ itemId: mid, sourceBundleId: a.id, quantifiers: [] });
        } else {
          const quantifiers = Object.entries(a.values).map(([quantifierId, value]) => ({ quantifierId, value }));
          items.push({ itemId: a.id, sourceBundleId: null, quantifiers });
        }
      }
      const seen = new Set<string>();
      const deduped = items.filter((it) => (seen.has(it.itemId) ? false : (seen.add(it.itemId), true)));
      const payload = { timestamp, typeId, comment: comment || null, items: deduped };
      if (props.mode === 'edit' && props.entryId) await track(updateLogEntry(props.entryId, payload));
      else await track(createLogEntry(payload));
      props.onBack();
    } catch (e) {
      logger.error('save failed', e);
      setError(t('editEntry.errorSaving'));
    }
  };

  const onPressDelete = () => {
    if (!props.entryId) return;
    Alert.alert(t('editEntry.deleteTitle'), t('editEntry.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
        try { await track(deleteLogEntry(props.entryId!)); props.onBack(); } catch { setError(t('editEntry.errorSaving')); }
      } },
    ]);
  };

  const title = props.mode === 'edit' ? t('editEntry.titleEdit') : props.mode === 'clone' ? t('editEntry.titleClone') : t('editEntry.titleNew');
  const primaryLabel = props.mode === 'edit' ? t('editEntry.save') : props.mode === 'clone' ? t('editEntry.clone') : t('editEntry.add');

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={props.onBack} style={styles.headerIcon} hitSlop={HIT_SLOP}>
          <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>{title}</Text>
        {props.mode === 'edit' ? (
          <TouchableOpacity onPress={onPressDelete} style={styles.headerIcon} hitSlop={HIT_SLOP}>
            <Ionicons name="trash-outline" size={20} color={theme.error} />
          </TouchableOpacity>
        ) : <View style={styles.headerIcon} />}
      </View>

      {loading ? (
        <View style={styles.center}><Text style={{ color: theme.textSecondary }}>{t('common.loading')}</Text></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing[3], gap: spacing[3] }} keyboardShouldPersistTaps="handled">
          {error ? <View style={[styles.banner, { backgroundColor: theme.bannerError }]}><Text style={{ color: theme.textPrimary }}>{error}</Text></View> : null}

          {/* Type */}
          <View>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('editEntry.type')}</Text>
            <View style={styles.chips}>
              {types.map((tp) => (
                <TouchableOpacity
                  key={tp.id}
                  onPress={() => selectType(tp.id)}
                  style={[styles.typeChip, { borderColor: theme.border, backgroundColor: tp.id === typeId ? theme.accentPrimary : theme.surface }]}
                >
                  <Text style={{ color: tp.id === typeId ? '#fff' : theme.textPrimary, fontWeight: '600' }}>{tp.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Items */}
          <View style={{ gap: spacing[2] }}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('editEntry.items')}</Text>
            {addedItems.map((a) => (
              <View key={a.id} style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.itemHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.textPrimary }}>{a.isBundle ? '📦 ' : ''}{a.name}</Text>
                    {a.categoryName ? <Text style={{ color: theme.textSecondary, ...typography.small }}>{a.categoryName}</Text> : null}
                  </View>
                  <TouchableOpacity onPress={() => setAddedItems((prev) => prev.filter((x) => x.id !== a.id))} hitSlop={HIT_SLOP}>
                    <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
                {a.quantifiers.map((q) => (
                  <View key={q.id} style={styles.quantRow}>
                    <Text style={{ color: theme.textSecondary, flex: 1 }}>
                      {q.name}{q.units ? ` (${q.units})` : ''}{q.minValue != null && q.maxValue != null ? ` ${q.minValue}–${q.maxValue}` : ''}
                    </Text>
                    <TextInput
                      value={a.values[q.id] != null ? String(a.values[q.id]) : ''}
                      onChangeText={(txt) => setQuantValue(a.id, q.id, txt)}
                      keyboardType="numeric"
                      placeholder="—"
                      placeholderTextColor={theme.textSecondary}
                      style={[styles.quantInput, { borderColor: theme.border, color: theme.textPrimary }]}
                    />
                  </View>
                ))}
              </View>
            ))}
            {draft ? (
              <View style={[styles.itemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <TextInput
                  value={draft.name}
                  onChangeText={(txt) => setDraft((d) => (d ? { ...d, name: txt } : d))}
                  placeholder={t('editItem.namePlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.draftInput, { borderColor: theme.border, color: theme.textPrimary }]}
                />
                <Text style={[styles.label, { color: theme.textSecondary }]}>{t('editEntry.quickAddCategory')}</Text>
                <TextInput
                  value={draft.category}
                  onChangeText={(txt) => setDraft((d) => (d ? { ...d, category: txt } : d))}
                  placeholder={t('editItem.categoryNamePlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.draftInput, { borderColor: theme.border, color: theme.textPrimary }]}
                />
                {typeCategories.length ? (
                  <View style={styles.chips}>
                    {typeCategories.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() => setDraft((d) => (d ? { ...d, category: c.name } : d))}
                        style={[styles.catChip, { borderColor: theme.border, backgroundColor: draft.category === c.name ? theme.accentPrimary : theme.surface }]}
                      >
                        <Text style={{ color: draft.category === c.name ? '#fff' : theme.textSecondary, ...typography.small }}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
                <TextInput
                  value={draft.qName}
                  onChangeText={(txt) => setDraft((d) => (d ? { ...d, qName: txt } : d))}
                  placeholder={t('editEntry.draftQuantifierPlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.draftInput, { borderColor: theme.border, color: theme.textPrimary }]}
                />
                {draft.qName.trim() ? (
                  <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                    <TextInput value={draft.qMin} onChangeText={(txt) => setDraft((d) => (d ? { ...d, qMin: txt } : d))} keyboardType="numeric" placeholder="min" placeholderTextColor={theme.textSecondary} style={[styles.draftInput, { flex: 1, borderColor: theme.border, color: theme.textPrimary }]} />
                    <TextInput value={draft.qMax} onChangeText={(txt) => setDraft((d) => (d ? { ...d, qMax: txt } : d))} keyboardType="numeric" placeholder="max" placeholderTextColor={theme.textSecondary} style={[styles.draftInput, { flex: 1, borderColor: theme.border, color: theme.textPrimary }]} />
                    <TextInput value={draft.qUnits} onChangeText={(txt) => setDraft((d) => (d ? { ...d, qUnits: txt } : d))} placeholder={t('editItem.units')} placeholderTextColor={theme.textSecondary} style={[styles.draftInput, { flex: 1.4, borderColor: theme.border, color: theme.textPrimary }]} />
                  </View>
                ) : null}
                <View style={styles.draftActions}>
                  <TouchableOpacity onPress={() => setDraft(null)}><Text style={{ color: theme.textSecondary, fontWeight: '600' }}>{t('common.cancel')}</Text></TouchableOpacity>
                  <TouchableOpacity onPress={confirmDraft} disabled={!draft.name.trim() || !draft.category.trim()}>
                    <Text style={{ color: draft.name.trim() && draft.category.trim() ? theme.accentPrimary : theme.border, fontWeight: '700' }}>{t('editEntry.addItem')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : typeId ? (
              <ComboField
                placeholder={t('editEntry.addItemPlaceholder')}
                options={typeItems.filter((it) => !addedItems.some((a) => a.id === it.id)).map((it) => ({ id: it.id, label: (it.isBundle ? '📦 ' : '') + it.name, sublabel: it.categoryName ?? undefined }))}
                onSelect={(opt) => { const row = typeItems.find((it) => it.id === opt.id); if (row) void addFromRow(row); }}
                onCreate={(text) => setDraft({ name: text, category: '', qName: '', qMin: '', qMax: '', qUnits: '' })}
                createLabelKey="editEntry.pickerCreate"
              />
            ) : null}
            {!addedItems.length && !draft ? <Text style={{ color: theme.textSecondary, ...typography.small }}>{t('editEntry.itemsEmptyHint')}</Text> : null}
          </View>

          {/* Timestamp */}
          <View style={{ gap: spacing[2] }}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{t('editEntry.timestamp')}</Text>
            <TouchableOpacity onPress={openPicker} style={[styles.selector, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={{ color: theme.textPrimary, flex: 1 }}>{formatTimestamp(timestamp)}</Text>
              <Ionicons name="time-outline" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
            <View style={styles.chips}>
              {[
                { label: t('editEntry.tsNow'), fn: () => setTimestamp(new Date().toISOString()) },
                { label: t('editEntry.tsMinus1h'), fn: () => shiftHours(-1) },
                { label: t('editEntry.tsYesterday'), fn: () => shiftHours(-24) },
              ].map((c) => (
                <TouchableOpacity key={c.label} onPress={c.fn} style={[styles.tsChip, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                  <Text style={{ color: theme.textSecondary, ...typography.small }}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
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

          <TouchableOpacity onPress={onPressSave} disabled={!canSave} style={[styles.primaryButton, { backgroundColor: canSave ? theme.accentPrimary : theme.border }]}>
            <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {showDatePicker ? <DateTimePicker value={timestampDate} mode="date" display="default" onChange={onDateTimeChange} /> : null}
      {showTimePicker ? <DateTimePicker value={timestampDate} mode="time" display="default" onChange={onDateTimeChange} /> : null}
      <Modal visible={iosPicker} animationType="slide" transparent onRequestClose={() => setIosPicker(false)}>
        <View style={styles.iosBackdrop}>
          <View style={[styles.iosCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.iosHeader, { borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => setIosPicker(false)} hitSlop={HIT_SLOP}><Text style={{ color: theme.accentPrimary, fontWeight: '700' }}>{t('common.done')}</Text></TouchableOpacity>
            </View>
            <DateTimePicker value={timestampDate} mode="datetime" display="inline" onChange={onDateTimeChange} />
          </View>
        </View>
      </Modal>

    </View>
  );
}

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  headerIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.title, flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[4] },
  banner: { padding: spacing[3], borderRadius: 12 },
  label: { ...typography.small, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  typeChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: spacing[3], paddingVertical: 8 },
  itemCard: { borderWidth: 1, borderRadius: 12, padding: spacing[3], gap: spacing[2] },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  quantRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  quantInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: spacing[2], paddingVertical: 6, minWidth: 72, textAlign: 'center', ...typography.body },
  draftInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: spacing[3], paddingVertical: spacing[2], ...typography.body },
  catChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: spacing[3], paddingVertical: 6 },
  draftActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing[1] },
  selector: { borderWidth: 1, borderRadius: 12, paddingHorizontal: spacing[3], paddingVertical: spacing[3], flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  tsChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: spacing[3], paddingVertical: 6 },
  textArea: { borderWidth: 1, borderRadius: 12, paddingHorizontal: spacing[3], paddingVertical: spacing[3], minHeight: 96, textAlignVertical: 'top', ...typography.body },
  primaryButton: { borderRadius: 12, paddingVertical: spacing[3], alignItems: 'center', justifyContent: 'center', marginTop: spacing[2] },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  iosBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  iosCard: { borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, overflow: 'hidden' },
  iosHeader: { padding: spacing[3], borderBottomWidth: 1, alignItems: 'flex-end' },
});
