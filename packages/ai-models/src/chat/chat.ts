/**
 * Thin, purpose-sized wrappers over the Vercel AI SDK.
 *
 * These intentionally expose only the subset the apps use. Keeping every call
 * here (rather than smeared across screens) means a future framework swap or
 * SDK-major migration is a rewrite of two files, not the whole codebase.
 */
import { generateText, streamText, type ModelMessage, type ToolSet } from 'ai';
import { createChatModel, type ChatModelSpec } from './factory';

export interface ChatParams extends ChatModelSpec {
  messages: ModelMessage[];
  system?: string;
  tools?: ToolSet;
  /** Default retry behavior is the SDK's; pass 0 to fail fast (e.g. on quota errors). */
  maxRetries?: number;
  abortSignal?: AbortSignal;
}

/** One-shot generation. Resolves with the SDK's `generateText` result. */
export function chat(params: ChatParams) {
  const { messages, system, tools, maxRetries, abortSignal, ...spec } = params;
  return generateText({
    model: createChatModel(spec),
    system,
    messages,
    tools,
    maxRetries,
    abortSignal,
  });
}

/** Streaming generation. Returns the SDK's `streamText` result. */
export function streamChat(params: ChatParams) {
  const { messages, system, tools, maxRetries, abortSignal, ...spec } = params;
  return streamText({
    model: createChatModel(spec),
    system,
    messages,
    tools,
    maxRetries,
    abortSignal,
  });
}
