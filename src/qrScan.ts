import { LIMITS, FileTooLargeError } from './limits';

/*
 * Reads a QR code from a photo or a screenshot, on the device: the picture is
 * drawn onto a canvas and its pixels go to the `qr` package's decoder (pure
 * JavaScript, no dependencies, loaded only when a code is scanned). Nothing
 * leaves the phone and the picture isn't kept.
 */

/** The longest side the picture is tried at, in turn: a code small on a whole page needs the pixels, a close-up reads faster small. */
const SIZES = [1600, 2800, 900];

/** The text of the first QR code found in the picture, or null when there is none to read. */
export async function readQrCode(file: Blob): Promise<string | null> {
  if (file.size > LIMITS.imageBytes) throw new FileTooLargeError('importTooLarge');
  const [{ decodeQR }, bitmap] = await Promise.all([import('qr/decode.js'), createImageBitmap(file)]);
  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const tried = new Set<number>();
    for (const size of SIZES) {
      const scale = Math.min(1, size / longest);
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      if (tried.has(width)) continue;
      tried.add(width);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(bitmap, 0, 0, width, height);
      try {
        const text = decodeQR(ctx.getImageData(0, 0, width, height));
        if (text) return text;
      } catch { /* no code found at this size: try the next */ }
    }
    return null;
  } finally {
    bitmap.close();
  }
}
