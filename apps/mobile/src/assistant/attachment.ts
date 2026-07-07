/**
 * Attachment picking for the assistant.
 *
 * Uses the document picker (import mode copies the file to app cache, so the uri
 * is readable) + react-native-fs to read the bytes as base64. Supports images
 * and PDFs — the model-native input formats. Spreadsheets/office docs are NOT
 * model-native and would need client-side extraction to text/CSV first (future).
 */
import RNFS from 'react-native-fs';
import { pick, types, errorCodes, isErrorWithCode } from '@react-native-documents/picker';

export interface Attachment {
  name: string;
  /** IANA media type, e.g. 'image/jpeg' or 'application/pdf'. */
  mediaType: string;
  /** Base64-encoded file bytes. */
  base64: string;
  size: number | null;
  /** 'image' → ImagePart (needs a vision model); 'file' → FilePart (needs pdf support). */
  kind: 'image' | 'file';
}

function guessMime(name: string | null | undefined): string {
  const ext = (name ?? '').toLowerCase().split('.').pop() ?? '';
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'gif':
      return 'image/gif';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Prompt the user to pick an image or PDF. Returns null if they cancel.
 * Throws on a real failure (e.g. unreadable file).
 */
export async function pickAttachment(): Promise<Attachment | null> {
  try {
    const [file] = await pick({
      type: [types.images, types.pdf],
      mode: 'import', // copy into app cache so file.uri is readable
    });
    if (!file?.uri) return null;

    const reported = file.type ?? '';
    const mediaType = reported && reported !== 'application/octet-stream' ? reported : guessMime(file.name);
    const base64 = await RNFS.readFile(file.uri, 'base64');

    return {
      name: file.name ?? 'attachment',
      mediaType,
      base64,
      size: file.size ?? null,
      kind: mediaType.startsWith('image/') ? 'image' : 'file',
    };
  } catch (e) {
    if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) return null;
    throw e;
  }
}
