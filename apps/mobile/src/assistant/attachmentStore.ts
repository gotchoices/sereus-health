/**
 * On-disk blob store for assistant attachments (images, PDFs, files).
 *
 * Attachments are NEVER kept inline in the conversation history (that would
 * re-send their bytes to the model every turn and bloat persistence). Instead
 * the history holds a small reference marker; the bytes live here on disk, keyed
 * by id, and are pulled in only for the one turn that needs them (a fresh
 * attachment, or a `view_attachment` re-fetch). Cleared when the user clears the
 * conversation.
 */
import RNFS from 'react-native-fs';
import { newUuid } from '../util/id';
import type { Attachment } from './attachment';

export interface AttachmentRef {
  id: string;
  name: string;
  mediaType: string;
  kind: 'image' | 'file';
}

const DIR = `${RNFS.DocumentDirectoryPath}/assistant-attachments`;

async function ensureDir(): Promise<void> {
  if (!(await RNFS.exists(DIR))) await RNFS.mkdir(DIR);
}

/** Persist an attachment's bytes + metadata; return its reference. */
export async function saveAttachment(att: Attachment): Promise<AttachmentRef> {
  await ensureDir();
  const id = newUuid();
  const ref: AttachmentRef = { id, name: att.name, mediaType: att.mediaType, kind: att.kind };
  await RNFS.writeFile(`${DIR}/${id}.bin`, att.base64, 'base64');
  await RNFS.writeFile(`${DIR}/${id}.meta`, JSON.stringify(ref), 'utf8');
  return ref;
}

/** Load an attachment's ref + base64 bytes, or null if missing (e.g. cleared). */
export async function loadAttachment(
  id: string,
): Promise<{ ref: AttachmentRef; base64: string } | null> {
  const bin = `${DIR}/${id}.bin`;
  const meta = `${DIR}/${id}.meta`;
  if (!(await RNFS.exists(bin)) || !(await RNFS.exists(meta))) return null;
  const [base64, metaStr] = await Promise.all([
    RNFS.readFile(bin, 'base64'),
    RNFS.readFile(meta, 'utf8'),
  ]);
  return { ref: JSON.parse(metaStr) as AttachmentRef, base64 };
}

/** Delete all stored attachments (called when the conversation is cleared). */
export async function clearAttachments(): Promise<void> {
  try {
    if (await RNFS.exists(DIR)) await RNFS.unlink(DIR);
  } catch {
    /* best-effort */
  }
}
