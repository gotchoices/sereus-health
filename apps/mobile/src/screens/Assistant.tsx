import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import { resolveModel, type CacheStore, type CapabilityKey } from '@serfab/ai-models';
import { chat, type ModelMessage } from '@serfab/ai-models/chat';
import { spacing, typography, useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';
import { getEnabledApiKey } from '../data/apiKeys';
import { buildSystemPrompt } from '../assistant/systemPrompt';
import { assistantTools, PROPOSE_PLAN_TOOL } from '../assistant/tools';
import { pickAttachment, captureFromCamera, type Attachment } from '../assistant/attachment';
import { parseActionPlan, type ActionPlan } from '../assistant/actionPlan';
import { executePlan, summarizeExecution } from '../assistant/executor';
import ActionPlanCard from '../assistant/ActionPlanCard';
import {
  conversationStore,
  clearConversation,
  type Message,
  type PendingPlan,
} from '../assistant/conversationStore';

type Tab = 'home' | 'assistant' | 'catalog' | 'settings';

interface AssistantProps {
  onNavigateTab: (tab: Tab) => void;
  activeTab: Tab;
  onOpenApiKeys?: () => void;
  isConfigured?: boolean;
}

/**
 * models.dev catalog cache, backed by AsyncStorage. Lets @serfab/ai-models
 * cache the model catalog across launches instead of refetching each turn.
 */
const modelCache: CacheStore = {
  get: (key) => AsyncStorage.getItem(key),
  set: (key, value) => AsyncStorage.setItem(key, value),
};

/** Per-turn session context for the system prompt (locale/timezone are best-effort). */
function sessionContext() {
  let locale: string | undefined;
  let timeZone: string | undefined;
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions();
    locale = resolved.locale;
    timeZone = resolved.timeZone;
  } catch {
    // Intl may be unavailable/partial on some Hermes builds — omit gracefully.
  }
  return {
    screen: 'Assistant',
    nowUtc: new Date().toISOString(),
    locale,
    timeZone,
  };
}

/**
 * A tool-result message answering an open `propose_plan` call. Every tool call
 * must be answered before the next turn, so this is appended to history on
 * disposition (superseded / dismissed / executed) — carrying the outcome so the
 * model can revise or confirm accordingly.
 */
function planToolResult(toolCallId: string, value: Record<string, unknown>): ModelMessage {
  return {
    role: 'tool',
    content: [
      {
        type: 'tool-result',
        toolCallId,
        toolName: PROPOSE_PLAN_TOOL,
        output: { type: 'text', value: JSON.stringify(value) },
      },
    ],
  };
}

/** Build the user turn's ModelMessage, multimodal when an attachment is present. */
function userModelMessage(text: string, att: Attachment | null): ModelMessage {
  if (!att) return { role: 'user', content: text };
  // Pass raw bytes, not a base64/data-URI string. The AI SDK treats any string as
  // a URL and tries to fetch it — and RN's fetch can't handle data: URLs, so it
  // fails with AI_DownloadError. A Uint8Array (Buffer) is used directly.
  const bytes = Buffer.from(att.base64, 'base64');
  const media =
    att.kind === 'image'
      ? { type: 'image' as const, image: bytes, mediaType: att.mediaType }
      : { type: 'file' as const, data: bytes, mediaType: att.mediaType, filename: att.name };
  return { role: 'user', content: text ? [{ type: 'text' as const, text }, media] : [media] };
}

