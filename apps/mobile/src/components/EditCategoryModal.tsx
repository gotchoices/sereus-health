import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { spacing, typography, useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import type { CategoryRow } from '../data/configureCatalog';

/**
 * Small modal to create or edit a category (name within a Type), plus its
 * lifecycle actions (retire/restore, delete-when-empty). Spec:
 * design/specs/mobile/screens/edit-category.md.
 *
 * The modal owns the name field + client-side validation; the parent performs
 * the data mutations (and any retire/delete confirmation) and closes on success.
 */
export default function EditCategoryModal(props: {
  visible: boolean;
  mode: 'create' | 'edit';
  typeName: string;
  category?: CategoryRow;
  /** Other categories' names in this Type (lower-cased) — for uniqueness. */
  existingNames: string[];
  onCancel: () => void;
  onSave: (name: string) => Promise<void>;
  onToggleRetire?: () => void;
  onDelete?: () => void;
}) {
  const theme = useTheme();
  const t = useT();

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset whenever the modal opens (or targets a different category).
  useEffect(() => {
    if (props.visible) {
      setName(props.category?.name ?? '');
      setError(null);
      setSaving(false);
    }
  }, [props.visible, props.category?.id, props.category?.name]);

  const isEdit = props.mode === 'edit';
  const itemCount = props.category?.itemCount ?? 0;
  const canDelete = isEdit && itemCount === 0;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('editCategory.errorRequired'));
      return;
    }
    if (props.existingNames.includes(trimmed.toLowerCase())) {
      setError(t('editCategory.errorDuplicate', { type: props.typeName }));
      return;
    }
    setSaving(true);
    try {
      await props.onSave(trimmed);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setError(msg === 'duplicate-name' ? t('editCategory.errorDuplicate', { type: props.typeName }) : t('editCategory.saveError'));
      setSaving(false);
    }
  };

  return (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {isEdit ? t('editCategory.editTitle') : t('editCategory.addTitle')}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {t('editCategory.inType', { type: props.typeName })}
          </Text>

          <Text style={[styles.label, { color: theme.textSecondary }]}>{t('editCategory.nameLabel')}</Text>
          <TextInput
            value={name}
            onChangeText={(v) => {
              setName(v);
              if (error) setError(null);
            }}
            placeholder={t('editCategory.namePlaceholder')}
            placeholderTextColor={theme.textSecondary}
            autoFocus
            style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.background }]}
            onSubmitEditing={handleSave}
            returnKeyType="done"
          />
          {error ? <Text style={[styles.error, { color: theme.accentCondition ?? '#c0392b' }]}>{error}</Text> : null}

          {isEdit && props.category?.retired ? (
            <Text style={[styles.retiredNote, { color: theme.textSecondary }]}>{t('editCategory.retiredNote')}</Text>
          ) : null}

          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={props.onCancel} style={styles.btnGhost} disabled={saving}>
              <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.btnPrimary, { backgroundColor: theme.accentPrimary, opacity: saving ? 0.6 : 1 }]}
              disabled={saving}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>{t('editCategory.save')}</Text>
            </TouchableOpacity>
          </View>

          {isEdit ? (
            <View style={[styles.lifecycle, { borderTopColor: theme.border }]}>
              <TouchableOpacity onPress={props.onToggleRetire} style={styles.lifecycleBtn}>
                <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>
                  {props.category?.retired ? t('editCategory.restore') : t('editCategory.retire')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={canDelete ? props.onDelete : undefined} style={styles.lifecycleBtn} disabled={!canDelete}>
                <Text style={{ color: canDelete ? (theme.accentCondition ?? '#c0392b') : theme.textSecondary, fontWeight: '600' }}>
                  {canDelete ? t('editCategory.delete') : t('editCategory.deleteBlocked', { count: itemCount })}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: spacing[4] },
  card: { borderRadius: 14, borderWidth: 1, padding: spacing[4] },
  title: { ...typography.title },
  subtitle: { ...typography.small, marginTop: 2, marginBottom: spacing[3] },
  label: { ...typography.small, marginBottom: spacing[1] },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: spacing[2], paddingVertical: spacing[2], ...typography.body },
  error: { ...typography.small, marginTop: spacing[1] },
  retiredNote: { ...typography.small, marginTop: spacing[2] },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing[2], marginTop: spacing[3] },
  btnGhost: { paddingVertical: spacing[2], paddingHorizontal: spacing[3], borderRadius: 8 },
  btnPrimary: { paddingVertical: spacing[2], paddingHorizontal: spacing[4], borderRadius: 8 },
  lifecycle: { borderTopWidth: 1, marginTop: spacing[3], paddingTop: spacing[2], gap: spacing[1] },
  lifecycleBtn: { paddingVertical: spacing[2] },
});
