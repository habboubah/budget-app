import { FileTooLargeError, LIMITS } from './limits';

/*
 * The text of a PDF, line by line, read on the device with Mozilla's pdf.js
 * (`pdfjs-dist`, its legacy build so older iPhones can run it; a chunk of its
 * own plus its worker, loaded only when a PDF is imported). No page is
 * rendered: only the text and where each piece sits, which is what tells a
 * statement's columns apart. Nothing leaves the phone.
 */

/** A piece of text on a line: where it starts and ends (points from the page's left edge). */
export interface PdfPart { x: number; end: number; text: string }
/** One line of a page, its parts from left to right. */
export interface PdfLine { page: number; parts: PdfPart[]; text: string }

/** The file is a PDF that asks for a password. */
export class PdfLockedError extends Error {}

/** Pieces whose baselines lie within this many points share a line. */
const SAME_LINE = 2.5;

/** Lines from loose pieces: grouped by baseline (top to bottom), each sorted left to right. Pure — tested without a PDF. */
export function linesFromItems(items: { x: number; y: number; width: number; text: string }[], page: number): PdfLine[] {
  const rows: { y: number; parts: PdfPart[] }[] = [];
  for (const it of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const text = it.text.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const row = rows.find(r => Math.abs(r.y - it.y) <= SAME_LINE);
    const part = { x: it.x, end: it.x + it.width, text };
    if (row) row.parts.push(part); else rows.push({ y: it.y, parts: [part] });
  }
  return rows.map(r => {
    const parts = r.parts.sort((a, b) => a.x - b.x);
    return { page, parts, text: parts.map(p => p.text).join(' ') };
  });
}

/** Every line of the PDF's first pages, in reading order. */
export async function readPdfLines(file: Blob): Promise<PdfLine[]> {
  if (file.size > LIMITS.statementPdfBytes) throw new FileTooLargeError('importTooLarge');
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    // Text only: no fonts installed or fetched, no wasm decoders, nothing loaded from anywhere.
    disableFontFace: true, useSystemFonts: false, useWorkerFetch: false, useWasm: false,
    disableAutoFetch: true, disableStream: true, disableRange: true,
  });
  try {
    const doc = await task.promise;
    const out: PdfLine[] = [];
    const pages = Math.min(doc.numPages, LIMITS.statementPdfPages);
    for (let n = 1; n <= pages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      const items = content.items.flatMap(it => ('str' in it
        ? [{ x: it.transform[4] as number, y: it.transform[5] as number, width: it.width, text: it.str }] : []));
      out.push(...linesFromItems(items, n));
      page.cleanup();
    }
    return out;
  } catch (e) {
    if (e instanceof Error && e.name === 'PasswordException') throw new PdfLockedError();
    throw e;
  } finally {
    void task.destroy();
  }
}
