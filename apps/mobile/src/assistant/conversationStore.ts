/**
 * In-memory conversation state that OUTLIVES the Assistant screen.
 *
 * App.tsx renders one screen at a time, so switching tabs unmounts <Assistant>
 * and would otherwise wipe the chat. Keeping the conversation here lets it
 * survive tab switches; it is cleared only by the user (trash icon).
 *
 * Not persisted across app restarts: modelMessages can hold large image bytes,
 * which need a size-aware persistence layer (a future step).
 */
import type { ModelMessage } from '@serfab/ai-models/chat';
import type { ActionPlan } from './actionPlan';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Name of a file attached to this (user) message, shown as a chip. */
  attachmentName?: string;
}

export interface PendingPlan {
  plan: ActionPlan;
  selected: Set<string>;
  /** The open propose_plan tool call this plan answers. */
  toolCallId: string;
}

export const conversationStore: {
  /** Human-facing transcript. */
  messages: Message[];
  /** Model-facing history (text + tool calls/results). Mutated in place. */
  modelMessages: ModelMessage[];
  pendingPlan: PendingPlan | null;
} = {
  messages: [],
  modelMessages: [],
  pendingPlan: null,
};

/** Reset the conversation. Truncates modelMessages in place so held refs stay valid. */
export function clearConversation(): void {
  conversationStore.messages = [];
  conversationStore.modelMessages.length = 0;
  conversationStore.pendingPlan = null;
}
