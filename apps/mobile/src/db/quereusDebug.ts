export type QuereusAggregateReproResult =
  | { ok: true; rows: Array<{ category_id: string; usageCount: number }> }
  | { ok: false; error: unknown };

/**
 * Self-contained Quereus aggregate repro for RN/Hermes debugging.
 *
 * Disabled by default (kept as a hook for future debugging).
 */
export async function runAggregateRepro(): Promise<QuereusAggregateReproResult> {
  return { ok: false, error: 'disabled (enable runAggregateRepro() when needed)' };
}


