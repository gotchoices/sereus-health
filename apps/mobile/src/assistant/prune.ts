/**
 * Auto-prune the model-facing conversation to a token budget.
 *
 * Drops whole oldest turns (a user message and everything up to the next user
 * message) until the history fits the budget, mutating in place so held refs stay
 * valid. The human-facing transcript is not touched — only what's sent to the
 * model — so the user still sees the full conversation while the model's context
 * is windowed. `maxTokens <= 0` means unlimited.
 */
import type { ModelMessage } from '@serfab/ai-models/chat';

const CHARS_PER_TOKEN = 4; // rough estimate

export function pruneToTokenBudget(messages: ModelMessage[], maxTokens: number): number {
  if (maxTokens <= 0) return 0;
  const budgetChars = maxTokens * CHARS_PER_TOKEN;
  let removed = 0;
  while (messages.length > 0 && JSON.stringify(messages).length > budgetChars) {
    // Remove the first turn: index 0 up to (not including) the next user message.
    let cut = 1;
    while (cut < messages.length && messages[cut].role !== 'user') cut++;
    messages.splice(0, cut);
    removed += cut;
  }
  return removed;
}
