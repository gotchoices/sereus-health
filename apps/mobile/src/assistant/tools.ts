/**
 * Assistant tools.
 *
 * Design: reads auto-execute (safe), writes never do. The only tool here is a
 * read-only SQL query — it lets the assistant inspect the user's data to answer
 * questions and (later) dedupe before proposing inserts. Writes flow through the
 * action-plan/approval path, added in a later chunk — they are deliberately NOT
 * exposed as a live tool.
 *
 * NOTE: provider tool names must match ^[a-zA-Z0-9_-]+$ (no dots), so the wire
 * name is `db_query` even though the spec (tools.md) refers to it as `db.query`.
 */
import { getDatabase } from '../db';
import { tool, jsonSchema, type ToolSet } from '@serfab/ai-models/chat';
import type { Provider } from '@serfab/ai-models';
import type { ActionPlan } from './actionPlan';
import { loadAttachment } from './attachmentStore';

/** Bind params for a positional query. Quereus SqlValue: string | number | null. */
type QueryParam = string | number | null;

interface DbQueryInput {
  sql: string;
  params?: QueryParam[];
}

/** Cap result size so a broad query can't flood the model context. */
const MAX_ROWS = 200;

/**
 * Make a Quereus row JSON-safe. Quereus returns native JS types — `bigint`
 * (e.g. from count(*)) and `Uint8Array` (blobs) — which the AI SDK cannot
 * JSON-serialize when returning the tool result to the model.
 */
function toJsonValue(v: unknown): unknown {
  if (typeof v === 'bigint') {
    return v >= BigInt(Number.MIN_SAFE_INTEGER) && v <= BigInt(Number.MAX_SAFE_INTEGER)
      ? Number(v)
      : v.toString();
  }
  if (v instanceof Uint8Array) return `[blob ${v.length} bytes]`;
  return v;
}

function serializeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(row)) out[key] = toJsonValue(row[key]);
  return out;
}

/** Reject anything that isn't a single read-only SELECT/WITH. */
function assertReadOnly(sql: string): void {
  const stripped = sql.replace(/--.*$/gm, '').trim();
  if (!/^(select|with)\b/i.test(stripped)) {
    throw new Error('db_query is read-only: only SELECT / WITH statements are allowed.');
  }
  if (/\b(insert|update|delete|drop|alter|create|replace|attach|detach|pragma)\b/i.test(stripped)) {
    throw new Error('db_query is read-only: write/DDL keywords are not allowed.');
  }
}

const dbQuery = tool({
  description:
    'Run a read-only SQL query (SELECT/WITH only) against the local health database and ' +
    'return the rows. Use positional ? placeholders bound via the params array. Consult ' +
    'the SCHEMA_QSQL section of your instructions for exact table and column names. ' +
    'Prefer set-based queries (e.g. name IN (?, ?, ?)) over many single-row lookups.',
  inputSchema: jsonSchema<DbQueryInput>({
    type: 'object',
    properties: {
      sql: { type: 'string', description: 'A single read-only SELECT or WITH statement.' },
      params: {
        type: 'array',
        description: 'Positional bind parameters for the ? placeholders, in order.',
        items: { type: ['string', 'number', 'null'] },
      },
    },
    required: ['sql'],
    additionalProperties: false,
  }),
  execute: async ({ sql, params }) => {
    assertReadOnly(sql);
    const db = await getDatabase();
    const rows: Array<Record<string, unknown>> = [];
    for await (const row of db.eval(sql, params)) {
      rows.push(serializeRow(row));
      if (rows.length >= MAX_ROWS) break;
    }
    return { rowCount: rows.length, truncated: rows.length >= MAX_ROWS, rows };
  },
});

/**
 * Propose an action plan for the user to review/approve. This tool has NO
 * execute: the AI SDK returns the tool call without running it (human-in-the-
 * loop), so generation stops and the app captures the plan from result.toolCalls.
 * Nothing is written until the user approves selected actions.
 */
const proposePlan = tool({
  description:
    'Propose an action plan for the user to review and approve. Use this whenever the ' +
    'user asks you to CREATE catalog entries (types/categories/items/quantifiers/bundles), ' +
    'CREATE log entries, set reminders, or import data. Do NOT claim the changes are done — ' +
    'they run only after the user approves. Give every action a stable, unique actionId. ' +
    'Propose the minimal set of actions needed. Query first (db_query) to avoid duplicates.',
  inputSchema: jsonSchema<ActionPlan>({
    type: 'object',
    properties: {
      planId: { type: 'string', description: 'Stable id for this plan.' },
      summary: { type: 'string', description: 'One-sentence summary of the plan.' },
      actions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            actionId: { type: 'string', description: 'Stable, unique within the plan.' },
            kind: {
              type: 'string',
              description:
                "e.g. 'catalog.createItem', 'catalog.createBundle', 'logs.createEntry'.",
            },
            title: { type: 'string', description: 'Human-readable one-liner for the preview.' },
            data: { type: 'object', additionalProperties: true, description: 'Kind-specific payload.' },
          },
          required: ['actionId', 'kind', 'title'],
          additionalProperties: true,
        },
      },
    },
    required: ['planId', 'summary', 'actions'],
    additionalProperties: false,
  }),
  // no execute → human-in-the-loop
});

/** Wire name of the plan-proposal tool (matches the tool key below). */
export const PROPOSE_PLAN_TOOL = 'propose_plan';

/**
 * View a previously attached file/image by id. Returns its bytes as a media tool
 * result so the model can re-examine it, without keeping the bytes in history.
 */
const viewAttachment = tool({
  description:
    'View the contents of a previously attached file or image by its id. The id appears ' +
    'in the conversation as [Attachment "..." id="..."]. Use this when the user refers to ' +
    'an earlier attachment you need to look at again.',
  inputSchema: jsonSchema<{ id: string }>({
    type: 'object',
    properties: { id: { type: 'string', description: 'The attachment id from its marker.' } },
    required: ['id'],
    additionalProperties: false,
  }),
  execute: async ({ id }) => {
    const loaded = await loadAttachment(id);
    if (!loaded) return { found: false as const };
    return { found: true as const, base64: loaded.base64, mediaType: loaded.ref.mediaType };
  },
  toModelOutput: ({ output }) => {
    const o = output as { found: boolean; base64?: string; mediaType?: string };
    if (!o.found || !o.base64) {
      return { type: 'error-text', value: 'Attachment not found (it may have been cleared).' };
    }
    return {
      type: 'content',
      value: [{ type: 'media', data: o.base64, mediaType: o.mediaType ?? 'application/octet-stream' }],
    };
  },
});

/** Providers whose tool results can carry media (images), enabling view_attachment. */
const MEDIA_TOOL_RESULT_PROVIDERS = new Set<Provider>(['anthropic']);

/**
 * Build the toolset for a turn. `view_attachment` is only included on providers
 * that accept media in tool results; elsewhere, a fresh attachment is still sent
 * inline for its turn (that works everywhere) — only re-viewing is unavailable.
 */
export function buildAssistantTools(provider: Provider): ToolSet {
  const tools: ToolSet = { db_query: dbQuery, propose_plan: proposePlan };
  if (MEDIA_TOOL_RESULT_PROVIDERS.has(provider)) {
    tools.view_attachment = viewAttachment;
  }
  return tools;
}
