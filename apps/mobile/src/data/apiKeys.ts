/**
 * API key management.
 *
 * Keys are secrets, so they live in the device keychain (Android Keystore / iOS
 * Keychain) via react-native-keychain — never in plaintext AsyncStorage. The whole
 * list is stored as one JSON blob under a fixed service. On first read we migrate any
 * keys from the old AsyncStorage location and then delete the plaintext copy.
 */
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVICE = 'sereus.api-keys';
/** Old plaintext location, migrated away from on first read. */
const LEGACY_KEY = '@sereus/api-keys';

export type Provider = 'openai' | 'anthropic' | 'google';

export interface ApiKeyEntry {
  id: string;
  provider: Provider;
  model: string;
  apiKey: string;
  enabled: boolean;
}

/** Get all stored API keys (migrating from legacy AsyncStorage on first read). */
export async function getApiKeys(): Promise<ApiKeyEntry[]> {
  try {
    const creds = await Keychain.getGenericPassword({ service: SERVICE });
    if (creds && creds.password) return JSON.parse(creds.password) as ApiKeyEntry[];

    // One-time migration from the old plaintext AsyncStorage location.
    const legacy = await AsyncStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as ApiKeyEntry[];
      await saveApiKeys(parsed);
      await AsyncStorage.removeItem(LEGACY_KEY);
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

/** Persist the full list of API keys to the device keychain. */
export async function saveApiKeys(keys: ApiKeyEntry[]): Promise<void> {
  if (keys.length === 0) {
    await Keychain.resetGenericPassword({ service: SERVICE });
    return;
  }
  await Keychain.setGenericPassword('api-keys', JSON.stringify(keys), { service: SERVICE });
}

/** Get the currently enabled API key (if any). */
export async function getEnabledApiKey(): Promise<ApiKeyEntry | null> {
  const keys = await getApiKeys();
  return keys.find((k) => k.enabled && k.apiKey.trim()) ?? null;
}

/** Check if any API key is configured and enabled. */
export async function isAssistantConfigured(): Promise<boolean> {
  const key = await getEnabledApiKey();
  return key !== null;
}
