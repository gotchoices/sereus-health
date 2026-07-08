/**
 * Assistant-wide settings (separate from per-provider API keys).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const CONTEXT_LIMIT_KEY = '@sereus/assistant-context-limit-tokens';

/**
 * Max conversation context sent to the model, in approximate tokens.
 * 0 (or unset) = unlimited. When exceeded, the oldest turns are pruned.
 */
export async function getContextLimitTokens(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(CONTEXT_LIMIT_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export async function setContextLimitTokens(tokens: number): Promise<void> {
  const n = Number.isFinite(tokens) && tokens > 0 ? Math.floor(tokens) : 0;
  try {
    await AsyncStorage.setItem(CONTEXT_LIMIT_KEY, String(n));
  } catch {
    /* best-effort */
  }
}
