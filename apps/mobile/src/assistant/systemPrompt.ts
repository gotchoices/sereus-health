/**
 * Builds the assistant system prompt for a turn from the bundled prompt-pack docs
 * plus per-turn dynamic session context (screen, locale, timezone, current time).
 *
 * The docs are the single source of truth (see design/specs/mobile/global/
 * assistant/*.md and pack.md). This composer only orders them and appends the
 * session context — it holds no prompt text of its own.
 */
import { DOMAIN_DOCS, PACK_DOCS } from './pack';

export interface AssistantContext {
  /** Current screen/route, e.g. 'Assistant', 'LogHistory'. */
  screen?: string;
  locale?: string;
  timeZone?: string;
  /** ISO-8601 UTC timestamp for "now". */
  nowUtc?: string;
  /** Local wall-clock "now", e.g. '2026-07-07 22:05' — what "today" means to the user. */
  nowLocal?: string;
  /** UTC offset of the local time, e.g. '-06:00'. */
  utcOffset?: string;
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

  // Operating manual: protocol, plan format, guardrails, tools, attachments.
  parts.push(section('ACTION PLAN PROTOCOL', PACK_DOCS.protocol));
  parts.push(section('ACTION PLAN FORMAT', PACK_DOCS.actionPlan));
  parts.push(section('GUARDRAILS', PACK_DOCS.guardrails));
  parts.push(section('TOOLS', PACK_DOCS.tools));
  parts.push(section('ATTACHMENTS', PACK_DOCS.attachments));

  // Per-turn dynamic context.
  const dyn: string[] = [];
  if (ctx.screen) dyn.push(`- Current screen: ${ctx.screen}`);
  if (ctx.locale) dyn.push(`- Locale: ${ctx.locale}`);
  if (ctx.timeZone) dyn.push(`- Time zone: ${ctx.timeZone}`);
  if (ctx.nowLocal) {
    dyn.push(`- Current LOCAL date & time: ${ctx.nowLocal}${ctx.utcOffset ? ` (UTC${ctx.utcOffset})` : ''}`);
  }
  if (ctx.nowUtc) dyn.push(`- Current time (UTC): ${ctx.nowUtc}`);
  if (ctx.nowLocal || ctx.nowUtc) {
    dyn.push(
      '- Resolve relative dates/times ("today", "this morning", "breakfast", "now") in the ' +
        "user's LOCAL time zone above, not UTC. \"Today\" is the local date. Something that " +
        'already happened today (e.g. this morning\'s breakfast, logged in the evening) keeps ' +
        "today's local date — do not roll to tomorrow. Convert the intended local time to UTC " +
        'for `timestampUtc`.',
    );
  }
  if (dyn.length) parts.push(section('Session context', dyn.join('\n')));

  return parts.join('');
}
