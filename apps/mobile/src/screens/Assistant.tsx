import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { spacing, typography, useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import { getEnabledApiKey, type ApiKeyEntry, type Provider } from '../data/apiKeys';

type Tab = 'home' | 'assistant' | 'catalog' | 'settings';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AssistantProps {
  onNavigateTab: (tab: Tab) => void;
  activeTab: Tab;
  onOpenApiKeys?: () => void;
  isConfigured?: boolean;
}

/**
 * Create an AI model instance based on the provider and API key
 */
function createModel(entry: ApiKeyEntry) {
  const modelName = entry.model || getDefaultModel(entry.provider);

  switch (entry.provider) {
    case 'openai': {
      const openai = createOpenAI({ apiKey: entry.apiKey });
      return openai(modelName);
    }
    case 'anthropic': {
      const anthropic = createAnthropic({ apiKey: entry.apiKey });
      return anthropic(modelName);
    }
    case 'google': {
      const google = createGoogleGenerativeAI({ apiKey: entry.apiKey });
      return google(modelName);
    }
    default:
      throw new Error(`Unknown provider: ${entry.provider}`);
  }
}

function getDefaultModel(provider: Provider): string {
  switch (provider) {
    case 'openai':
      return 'gpt-4o-mini';
    case 'anthropic':
      return 'claude-3-5-sonnet-20241022';
    case 'google':
      return 'gemini-1.5-flash';
    default:
      return 'gpt-4o-mini';
  }
}

export default function Assistant(props: AssistantProps) {
  const theme = useTheme();
  const t = useT();
  const scrollViewRef = useRef<ScrollView>(null);

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = props.isConfigured ?? false;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSetup = () => {
    if (props.onOpenApiKeys) {
      props.onOpenApiKeys();
    }
  };

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    setInputText('');
    setError(null);

    // Add user message
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Get enabled API key
      const apiKey = await getEnabledApiKey();
      if (!apiKey) {
        throw new Error('No API key configured');
      }

      // Create model and generate response
      const model = createModel(apiKey);

      // Build messages for the API (include conversation history)
      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const result = await generateText({
        model,
        messages: apiMessages,
      });

      // Add assistant response
      const assistantMessage: Message = {
        id: `msg-${Date.now()}-response`,
        role: 'assistant',
        content: result.text,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Assistant] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get response');
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, messages]);

  const handleClear = () => {
    setMessages([]);
    setError(null);
  };

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    return (
      <View
        key={message.id}
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          {
            backgroundColor: isUser ? theme.accentPrimary : theme.surface,
            borderColor: isUser ? theme.accentPrimary : theme.border,
          },
        ]}
      >
        <Text
          style={[
            styles.messageText,
            { color: isUser ? '#fff' : theme.textPrimary },
          ]}
        >
          {message.content}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          {t('assistant.title')}
        </Text>
        {isConfigured && messages.length > 0 && (
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
          <ScrollView
            ref={scrollViewRef}
            style={styles.conversation}
            contentContainerStyle={styles.conversationContent}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyConversation}>
                <Ionicons name="chatbubbles-outline" size={48} color={theme.textSecondary} />
                <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: spacing[2] }}>
                  {t('assistant.inputPlaceholder')}
                </Text>
              </View>
            ) : (
              messages.map(renderMessage)
            )}

            {isLoading && (
              <View style={[styles.loadingBubble, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <ActivityIndicator size="small" color={theme.accentPrimary} />
                <Text style={{ color: theme.textSecondary, marginLeft: spacing[2] }}>Thinking...</Text>
              </View>
            )}

            {error && (
              <View style={[styles.errorBubble, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
                <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
                <Text style={{ color: '#dc2626', marginLeft: spacing[1], flex: 1 }}>{error}</Text>
              </View>
            )}
          </ScrollView>

          {/* Prompt bar */}
          <View style={[styles.promptBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder={t('assistant.inputPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.background }]}
              multiline
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: inputText.trim() && !isLoading ? theme.accentPrimary : theme.border }]}
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
            >
              <Ionicons name="send" size={18} color={inputText.trim() && !isLoading ? '#fff' : theme.textSecondary} />
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
  conversationContent: {
    padding: spacing[3],
    gap: spacing[2],
  },
  emptyConversation: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[6],
  },
  messageBubble: {
    maxWidth: '85%',
    padding: spacing[3],
    borderRadius: 16,
    borderWidth: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    ...typography.body,
  },
  loadingBubble: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: 16,
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  errorBubble: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[2],
    borderRadius: 8,
    borderWidth: 1,
  },
  promptBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing[2],
    gap: spacing[2],
    borderTopWidth: 1,
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
