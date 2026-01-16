import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { spacing, typography, useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';

// TODO: Replace AsyncStorage with react-native-keychain for secure storage
const STORAGE_KEY = '@sereus/api-keys';

type Provider = 'openai' | 'anthropic' | 'google';

interface ApiKeyEntry {
  id: string;
  provider: Provider;
  model: string;
  apiKey: string;
  enabled: boolean;
}

interface ApiKeysProps {
  onBack: () => void;
}

const PROVIDERS: { value: Provider; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
];

export default function ApiKeys(props: ApiKeysProps) {
  const theme = useTheme();
  const t = useT();
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  // Load keys from storage
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!alive) return;
        if (raw) {
          try {
            setKeys(JSON.parse(raw));
          } catch {
            setKeys([]);
          }
        }
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Save keys to storage
  const saveKeys = useCallback(async (newKeys: ApiKeyEntry[]) => {
    setKeys(newKeys);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newKeys));
  }, []);

  const handleAdd = () => {
    const newEntry: ApiKeyEntry = {
      id: `key-${Date.now()}`,
      provider: 'openai',
      model: '',
      apiKey: '',
      enabled: keys.length === 0, // Enable first key by default
    };
    saveKeys([...keys, newEntry]);
  };

  const handleDelete = (id: string) => {
    Alert.alert(t('apiKeys.deleteTitle'), t('apiKeys.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          const newKeys = keys.filter((k) => k.id !== id);
          // If we deleted the enabled key, enable the first remaining one
          if (newKeys.length > 0 && !newKeys.some((k) => k.enabled)) {
            newKeys[0].enabled = true;
          }
          saveKeys(newKeys);
        },
      },
    ]);
  };

  const handleToggleEnabled = (id: string) => {
    const newKeys = keys.map((k) => ({
      ...k,
      enabled: k.id === id,
    }));
    saveKeys(newKeys);
  };

  const handleUpdateProvider = (id: string, provider: Provider) => {
    const newKeys = keys.map((k) => (k.id === id ? { ...k, provider } : k));
    saveKeys(newKeys);
  };

  const handleUpdateModel = (id: string, model: string) => {
    const newKeys = keys.map((k) => (k.id === id ? { ...k, model } : k));
    saveKeys(newKeys);
  };

  const handleUpdateApiKey = (id: string, apiKey: string) => {
    const newKeys = keys.map((k) => (k.id === id ? { ...k, apiKey } : k));
    saveKeys(newKeys);
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderKeyRow = ({ item }: { item: ApiKeyEntry }) => (
    <View style={[styles.keyRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {/* Radio button */}
      <TouchableOpacity
        style={styles.radioContainer}
        onPress={() => handleToggleEnabled(item.id)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <View
          style={[
            styles.radio,
            { borderColor: item.enabled ? theme.accentPrimary : theme.border },
          ]}
        >
          {item.enabled && (
            <View style={[styles.radioInner, { backgroundColor: theme.accentPrimary }]} />
          )}
        </View>
      </TouchableOpacity>

      {/* Fields */}
      <View style={styles.fieldsContainer}>
        {/* Provider selector */}
        <View style={styles.fieldRow}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            {t('apiKeys.provider')}
          </Text>
          <View style={styles.providerRow}>
            {PROVIDERS.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.providerChip,
                  {
                    backgroundColor: item.provider === p.value ? theme.accentPrimary : 'transparent',
                    borderColor: item.provider === p.value ? theme.accentPrimary : theme.border,
                  },
                ]}
                onPress={() => handleUpdateProvider(item.id, p.value)}
              >
                <Text
                  style={{
                    color: item.provider === p.value ? '#fff' : theme.textPrimary,
                    fontSize: 12,
                    fontWeight: '600',
                  }}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Model input */}
        <View style={styles.fieldRow}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            {t('apiKeys.model')}
          </Text>
          <TextInput
            value={item.model}
            onChangeText={(text) => handleUpdateModel(item.id, text)}
            placeholder="e.g., gpt-4o"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
          />
        </View>

        {/* API key input */}
        <View style={styles.fieldRow}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            {t('apiKeys.apiKey')}
          </Text>
          <View style={styles.apiKeyInputRow}>
            <TextInput
              value={item.apiKey}
              onChangeText={(text) => handleUpdateApiKey(item.id, text)}
              placeholder="sk-..."
              placeholderTextColor={theme.textSecondary}
              secureTextEntry={!visibleKeys.has(item.id)}
              style={[styles.input, styles.apiKeyInput, { color: theme.textPrimary, borderColor: theme.border }]}
            />
            <TouchableOpacity
              style={styles.visibilityButton}
              onPress={() => toggleKeyVisibility(item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={visibleKeys.has(item.id) ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Delete button */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item.id)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="trash-outline" size={20} color={theme.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={props.onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          {t('apiKeys.title')}
        </Text>
        <TouchableOpacity onPress={handleAdd} style={styles.addButton}>
          <Ionicons name="add-circle" size={28} color={theme.accentPrimary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <Text style={{ color: theme.textSecondary }}>{t('common.loading')}</Text>
        </View>
      ) : keys.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="key-outline" size={48} color={theme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
            {t('apiKeys.emptyTitle')}
          </Text>
          <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>
            {t('apiKeys.emptyMessage')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={keys}
          keyExtractor={(k) => k.id}
          renderItem={renderKeyRow}
          contentContainerStyle={{ padding: spacing[3] }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: spacing[1],
  },
  headerTitle: {
    ...typography.title,
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: spacing[1],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
    gap: spacing[2],
  },
  emptyTitle: {
    ...typography.title,
    marginTop: spacing[2],
  },
  keyRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing[3],
    marginBottom: spacing[2],
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  radioContainer: {
    paddingTop: spacing[1],
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  fieldsContainer: {
    flex: 1,
    gap: spacing[2],
  },
  fieldRow: {
    gap: spacing[1],
  },
  fieldLabel: {
    ...typography.small,
    fontWeight: '600',
  },
  providerRow: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  providerChip: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: 999,
    borderWidth: 1,
  },
  input: {
    ...typography.body,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  apiKeyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  apiKeyInput: {
    flex: 1,
  },
  visibilityButton: {
    padding: spacing[1],
  },
  deleteButton: {
    paddingTop: spacing[1],
  },
});

