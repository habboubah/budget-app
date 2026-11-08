import { unzipSync, strFromU8 } from 'fflate';
import { FileTooLargeError, LIMITS, checkBytes } from './limits';

/**
 * A minimal .xlsx reader — just enough to read the values out of a workbook
 * like My_expense.xlsx, on the device, offline, without a 500 kB spreadsheet
 * library. An .xlsx is a zip of XML files; this unzips it (fflate) and reads
 * the cell values with plain string matching, so it runs the same in the app
 * and in the unit tests. Formulas are not evaluated: Excel stores each
 * formula's last result next to it, and that is what is read.
 */

export type CellValue = string | number | boolean;

export interface Sheet {
  name: string;
  /** Cell reference ("D2") → value. Empty cells are absent. */
  cells: Map<string, CellValue>;
}

const decode = (s: string) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&amp;/g, '&');

/** Attributes of one XML start tag, by local name (`r:id` → `id`). */
function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([\w:]+)\s*=\s*"([^"]*)"/g)) out[m[1].replace(/^.*:/, '')] = decode(m[2]);
  return out;
}

/** All text of the <t> runs inside a fragment (a shared string, an inline string). */
function text(fragment: string): string {
  return [...fragment.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(m => decode(m[1])).join('');
}

function file(files: Record<string, Uint8Array>, path: string): string | undefined {
  const f = files[path] ?? files[path.replace(/^\//, '')];
  return f ? strFromU8(f) : undefined;
}

/** Column letters of a cell reference: "AB12" → "AB". */
export const colOf = (ref: string) => ref.replace(/\d+$/, '');
/** Row number of a cell reference: "AB12" → 12. */
export const rowOf = (ref: string) => Number(ref.replace(/^[A-Z]+/, ''));
/** "A" → 1, "Z" → 26, "AA" → 27. */
export const colIndex = (col: string) => [...col].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
/** 1 → "A", 27 → "AA". */
export function colName(i: number): string {
  let s = '';
  for (let n = i; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/**
 * Every sheet of the workbook, in the order the tabs are shown. Throws on a
 * file that isn't an .xlsx, and on a zip bomb: the file itself is capped
 * (`xlsxBytes`), only the workbook / shared strings / sheet XML are unzipped,
 * any single entry over `xlsxEntryBytes` is skipped, and once the entries we
 * read pass `xlsxTotalBytes` in total we stop (FileTooLargeError).
 */
export function readXlsx(bytes: Uint8Array): Sheet[] {
  checkBytes(bytes.length, LIMITS.xlsxBytes);
  let unzipped = 0;
  const files = unzipSync(bytes, {
    filter: f => {
      // Only the parts we actually read; skip anything huge (a zip bomb).
      const wanted = f.name === 'xl/workbook.xml'
        || f.name === 'xl/_rels/workbook.xml.rels'
        || f.name === 'xl/sharedStrings.xml'
        || f.name.startsWith('xl/worksheets/');
      if (!wanted) return false;
      if (f.originalSize > LIMITS.xlsxEntryBytes) return false;
      unzipped += f.originalSize;
      if (unzipped > LIMITS.xlsxTotalBytes) throw new FileTooLargeError('importTooLarge');
      return true;
    },
  });
  const workbook = file(files, 'xl/workbook.xml');
  if (!workbook) throw new Error('not an xlsx workbook');

  const rels = new Map<string, string>();
  for (const m of (file(files, 'xl/_rels/workbook.xml.rels') ?? '').matchAll(/<Relationship\b[^>]*>/g)) {
    const a = attrs(m[0]);
    if (a.Id && a.Target) rels.set(a.Id, a.Target);
  }

  const shared = [...(file(files, 'xl/sharedStrings.xml') ?? '').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => text(m[1]));

  const sheets: Sheet[] = [];
  for (const m of workbook.matchAll(/<sheet\b[^>]*>/g)) {
    const a = attrs(m[0]);
    const target = rels.get(a.id ?? '');
    if (!a.name || !target) continue;
    const path = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
    const xml = file(files, path);
    if (!xml) continue;
    const cells = new Map<string, CellValue>();
    for (const c of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ca = attrs(c[1]);
      const body = c[2] ?? '';
      if (!ca.r) continue;
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let value: CellValue | undefined;
      if (ca.t === 's') value = v !== undefined ? shared[Number(v)] : undefined;
      else if (ca.t === 'inlineStr') value = text(body);
      else if (ca.t === 'str') value = v !== undefined ? decode(v) : undefined;
      else if (ca.t === 'b') value = v === '1';
      else if (ca.t === 'e') value = undefined;
      else if (v !== undefined && v !== '') value = Number(v);
      if (value !== undefined && value !== '' && !(typeof value === 'number' && Number.isNaN(value))) cells.set(ca.r, value);
    }
    sheets.push({ name: a.name, cells });
  }
  return sheets;
}
