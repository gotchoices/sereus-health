import { ModelListError, type LiveModel } from '../types';
import { safeErrorText } from './http';

interface GoogleModel {
  name: string;
  displayName?: string;
  supportedGenerationMethods?: string[];
}

/**
 * List models callable by this Google (Gemini API / AI Studio) key.
 * Google is the cleanest signal of the three: filter on
 * `supportedGenerationMethods` including `generateContent`.
 */
export async function listGoogle(apiKey: string): Promise<LiveModel[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=${encodeURIComponent(
      apiKey,
    )}`,
  );
  if (!res.ok) {
    throw new ModelListError('google', res.status, await safeErrorText(res));
  }
  const json: { models?: GoogleModel[] } = await res.json();
  return (json.models ?? [])
    .filter((m) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
    .map((m) => ({ id: m.name.replace(/^models\//, ''), label: m.displayName }));
}
