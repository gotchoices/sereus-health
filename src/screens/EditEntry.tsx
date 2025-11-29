import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { getEditEntryMock, EditEntryModel } from '../data/editEntry';
import { useT } from '../i18n/useT';

type Props = {
  navigation?: any;
  route?: {
    params?: {
      mode?: 'new' | 'edit' | 'clone';
      entryId?: string;
    };
  };
};

export const EditEntry: React.FC<Props> = ({ navigation, route }) => {
  const t = useT();
  const mode = route?.params?.mode ?? 'new';
  const entryId = route?.params?.entryId;

  const [model, setModel] = useState<EditEntryModel>(
    getEditEntryMock(mode, entryId, 'happy'),
  );

  const updateField = <K extends keyof EditEntryModel>(
    key: K,
    value: EditEntryModel[K],
  ) => {
    setModel((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    // For now, just go back if navigation is available.
    navigation?.goBack?.();
  };

  const handleCancel = () => {
    navigation?.goBack?.();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>
          {mode === 'new'
            ? t('editEntry.header.new')
            : mode === 'clone'
            ? t('editEntry.header.clone')
            : t('editEntry.header.edit')}
        </Text>

        <Text style={styles.label}>{t('editEntry.label.type')}</Text>
        <TextInput
          style={styles.input}
          value={model.type}
          onChangeText={(text) => updateField('type', text)}
          placeholder={t('editEntry.placeholder.type')}
          placeholderTextColor="#6b7280"
        />

        <Text style={styles.label}>{t('editEntry.label.title')}</Text>
        <TextInput
          style={styles.input}
          value={model.title}
          onChangeText={(text) => updateField('title', text)}
          placeholder={t('editEntry.placeholder.title')}
          placeholderTextColor="#6b7280"
        />

        <Text style={styles.label}>{t('editEntry.label.timestamp')}</Text>
        <Text style={styles.helpText}>
          {new Date(model.timestamp).toLocaleString()}
        </Text>

        <Text style={styles.label}>{t('editEntry.label.comment')}</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={model.comment}
          onChangeText={(text) => updateField('comment', text)}
          placeholder={t('editEntry.placeholder.comment')}
          placeholderTextColor="#6b7280"
          multiline
        />

        {/* Quantifiers section (simple text for now, detailed editor can come later) */}
        {model.quantifiers.length > 0 && (
          <>
            <Text style={styles.label}>{t('editEntry.label.quantifiers')}</Text>
            {model.quantifiers.map((q) => (
              <Text key={q.label} style={styles.helpText}>
                {q.label}: {q.value}
                {q.units ? ` ${q.units}` : ''}
              </Text>
            ))}
          </>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleCancel}>
            <Text style={styles.secondaryButtonText}>
              {t('editEntry.button.cancel')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSave}>
            <Text style={styles.primaryButtonText}>
              {t('editEntry.button.save')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0c10',
  },
  content: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  header: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
  label: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 16,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#e5e7eb',
    fontSize: 14,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helpText: {
    color: '#9ca3af',
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 12,
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  secondaryButtonText: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#1f6feb',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default EditEntry;


