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

  // Action-plan protocol, format, and guardrails (the operating manual for writes).
  parts.push(section('ACTION PLAN PROTOCOL', PACK_DOCS.protocol));
  parts.push(section('ACTION PLAN FORMAT', PACK_DOCS.actionPlan));
  parts.push(section('GUARDRAILS', PACK_DOCS.guardrails));

  // How the abstract protocol maps onto the concrete tools available now.
  parts.push(
    section(
      'Tools and current capabilities',
      [
        'You have exactly two tools:',
        '(1) db_query — run read-only SQL (SELECT/WITH only) using SCHEMA_QSQL for',
        'table/column names. Query whenever it helps accuracy (counts, checking for',
        'existing catalog entries before proposing duplicates), but not gratuitously.',
        '(2) propose_plan — submit an action plan for the user to review and approve.',
        '',
        'CRITICAL — how to propose changes: To create/import/set ANYTHING, you MUST',
        'invoke the propose_plan tool (an actual tool/function call). Do NOT write the',
        'plan as text, markdown, or a JSON code block in your reply. The app can only',
        'render and execute plans submitted THROUGH the propose_plan tool; a plan',
        'merely described in prose does nothing and is a failure. The "ACTION PLAN',
        'FORMAT" section defines that tool\'s input structure — it is not text to type',
        'out. After you call propose_plan, add at most one short sentence like',
        '"I\'ve proposed a plan below — review and approve it." Never claim a change',
        'has been made; it runs only after the user approves.',
        'For pure "how do I…?" questions, just answer (name the screen and steps) —',
        'no tool needed.',
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
