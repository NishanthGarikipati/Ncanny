import { MediaKind } from '@ncanny/types';

const IMAGE_LIMIT = 4_000_000;
const AUDIO_LIMIT = 8_000_000;

export interface SniffedMedia {
  kind: MediaKind;
  mimeType: string;
}

/**
 * Confirms the bytes match the declared type. The declared MIME is never
 * trusted on its own: a renamed executable must not be stored as an image.
 */
export function sniffMedia(bytes: Buffer, declaredMime: string): SniffedMedia | null {
  if (bytes.length < 12) {
    return null;
  }

  const isPng =
    declaredMime === 'image/png' &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg =
    declaredMime === 'image/jpeg' && bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  const isWebp =
    declaredMime === 'image/webp' &&
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  const mp3Frame = bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0;
  const isMp3 =
    declaredMime === 'audio/mpeg' &&
    (bytes.subarray(0, 3).toString('ascii') === 'ID3' || mp3Frame);
  const isWav =
    declaredMime === 'audio/wav' &&
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WAVE';
  const isWebm =
    declaredMime === 'audio/webm' &&
    bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  const isMp4 = declaredMime === 'audio/mp4' && bytes.subarray(4, 8).toString('ascii') === 'ftyp';

  if (isPng || isJpeg || isWebp) {
    return bytes.length <= IMAGE_LIMIT ? { kind: MediaKind.IMAGE, mimeType: declaredMime } : null;
  }
  if (isMp3 || isWav || isWebm || isMp4) {
    return bytes.length <= AUDIO_LIMIT ? { kind: MediaKind.AUDIO, mimeType: declaredMime } : null;
  }
  return null;
}
