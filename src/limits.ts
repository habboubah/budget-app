/*
 * Size limits for every file the app reads from outside (plan 05). A hostile
 * or broken file must fail fast with a clear message, never expand to
 * gigabytes or hang the app. Pure numbers and checks, tested in limits.test.ts.
 */

const MB = 1024 * 1024;

export const LIMITS = {
  /** A backup file (.json or .spartopf) — with the receipts in it (plan 27). */
  backupBytes: 150 * MB,
  /** A PDF attached to an entry; photos are re-encoded far below this. */
  attachmentBytes: 5 * MB,
  /** The longer side of an attached photo after re-encoding, in pixels. */
  attachmentPixels: 1600,
  backupEntries: 500_000,
  /** A bank CSV export. */
  csvBytes: 10 * MB,
  csvRows: 50_000,
  /** An .xlsx workbook (the zip itself). */
  xlsxBytes: 20 * MB,
  /** One unzipped .xlsx entry we'll read; anything bigger is skipped. */
  xlsxEntryBytes: 50 * MB,
  /** Total unzipped size of the .xlsx entries we read before we stop. */
  xlsxTotalBytes: 100 * MB,
  /** An image for OCR, before createImageBitmap. */
  imageBytes: 30 * MB,
} as const;

/** The reason a file was rejected — a key for translations. */
export type LimitError = 'importTooLarge' | 'importTooMany';

/** Throws when a file is over a byte limit (the caller shows `importTooLarge`). */
export class FileTooLargeError extends Error {
  constructor(readonly key: LimitError = 'importTooLarge') { super(key); }
}

/** True when a file's byte size is within the limit. */
export function withinBytes(size: number, limit: number): boolean {
  return size >= 0 && size <= limit;
}

/** Throws FileTooLargeError when `size` exceeds `limit`. */
export function checkBytes(size: number, limit: number): void {
  if (!withinBytes(size, limit)) throw new FileTooLargeError('importTooLarge');
}

/** Throws when there are more rows/entries than allowed. */
export function checkCount(count: number, limit: number, key: LimitError = 'importTooMany'): void {
  if (count > limit) throw new FileTooLargeError(key);
}
