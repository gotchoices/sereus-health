/**
 * Builds the assistant system prompt for a turn: the bundled prompt pack plus
 * per-turn dynamic context (screen, locale, timezone, current time).
 *
 * Chunk C scope: conversation + app guidance only. The action-plan protocol,
 * tools, and guardrails docs are bundled (see pack.ts) but NOT yet included here,
 * because the tools/approval machinery isn't wired — including them would invite
 * the model to claim it took actions it can't. They get added in the tools chunk.
 */
import { DOMAIN_DOCS, PACK_DOCS } from './pack';

export interface AssistantContext {
  /** Current screen/route, e.g. 'Assistant', 'LogHistory'. */
  screen?: string;
  locale?: string;
  timeZone?: string;
  /** ISO-8601 UTC timestamp for "now". */
  nowUtc?: string;
}

function section(title: string, body: string): string {
  return `\n\n## ${title}\n\n${body.trim()}`;
}

export function buildSystemPrompt(ctx: AssistantContext = {}): string {
  const parts: string[] = [PACK_DOCS.overview.trim()];

  // Domain truth as named resources.
  for (const [name, doc] of Object.entries(DOMAIN_DOCS)) {
    parts.push(section(name, doc));
  }

  // Honest capability statement for this phase.
  parts.push(
    section(
      'Current capabilities',
      [
        'You can answer questions, explain how to use the app, and inspect the',
        "user's data by running read-only SQL via the db_query tool (SELECT/WITH",
        'only), using the SCHEMA_QSQL above for table and column names. Query the',
        'database whenever it helps answer accurately (e.g. counts, existing',
        'catalog entries), but do not run queries gratuitously.',
        'You CANNOT yet create, modify, import, or delete data, or execute action',
        'plans — that machinery is not wired yet. Never claim to have changed,',
        'created, or imported anything. If asked to make changes, explain the',
        'steps the user can take in the app instead (name the screen and the',
        'minimal steps).',
      ].join(' '),
    ),
  );

  // Per-turn dynamic context.
  const dyn: string[] = [];
  if (ctx.screen) dyn.push(`- Current screen: ${ctx.screen}`);
  if (ctx.locale) dyn.push(`- Locale: ${ctx.locale}`);
  if (ctx.timeZone) dyn.push(`- Time zone: ${ctx.timeZone}`);
  if (ctx.nowUtc) dyn.push(`- Current time (UTC): ${ctx.nowUtc}`);
  if (dyn.length) parts.push(section('Session context', dyn.join('\n')));

  return parts.join('');
}
