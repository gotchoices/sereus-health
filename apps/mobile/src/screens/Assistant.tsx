import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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

type Tab = 'home' | 'assistant' | 'catalog' | 'settings';

interface AssistantProps {
  onNavigateTab: (tab: Tab) => void;
  activeTab: Tab;
  onOpenApiKeys?: () => void;
  isConfigured?: boolean; // Whether an API key is enabled
}

export default function Assistant(props: AssistantProps) {
  const theme = useTheme();
  const t = useT();
  const [inputText, setInputText] = useState('');

  // For now, treat as not configured (stub)
  const isConfigured = props.isConfigured ?? false;

  const handleSetup = () => {
    if (props.onOpenApiKeys) {
      props.onOpenApiKeys();
    }
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    // TODO: Implement AI call
    setInputText('');
  };

  const handleClear = () => {
    // TODO: Clear conversation
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          {t('assistant.title')}
        </Text>
        {isConfigured && (
          <TouchableOpacity onPress={handleClear} style={styles.headerIcon} hitSlop={HIT_SLOP}>
            <Ionicons name="trash-outline" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {!isConfigured ? (
        // Not configured state
        <View style={styles.center}>
          <Ionicons name="sparkles-outline" size={48} color={theme.textSecondary} />
          <Text style={[styles.notConfiguredTitle, { color: theme.textPrimary }]}>
            {t('assistant.notConfiguredTitle')}
          </Text>
          <Text style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: spacing[3] }}>
            {t('assistant.notConfiguredMessage')}
          </Text>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: theme.accentPrimary }]}
            onPress={handleSetup}
          >
            <Text style={styles.ctaButtonText}>{t('assistant.setupButton')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Configured state - conversation UI
        <KeyboardAvoidingView
          style={styles.conversationContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={100}
        >
          {/* Conversation area */}
          <ScrollView style={styles.conversation} contentContainerStyle={{ padding: spacing[3] }}>
            <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>
              Start a conversation...
            </Text>
          </ScrollView>

          {/* Prompt bar */}
          <View style={[styles.promptBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
            <TouchableOpacity style={styles.attachButton} hitSlop={HIT_SLOP}>
              <Ionicons name="attach-outline" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder={t('assistant.inputPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.background }]}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: inputText.trim() ? theme.accentPrimary : theme.border }]}
              onPress={handleSend}
              disabled={!inputText.trim()}
            >
              <Ionicons name="send" size={18} color={inputText.trim() ? '#fff' : theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Bottom tab bar (4 tabs per navigation.md: Home, Assistant, Catalog, Settings) */}
      <View style={[styles.tabBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TouchableOpacity style={styles.tab} onPress={() => props.onNavigateTab('home')}>
          <Ionicons
            name={props.activeTab === 'home' ? 'home' : 'home-outline'}
            size={20}
            color={props.activeTab === 'home' ? theme.accentPrimary : theme.textSecondary}
          />
          <Text style={[styles.tabLabel, { color: props.activeTab === 'home' ? theme.accentPrimary : theme.textSecondary }]}>
            {t('navigation.home')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tab} onPress={() => props.onNavigateTab('assistant')}>
          <Ionicons
            name={props.activeTab === 'assistant' ? 'sparkles' : 'sparkles-outline'}
            size={20}
            color={props.activeTab === 'assistant' ? theme.accentPrimary : theme.textSecondary}
          />
          <Text style={[styles.tabLabel, { color: props.activeTab === 'assistant' ? theme.accentPrimary : theme.textSecondary }]}>
            {t('navigation.assistant')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tab} onPress={() => props.onNavigateTab('catalog')}>
          <Ionicons
            name={props.activeTab === 'catalog' ? 'list' : 'list-outline'}
            size={20}
            color={props.activeTab === 'catalog' ? theme.accentPrimary : theme.textSecondary}
          />
          <Text style={[styles.tabLabel, { color: props.activeTab === 'catalog' ? theme.accentPrimary : theme.textSecondary }]}>
            {t('navigation.catalog')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tab} onPress={() => props.onNavigateTab('settings')}>
          <Ionicons
            name={props.activeTab === 'settings' ? 'settings' : 'settings-outline'}
            size={20}
            color={props.activeTab === 'settings' ? theme.accentPrimary : theme.textSecondary}
          />
          <Text style={[styles.tabLabel, { color: props.activeTab === 'settings' ? theme.accentPrimary : theme.textSecondary }]}>
            {t('navigation.settings')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    ...typography.title,
  },
  headerIcon: {
    paddingHorizontal: spacing[1],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
    gap: spacing[2],
  },
  notConfiguredTitle: {
    ...typography.title,
    marginTop: spacing[2],
  },
  ctaButton: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: 8,
  },
  ctaButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  conversationContainer: {
    flex: 1,
  },
  conversation: {
    flex: 1,
  },
  promptBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing[2],
    gap: spacing[2],
    borderTopWidth: 1,
  },
  attachButton: {
    paddingVertical: spacing[1],
  },
  input: {
    flex: 1,
    ...typography.body,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: 20,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing[2],
  },
  tab: {
    alignItems: 'center',
    gap: 4,
  },
  tabLabel: {
    ...typography.small,
  },
});

