import { AppData, Attachment } from './types';
import { FILE_ID, attachmentIds, uid } from './logic';
import { FileTooLargeError, LIMITS } from './limits';
import { fileStore } from './storage';

/*
 * Receipts and documents on an entry (plan 27). A photo is drawn onto a
 * canvas no larger than 1600 px and saved again as a JPEG — which also drops
 * its location and every other EXIF field; a PDF is kept as it came, up to
 * 5 MB. The files stay in the app's own storage (storage.ts `fileStore`), never
 * in the photo library, and leave the device only inside a backup the user
 * makes. `readReceipt` is pure and tested; the rest needs a browser.
 */

export class NotAReceiptError extends Error {}

const toBase64 = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});

function fromBase64(base64: string, type: string): Blob {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** A photo as a JPEG of at most `LIMITS.attachmentPixels` on its longer side — no EXIF survives the canvas. */
async function reencode(file: Blob): Promise<Blob> {
  if (file.size > LIMITS.imageBytes) throw new FileTooLargeError();
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch { throw new NotAReceiptError(); }
  try {
    const scale = Math.min(1, LIMITS.attachmentPixels / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new NotAReceiptError();
    // White under it: a transparent PNG would turn black as a JPEG.
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
    if (!blob) throw new NotAReceiptError();
    return blob;
  } finally {
    bitmap.close();
  }
}

/**
 * Takes a photo or a PDF in: re-encodes or checks it, stores it, and returns
 * what the entry keeps. Throws `FileTooLargeError` or `NotAReceiptError`.
 */
export async function addAttachment(file: File, newId: () => string = uid): Promise<Attachment> {
  const pdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  let blob: Blob;
  if (pdf) {
    if (file.size > LIMITS.attachmentBytes) throw new FileTooLargeError();
    if ((await file.slice(0, 5).text()) !== '%PDF-') throw new NotAReceiptError();
    blob = file;
  } else {
    blob = await reencode(file);
  }
  const id = newId().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64) || String(Date.now());
  await fileStore().put(id, await toBase64(blob));
  const name = file.name.replace(/\.[^.]+$/, '').slice(0, 80);
  return { id, name: name || (pdf ? 'PDF' : 'Foto'), type: pdf ? 'application/pdf' : 'image/jpeg', size: blob.size };
}

/** The stored file, or null when it is gone (a backup made without it). */
export async function attachmentBlob(file: Attachment): Promise<Blob | null> {
  const base64 = await fileStore().get(file.id);
  if (base64 === null) return null;
  try { return fromBase64(base64, file.type); } catch { return null; }
}

/** Takes a file out again — a receipt removed before the entry was ever saved. */
export const dropAttachment = (id: string) => fileStore().remove(id).catch(() => undefined);

/** The book's files for a backup: id → base64, the ones still there. */
export async function exportFiles(data: AppData): Promise<Record<string, string>> {
  const store = fileStore();
  const out: Record<string, string> = {};
  for (const id of attachmentIds(data)) {
    const content = await store.get(id);
    if (content !== null) out[id] = content;
  }
  return out;
}

/** Writes a backup's files; returns every id now on the device among those asked for. */
export async function importFiles(files: Record<string, string>, wanted: Set<string>): Promise<Set<string>> {
  const store = fileStore();
  const have = new Set<string>();
  const there = new Set(await store.list());
  for (const id of wanted) {
    if (!FILE_ID.test(id)) continue;
    if (files[id] !== undefined) {
      try { await store.put(id, files[id]); have.add(id); } catch { /* this one is lost; the rest still come */ }
    } else if (there.has(id)) have.add(id);
  }
  return have;
}

/* ------------------------------------------------- reading a receipt (OCR) */

const AMOUNT = /(\d{1,3}(?:[.\s]\d{3})+|\d+)[.,](\d{2})(?!\d)/g;
const TOTAL = /\b(summe|gesamt(?:betrag|summe)?|total|zu zahlen|zahlbetrag|endbetrag|betrag|amount due|balance due|sum)\b|المجموع|الإجمالي/i;
const NOT_TOTAL = /zwischensumme|subtotal|sub total|mwst|ust\b|steuer|netto|tax|vat|rückgeld|gegeben|bar\b|change|cash/i;

function amountsIn(line: string): number[] {
  const out: number[] = [];
  for (const m of line.matchAll(AMOUNT)) out.push(Number(m[1].replace(/[.\s]/g, '')) * 100 + Number(m[2]));
  return out;
}

/**
 * What a receipt's text says: the total — the last amount on a line that
 * names it ("Summe", "Total", "Zu zahlen"), else the largest amount — and the
 * shop, its first line with a few letters. Either may be missing.
 */
export function readReceipt(text: string): { amount?: number; shop?: string } {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let amount: number | undefined;
  for (const line of lines) {
    if (!TOTAL.test(line) || NOT_TOTAL.test(line)) continue;
    const found = amountsIn(line);
    if (found.length) amount = found[found.length - 1];
  }
  if (amount === undefined) {
    const all = lines.filter(l => !NOT_TOTAL.test(l)).flatMap(amountsIn);
    if (all.length) amount = Math.max(...all);
  }
  const shop = lines.find(l => (l.match(/\p{L}/gu)?.length ?? 0) >= 3 && !amountsIn(l).length && !TOTAL.test(l));
  return { ...(amount ? { amount } : {}), ...(shop ? { shop: shop.replace(/\s+/g, ' ').slice(0, 40) } : {}) };
}
