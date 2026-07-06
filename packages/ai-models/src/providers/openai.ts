import { ModelListError, type LiveModel } from '../types';
import { safeErrorText } from './http';

/** ids that look like chat/completion models. */
const CHAT_ID = /^(gpt-|o\d|chatgpt|omni)/i;
/** ids to exclude even if they match CHAT_ID (embeddings, audio, image, etc.). */
const NON_CHAT =
  /embed|whisper|tts|dall-?e|image|realtime|moderation|audio|transcribe|search|davinci|babbage|codex-mini/i;

/**
 * List chat-capable models callable by this OpenAI key.
 * `GET /v1/models` is a metadata call; it validates auth but consumes no quota.
 */
export async function listOpenAI(apiKey: string): Promise<LiveModel[]> {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    throw new ModelListError('openai', res.status, await safeErrorText(res));
  }
  const json: { data?: Array<{ id: string; created?: number }> } = await res.json();
  return (json.data ?? [])
    .filter((m) => CHAT_ID.test(m.id) && !NON_CHAT.test(m.id))
    .map((m) => ({ id: m.id, created: m.created }));
}
