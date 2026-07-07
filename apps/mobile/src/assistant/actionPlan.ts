/**
 * Action plan types + a defensive parser.
 *
 * The assistant proposes work as an action plan (see
 * design/specs/mobile/global/assistant/action-plan.md). The app renders it for
 * review; only approved actions execute. Plans arrive as the `input` of the
 * model's `propose_plan` tool call, so they are untrusted — parse defensively.
 */

export interface PlanAction {
  /** Stable, unique across refinement turns. UI selection state keys on this. */
  actionId: string;
  /** e.g. 'catalog.createItem', 'catalog.createBundle', 'logs.createEntry'. */
  kind: string;
  /** Human-readable one-liner shown in the preview. */
  title: string;
  /** Kind-specific payload used at execution time. */
  data?: Record<string, unknown>;
}

export interface ActionPlan {
  planId: string;
  summary: string;
  actions: PlanAction[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Validate/coerce arbitrary tool input into an ActionPlan, or null if it isn't
 * a usable plan. Drops malformed actions and enforces unique actionIds.
 */
export function parseActionPlan(input: unknown): ActionPlan | null {
  if (!isRecord(input)) return null;
  const { planId, summary, actions } = input;
  if (typeof planId !== 'string' || typeof summary !== 'string' || !Array.isArray(actions)) {
    return null;
  }

  const parsed: PlanAction[] = [];
  const seen = new Set<string>();
  for (const raw of actions) {
    if (!isRecord(raw)) continue;
    const { actionId, kind, title, data } = raw;
    if (typeof actionId !== 'string' || typeof kind !== 'string' || typeof title !== 'string') {
      continue;
    }
    if (seen.has(actionId)) continue; // actionId must be unique within a plan
    seen.add(actionId);
    parsed.push({
      actionId,
      kind,
      title,
      data: isRecord(data) ? data : undefined,
    });
  }

  if (parsed.length === 0) return null;
  return { planId, summary, actions: parsed };
}