export default function Assistant(props: AssistantProps) {
  const theme = useTheme();
  const t = useT();
  const scrollViewRef = useRef<ScrollView>(null);
  // The real conversation sent to the model — includes tool calls/results so the
  // model remembers prior plans (enables conversational revision). The display
  // `messages` list is a separate, human-facing projection. Both live in a module
  // store so they survive this screen unmounting on a tab switch.
  const modelMessagesRef = useRef<ModelMessage[]>(conversationStore.modelMessages);

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => conversationStore.messages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingPlan, setPendingPlan] = useState<PendingPlan | null>(
    () => conversationStore.pendingPlan,
  );

  // Mirror the display state back into the store so it persists across tab switches.
  useEffect(() => {
    conversationStore.messages = messages;
  }, [messages]);
  useEffect(() => {
    conversationStore.pendingPlan = pendingPlan;
  }, [pendingPlan]);

  const [planBusy, setPlanBusy] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);

  const addAttachment = useCallback(async (source: () => Promise<Attachment | null>) => {
    try {
      const att = await source();
      if (att) {
        setAttachment(att);
        setError(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add that attachment.');
    }
  }, []);

  const handleAttach = useCallback(() => {
    if (isLoading) return;
    Alert.alert('Add an image or file', undefined, [
      { text: 'Take Photo', onPress: () => addAttachment(captureFromCamera) },
      { text: 'Choose File', onPress: () => addAttachment(pickAttachment) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [isLoading, addAttachment]);

  const togglePlanAction = useCallback((actionId: string) => {
    setPendingPlan((prev) => {
      if (!prev) return prev;
      const selected = new Set(prev.selected);
      if (selected.has(actionId)) selected.delete(actionId);
      else selected.add(actionId);
      return { ...prev, selected };
    });
  }, []);

  const approvePlan = useCallback(async () => {
    if (!pendingPlan || planBusy) return;
    const { plan, selected, toolCallId } = pendingPlan;
    setPlanBusy(true);
    setError(null);
    try {
      const exec = await executePlan(plan, selected);
      // Feed the outcome back to the model (answers the open tool call) so it has
      // context if the conversation continues.
      modelMessagesRef.current.push(
        planToolResult(toolCallId, {
          status: exec.ok ? 'approved_and_executed' : 'execution_failed',
          error: exec.error,
          results: exec.results.map((r) => ({ title: r.title, status: r.status, detail: r.detail })),
        }),
      );
      setPendingPlan(null);
      // App-generated confirmation (deterministic, no extra model call).
      setMessages((prev) => [
        ...prev,
        { id: `msg-${Date.now()}-exec`, role: 'assistant', content: summarizeExecution(exec) },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to apply the plan.');
    } finally {
      setPlanBusy(false);
    }
  }, [pendingPlan, planBusy]);

  const isConfigured = props.isConfigured ?? false;
  const canSend = (!!inputText.trim() || !!attachment) && !isLoading;

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
    const att = attachment;
    if ((!text && !att) || isLoading) return;

    setInputText('');
    setAttachment(null);
    setError(null);
    setNotice(null);

    const history = modelMessagesRef.current;
    // If a plan was pending, its propose_plan tool call is still open. Answer it
    // (superseded by a new prompt) before continuing — providers require every
    // tool call to be resolved, and this hands the model the prior plan +
    // selection so it can revise instead of starting over.
    if (pendingPlan) {
      history.push(
        planToolResult(pendingPlan.toolCallId, {
          status: 'superseded_by_new_prompt',
          selectedActionIds: [...pendingPlan.selected],
          note: 'The user sent a new message instead of approving. If it refines the plan, re-propose a revised plan, keeping stable actionIds for unchanged actions.',
        }),
      );
      setPendingPlan(null);
    }
    history.push(userModelMessage(text, att));

    // Add user message (display)
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      attachmentName: att?.name,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Get enabled API key
      const entry = await getEnabledApiKey();
      if (!entry) {
        throw new Error('No API key configured');
      }
      const cred = { provider: entry.provider, apiKey: entry.apiKey };

      // Resolve a model this key can actually call: honor the user's explicit
      // choice if set, otherwise auto-pick a valid default (@serfab/ai-models).
      // The assistant relies on tool-calling; an attachment additionally needs a
      // vision- or pdf-capable model.
      const require: CapabilityKey[] = ['tools'];
      if (att) require.push(att.kind === 'image' ? 'vision' : 'pdf');
      const resolved = await resolveModel(cred, {
        model: entry.model || undefined,
        require,
        cache: modelCache,
      });
      if (!resolved.id) {
        throw new Error(resolved.warning ?? 'No suitable model available for this provider.');
      }
      if (resolved.warning) {
        setNotice(resolved.warning);
      }

      const result = await chat({
        ...cred,
        modelId: resolved.id,
        system: buildSystemPrompt(sessionContext()),
        messages: history,
        tools: assistantTools,
        // Allow: model → db_query → tool result → final answer (a few rounds).
        maxSteps: 6,
      });

      // Thread the model's turn (text + tool calls + executed tool results) into history.
      history.push(...result.response.messages);

      // Capture a proposed action plan, if the model called propose_plan.
      const planCall = result.toolCalls.find((c) => c.toolName === PROPOSE_PLAN_TOOL);
      const plan = planCall ? parseActionPlan(planCall.input) : null;
      if (planCall && plan) {
        setPendingPlan({
          plan,
          selected: new Set(plan.actions.map((a) => a.actionId)),
          toolCallId: planCall.toolCallId,
        });
      } else if (planCall && !plan) {
        // Malformed plan: the tool call is still open, so answer it to keep history valid.
        history.push(
          planToolResult(planCall.toolCallId, {
            status: 'error',
            note: 'The proposed plan was malformed and could not be used. Please re-propose.',
          }),
        );
        setNotice('The assistant proposed an invalid plan. Please try rephrasing.');
      }

      // Add the assistant's text reply (may be empty when it ends on a tool call).
      const replyText = result.text?.trim();
      if (replyText) {
        const assistantMessage: Message = {
          id: `msg-${Date.now()}-response`,
          role: 'assistant',
          content: replyText,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else if (!plan) {
        // Nothing came back at all — surface a soft notice rather than a blank bubble.
        setNotice('The assistant did not return a response. Please try rephrasing.');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Assistant] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get response');
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, pendingPlan, attachment]);

  const dismissPlan = useCallback(() => {
    if (pendingPlan) {
      // Answer the open tool call so future turns stay valid.
      modelMessagesRef.current.push(
        planToolResult(pendingPlan.toolCallId, {
          status: 'dismissed_by_user',
          note: 'The user dismissed this plan without approving.',
        }),
      );
    }
    setPendingPlan(null);
  }, [pendingPlan]);

  const handleClear = () => {
    setMessages([]);
    setError(null);
    setNotice(null);
    setPendingPlan(null);
    clearConversation(); // truncates modelMessages in place (ref stays valid)
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
        {message.attachmentName && (
          <View style={styles.attachmentChipInline}>
            <Ionicons name="document-attach" size={14} color={isUser ? '#fff' : theme.textSecondary} />
            <Text style={{ color: isUser ? '#fff' : theme.textSecondary, marginLeft: 4, fontSize: 12 }}>
              {message.attachmentName}
            </Text>
          </View>
        )}
        {!!message.content && (
          <Text
            style={[
              styles.messageText,
              { color: isUser ? '#fff' : theme.textPrimary },
            ]}
          >
            {message.content}
          </Text>
        )}
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
            {messages.length === 0 && !pendingPlan ? (
              <View style={styles.emptyConversation}>
                <Ionicons name="chatbubbles-outline" size={48} color={theme.textSecondary} />
                <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: spacing[2] }}>
                  {t('assistant.inputPlaceholder')}
                </Text>
              </View>
            ) : (
              messages.map(renderMessage)
            )}

            {pendingPlan && (
              <ActionPlanCard
                plan={pendingPlan.plan}
                selected={pendingPlan.selected}
                onToggle={togglePlanAction}
                onDismiss={dismissPlan}
                onApprove={approvePlan}
                busy={planBusy}
              />
            )}

            {isLoading && (
              <View style={[styles.loadingBubble, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <ActivityIndicator size="small" color={theme.accentPrimary} />
                <Text style={{ color: theme.textSecondary, marginLeft: spacing[2] }}>Thinking...</Text>
              </View>
            )}

            {notice && (
              <View style={[styles.errorBubble, { backgroundColor: '#fef9c3', borderColor: '#fde047' }]}>
                <Ionicons name="information-circle-outline" size={16} color="#a16207" />
                <Text style={{ color: '#a16207', marginLeft: spacing[1], flex: 1 }}>{notice}</Text>
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
          <View style={[styles.promptBarWrap, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
            {attachment && (
              <View style={[styles.attachmentPending, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Ionicons
                  name={attachment.kind === 'image' ? 'image' : 'document-text'}
                  size={16}
                  color={theme.accentPrimary}
                />
                <Text style={{ color: theme.textPrimary, marginLeft: spacing[1], flex: 1 }} numberOfLines={1}>
                  {attachment.name}
                </Text>
                <TouchableOpacity onPress={() => setAttachment(null)} hitSlop={HIT_SLOP}>
                  <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.promptBarRow}>
              <TouchableOpacity onPress={handleAttach} disabled={isLoading} style={styles.attachButton} hitSlop={HIT_SLOP}>
                <Ionicons name="add-circle-outline" size={26} color={isLoading ? theme.border : theme.textSecondary} />
              </TouchableOpacity>
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
                style={[styles.sendButton, { backgroundColor: canSend ? theme.accentPrimary : theme.border }]}
                onPress={handleSend}
                disabled={!canSend}
              >
                <Ionicons name="send" size={18} color={canSend ? '#fff' : theme.textSecondary} />
              </TouchableOpacity>
            </View>
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
    paddingVertical: spacing[5],
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
  promptBarWrap: {
    padding: spacing[2],
    gap: spacing[2],
    borderTopWidth: 1,
  },
  promptBarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[2],
  },
  attachButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentPending: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: 8,
    borderWidth: 1,
  },
  attachmentChipInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[1],
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
