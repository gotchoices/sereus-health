/**
 * Thin, purpose-sized wrappers over the Vercel AI SDK.
 *
 * These intentionally expose only the subset the apps use. Keeping every call
 * here (rather than smeared across screens) means a future framework swap or
 * SDK-major migration is a rewrite of two files, not the whole codebase.
 */
import {
  generateText,
  streamText,
  stepCountIs,
  type ModelMessage,
  type ToolSet,
} from 'ai';
import { createChatModel, type ChatModelSpec } from './factory';

// Re-export the AI SDK primitives apps need to build requests and tools, so
// consumers go through the library rather than reaching into `ai` directly.
export { tool, jsonSchema, stepCountIs } from 'ai';
export type { ModelMessage, ToolSet } from 'ai';

export interface ChatParams extends ChatModelSpec {
  messages: ModelMessage[];
  system?: string;
  tools?: ToolSet;
  /**
   * Max agentic steps (tool-call → tool result → continue). Default 1, i.e. no
   * tool loop. Set > 1 when passing `tools` so the model can call a tool and
   * then produce a final answer from the result.
   */
  maxSteps?: number;
  /** Default retry behavior is the SDK's; pass 0 to fail fast (e.g. on quota errors). */
  maxRetries?: number;
  abortSignal?: AbortSignal;
}

/** One-shot generation. Resolves with the SDK's `generateText` result. */
export function chat(params: ChatParams) {
  const { messages, system, tools, maxSteps, maxRetries, abortSignal, ...spec } = params;
  return generateText({
    model: createChatModel(spec),
    system,
    messages,
    tools,
    stopWhen: stepCountIs(maxSteps ?? 1),
    maxRetries,
    abortSignal,
  });
}

/** Streaming generation. Returns the SDK's `streamText` result. */
export function streamChat(params: ChatParams) {
  const { messages, system, tools, maxSteps, maxRetries, abortSignal, ...spec } = params;
  return streamText({
    model: createChatModel(spec),
    system,
    messages,
    tools,
    stopWhen: stepCountIs(maxSteps ?? 1),
    maxRetries,
    abortSignal,
  });
}
