/**
 * Attachment picking for the assistant.
 *
 * Uses the document picker (import mode copies the file to app cache, so the uri
 * is readable) + react-native-fs to read the bytes as base64. Supports images
 * and PDFs — the model-native input formats. Spreadsheets/office docs are NOT
 * model-native and would need client-side extraction to text/CSV first (future).
 */
import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { pick, types, errorCodes, isErrorWithCode } from '@react-native-documents/picker';
import { launchCamera } from 'react-native-image-picker';

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

async function ensureCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true; // iOS prompts via Info.plist usage string
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
    title: 'Camera access',
    message: 'Allow the assistant to take a photo to attach?',
    buttonPositive: 'OK',
    buttonNegative: 'Cancel',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Capture a photo with the camera. Returns null if the user cancels.
 * Uses base64 directly from the picker (no file read needed).
 */
export async function captureFromCamera(): Promise<Attachment | null> {
  if (!(await ensureCameraPermission())) {
    throw new Error('Camera permission was denied.');
  }
  const res = await launchCamera({
    mediaType: 'photo',
    includeBase64: true,
    quality: 0.7,
    saveToPhotos: false,
  });
  if (res.didCancel) return null;
  if (res.errorCode) {
    throw new Error(res.errorMessage ?? `Camera error: ${res.errorCode}`);
  }
  const asset = res.assets?.[0];
  if (!asset?.base64) return null;
  return {
    name: asset.fileName ?? `photo-${Date.now()}.jpg`,
    mediaType: asset.type ?? 'image/jpeg',
    base64: asset.base64,
    size: asset.fileSize ?? null,
    kind: 'image',
  };
}
