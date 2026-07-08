/**
 * Persist the assistant conversation across app runs.
 *
 * The history now holds only text + reference markers (no attachment bytes — those
 * live on disk in the attachment store and survive restart on their own), so it's
 * small and JSON-serializable. We use AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { conversationStore } from './conversationStore';

const KEY = '@sereus/assistant-conversation:v1';

interface Serialized {
  messages: typeof conversationStore.messages;
  modelMessages: typeof conversationStore.modelMessages;
  pendingPlan: {
    plan: NonNullable<typeof conversationStore.pendingPlan>['plan'];
    selected: string[];
    toolCallId: string;
  } | null;
}

/** Write the current conversation to storage (best-effort). */
export async function persistConversation(): Promise<void> {
  const { messages, modelMessages, pendingPlan } = conversationStore;
  const data: Serialized = {
    messages,
    modelMessages,
    pendingPlan: pendingPlan
      ? { plan: pendingPlan.plan, selected: [...pendingPlan.selected], toolCallId: pendingPlan.toolCallId }
      : null,
  };
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* best-effort */
  }
}

let hydrated: Promise<boolean> | null = null;

/** Load the persisted conversation into the store, once per app run. */
export function hydrateConversation(): Promise<boolean> {
  if (!hydrated) {
    hydrated = (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (!raw) return false;
        const data = JSON.parse(raw) as Serialized;
        conversationStore.messages = data.messages ?? [];
        // Mutate modelMessages in place so existing refs stay valid.
        conversationStore.modelMessages.length = 0;
        conversationStore.modelMessages.push(...(data.modelMessages ?? []));
        conversationStore.pendingPlan = data.pendingPlan
          ? {
              plan: data.pendingPlan.plan,
              selected: new Set(data.pendingPlan.selected),
              toolCallId: data.pendingPlan.toolCallId,
            }
          : null;
        return true;
      } catch {
        return false;
      }
    })();
  }
  return hydrated;
}

/** Remove the persisted conversation (on user clear). */
export async function clearPersistedConversation(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* best-effort */
  }
}
