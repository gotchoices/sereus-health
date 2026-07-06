import React, { useEffect, useState } from 'react';
import {
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
import { track } from '../util/activity';
import {
  createInlineItem,
  getCategoriesForTypeName,
  type ItemQuantifierDef,
} from '../data/editEntry';

export interface QuickAddResult {
  id: string;
  name: string;
  categoryName: string;
  quantifiers: ItemQuantifierDef[];
}

/**
 * Lightweight "create an item on the fly" sheet used while logging (and from the
 * bundle editor). Name (prefilled) + category (pick or create) + one optional
 * quantifier. Persists to the catalog and returns the new item.
 */
export default function QuickAddItem(props: {
  visible: boolean;
  typeName: string;
  initialName: string;
  onCancel: () => void;
  onCreated: (item: QuickAddResult) => void;
}) {
  const theme = useTheme();
  const t = useT();

  const [name, setName] = useState(props.initialName);
  const [categoryName, setCategoryName] = useState('');
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [quantName, setQuantName] = useState('');
  const [quantMin, setQuantMin] = useState('');
  const [quantMax, setQuantMax] = useState('');
  const [quantUnits, setQuantUnits] = useState('');
  const [showQuant, setShowQuant] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!props.visible) return;
    setName(props.initialName);
    setCategoryName('');
    setQuantName(''); setQuantMin(''); setQuantMax(''); setQuantUnits(''); setShowQuant(false);
    track(getCategoriesForTypeName(props.typeName)).then(setCategories).catch(() => setCategories([]));
  }, [props.visible, props.typeName, props.initialName]);

  const canCreate = name.trim().length > 0 && categoryName.trim().length > 0 && !saving;

  const onCreate = async () => {
    if (!canCreate) return;
    setSaving(true);
    try {
      const quantifiers = quantName.trim()
        ? [{
            name: quantName.trim(),
            minValue: quantMin.trim() ? Number(quantMin) : undefined,
            maxValue: quantMax.trim() ? Number(quantMax) : undefined,
            units: quantUnits.trim() || undefined,
          }]
        : [];
      const created = await track(createInlineItem({
        typeName: props.typeName,
        categoryName: categoryName.trim(),
        name: name.trim(),
        quantifiers,
      }));
      props.onCreated({ id: created.id, name: name.trim(), categoryName: categoryName.trim(), quantifiers: created.quantifiers });
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, value: string, onChange: (s: string) => void, opts?: { numeric?: boolean; placeholder?: string }) => (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={opts?.placeholder}
        placeholderTextColor={theme.textSecondary}
        keyboardType={opts?.numeric ? 'numeric' : 'default'}
        style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]}
      />
    </View>
  );

  return (
    <Modal visible={props.visible} animationType="slide" transparent onRequestClose={props.onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={props.onCancel}>
              <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.textPrimary }]}>{t('editEntry.quickAddTitle')}</Text>
            <TouchableOpacity onPress={onCreate} disabled={!canCreate}>
              <Text style={{ color: canCreate ? theme.accentPrimary : theme.border, fontWeight: '700' }}>
                {t('editEntry.quickAddCreateBtn')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: spacing[3], gap: spacing[3] }}>
            {field(t('editItem.nameLabel'), name, setName, { placeholder: t('editItem.namePlaceholder') })}

            {field(t('editEntry.quickAddCategory'), categoryName, setCategoryName, { placeholder: t('editItem.categoryNamePlaceholder') })}
            {categories.length ? (
              <View style={styles.chips}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setCategoryName(c.name)}
                    style={[styles.chip, { borderColor: theme.border, backgroundColor: categoryName === c.name ? theme.accentPrimary : theme.surface }]}
                  >
                    <Text style={{ color: categoryName === c.name ? '#fff' : theme.textPrimary, ...typography.small }}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {showQuant ? (
              <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                {field(t('editItem.quantifierName'), quantName, setQuantName, { placeholder: t('editItem.quantifierNamePlaceholder') })}
                <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                  <View style={{ flex: 1 }}>{field(t('editItem.minValue'), quantMin, setQuantMin, { numeric: true })}</View>
                  <View style={{ flex: 1 }}>{field(t('editItem.maxValue'), quantMax, setQuantMax, { numeric: true })}</View>
                </View>
                {field(t('editItem.units'), quantUnits, setQuantUnits, { placeholder: t('editItem.unitsPlaceholder') })}
              </View>
            ) : (
              <TouchableOpacity onPress={() => setShowQuant(true)} style={styles.addQuant}>
                <Ionicons name="add" size={18} color={theme.accentPrimary} />
                <Text style={{ color: theme.accentPrimary, fontWeight: '600' }}>{t('editEntry.quickAddQuantifier')}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { maxHeight: '88%', borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[3], paddingVertical: spacing[3], borderBottomWidth: 1,
  },
  title: { ...typography.body, fontWeight: '700' },
  label: { ...typography.small },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: spacing[3], paddingVertical: spacing[2], ...typography.body },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: spacing[3], paddingVertical: 6 },
  card: { borderWidth: 1, borderRadius: 12, padding: spacing[3], gap: spacing[2] },
  addQuant: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingVertical: spacing[1] },
});
