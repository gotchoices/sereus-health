import type { LiveModel, Provider } from '../types';
import { listOpenAI } from './openai';
import { listAnthropic } from './anthropic';
import { listGoogle } from './google';

export { safeErrorText } from './http';
export { listOpenAI } from './openai';
export { listAnthropic } from './anthropic';
export { listGoogle } from './google';

/** Provider → its `/models` listing adapter. */
export const LIST_ADAPTERS: Record<Provider, (apiKey: string) => Promise<LiveModel[]>> = {
  openai: listOpenAI,
  anthropic: listAnthropic,
  google: listGoogle,
};

/** List the models a given key can call, hitting the provider's own endpoint. */
export function listLiveModels(provider: Provider, apiKey: string): Promise<LiveModel[]> {
  return LIST_ADAPTERS[provider](apiKey);
}
