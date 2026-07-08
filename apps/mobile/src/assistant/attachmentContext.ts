/**
 * Bridges the on-disk attachment store and the model conversation.
 *
 * Invariant: the stored history never contains attachment bytes — only compact
 * reference markers. Bytes are inlined transiently:
 *   - a freshly attached file, for the single turn it's sent, and
 *   - a `view_attachment` re-fetch, whose media result is stripped back to a
 *     marker before it's committed to history (`sanitizeForHistory`).
 */
import { Buffer } from 'buffer';
import type { ModelMessage } from '@serfab/ai-models/chat';
import type { Attachment } from './attachment';
import type { AttachmentRef } from './attachmentStore';

type TextPart = { type: 'text'; text: string };

/** A human- and model-readable reference to an attachment (no bytes). */
export function attachmentMarker(ref: AttachmentRef): TextPart {
  return {
    type: 'text',
    text:
      `[Attachment "${ref.name}" (${ref.kind}, ${ref.mediaType}), id="${ref.id}". ` +
      `Its contents are not shown here. If you need to see it, call view_attachment with id "${ref.id}".]`,
  };
}

/** An inline content part carrying the actual bytes, for the one turn it's needed. */
export function inlinePart(att: Attachment) {
  const bytes = Buffer.from(att.base64, 'base64');
  return att.kind === 'image'
    ? ({ type: 'image', image: bytes, mediaType: att.mediaType } as const)
    : ({ type: 'file', data: bytes, mediaType: att.mediaType, filename: att.name } as const);
}

/**
 * Strip media out of tool-result messages before they're stored, so re-fetched
 * attachment bytes don't linger in history (and get re-sent every later turn).
 * The media was already delivered to the model within the turn that produced it.
 */
export function sanitizeForHistory(messages: ModelMessage[]): ModelMessage[] {
  return messages.map((m) => {
    if (m.role !== 'tool' || !Array.isArray(m.content)) return m;
    const content = m.content.map((part) => {
      const p = part as { type?: string; output?: { type?: string } };
      if (p.type === 'tool-result' && p.output && p.output.type === 'content') {
        return {
          ...(part as object),
          output: {
            type: 'text',
            value: '[attachment content omitted from history — call view_attachment again to re-view]',
          },
        };
      }
      return part;
    });
    return { ...m, content } as ModelMessage;
  });
}
