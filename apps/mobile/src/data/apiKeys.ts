/**
 * API Key management utilities
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Replace AsyncStorage with react-native-keychain for secure storage
const STORAGE_KEY = '@sereus/api-keys';

export type Provider = 'openai' | 'anthropic' | 'google';

export interface ApiKeyEntry {
  id: string;
  provider: Provider;
  model: string;
  apiKey: string;
  enabled: boolean;
}

/**
 * Get all stored API keys
 */
export async function getApiKeys(): Promise<ApiKeyEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ApiKeyEntry[];
  } catch {
    return [];
  }
}

/**
 * Get the currently enabled API key (if any)
 */
export async function getEnabledApiKey(): Promise<ApiKeyEntry | null> {
  const keys = await getApiKeys();
  return keys.find((k) => k.enabled && k.apiKey.trim()) ?? null;
}

/**
 * Check if any API key is configured and enabled
 */
export async function isAssistantConfigured(): Promise<boolean> {
  const key = await getEnabledApiKey();
  return key !== null;
}

