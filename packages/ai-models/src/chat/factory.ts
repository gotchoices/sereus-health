/**
 * The ONE place the Vercel AI SDK is instantiated per provider.
 *
 * This is the swap seam: to change frameworks or absorb an AI SDK major-version
 * change, edit this file (and ./chat) — nothing else in the package, and nothing
 * in consuming apps, imports `@ai-sdk/*` directly.
 */
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';
import type { Provider } from '../types';

export interface ChatModelSpec {
  provider: Provider;
  apiKey: string;
  modelId: string;
}

/** Build a Vercel AI SDK `LanguageModel` for a provider + key + model id. */
export function createChatModel(spec: ChatModelSpec): LanguageModel {
  switch (spec.provider) {
    case 'openai':
      return createOpenAI({ apiKey: spec.apiKey })(spec.modelId);
    case 'anthropic':
      return createAnthropic({ apiKey: spec.apiKey })(spec.modelId);
    case 'google':
      return createGoogleGenerativeAI({ apiKey: spec.apiKey })(spec.modelId);
    default: {
      const _exhaustive: never = spec.provider;
      throw new Error(`Unknown provider: ${String(_exhaustive)}`);
    }
  }
}
