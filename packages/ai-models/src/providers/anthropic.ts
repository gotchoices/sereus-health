import { ModelListError, type LiveModel } from '../types';
import { safeErrorText } from './http';

/**
 * List models callable by this Anthropic key.
 * Requires the `anthropic-version` header. Anthropic's list is text models only,
 * so no capability filtering is needed here (enrichment happens via models.dev).
 */
export async function listAnthropic(apiKey: string): Promise<LiveModel[]> {
  const res = await fetch('https://api.anthropic.com/v1/models?limit=1000', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
  });
  if (!res.ok) {
    throw new ModelListError('anthropic', res.status, await safeErrorText(res));
  }
  const json: {
    data?: Array<{ id: string; display_name?: string; created_at?: string }>;
  } = await res.json();
  return (json.data ?? []).map((m) => ({
    id: m.id,
    label: m.display_name,
    created: m.created_at ? Date.parse(m.created_at) : undefined,
  }));
}
