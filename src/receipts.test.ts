import { describe, expect, it } from 'vitest';
import { readReceipt } from './receipts';
import { attachmentBytes, attachmentIds, backupFiles, carryOver, keepAttachments, makeBackup, normalizeState, parseBackup } from './logic';
import { defaultCategories } from './data/defaults';
import { AppData, Entry } from './types';

/* Receipts and documents (plan 27). The picture itself is checked in the browser (scripts/privacy-check.mjs). */
const entry = (id: string, extra: Partial<Entry> = {}): Entry =>
  ({ id, month: '2026-11', categoryId: 'groceries', name: id, amount: 1000, paid: true, repeat: 'none', seriesId: id, createdAt: 1, ...extra });
const photo = { id: 'p1', name: 'Bon', type: 'image/jpeg' as const, size: 200_000 };
const pdf = { id: 'd1', name: 'Rechnung', type: 'application/pdf' as const, size: 50_000 };
const book = (entries: Entry[]): AppData => ({ categories: defaultCategories(), months: [{ key: '2026-11', startedAt: 0 }], entries });

describe('reading a receipt', () => {
  it('takes the total from the line that names it, not the largest number', () => {
    const text = ['REWE Markt GmbH', 'Musterstr. 1, 63450 Hanau', 'Milch 1,19 B', 'Brot 2,49 B', 'SUMME EUR 3,68', 'Gegeben BAR 50,00', 'Rückgeld 46,32', 'MwSt 7% 0,24'].join('\n');
    expect(readReceipt(text)).toEqual({ amount: 368, shop: 'REWE Markt GmbH' });
  });

  it('knows other words for it, thousands, and falls back to the largest amount', () => {
    expect(readReceipt('Baumarkt\nZwischensumme 1.180,00\nZu zahlen 1.234,56 €').amount).toBe(123456);
    expect(readReceipt('Coffee Shop\nLatte 4.50\nTotal 4.50\nTax 0.36').amount).toBe(450);
    expect(readReceipt('Kiosk\nZeitung 2,80\nKaugummi 1,20').amount).toBe(280);
    expect(readReceipt('12345\n----')).toEqual({});
  });
});

describe('attachments in the book', () => {
  it('normalises them: safe ids, known types, at most five an entry', () => {
    const d = normalizeState({
      ...book([]),
      entries: [{
        ...entry('a'),
        files: [photo, { ...pdf, name: ' Rech\nnung ' }, { ...photo }, { id: '../x', name: 'x', type: 'image/jpeg', size: 1 }, { id: 'z', name: 'z', type: 'text/html', size: 1 },
          ...['f1', 'f2', 'f3', 'f4'].map(id => ({ ...photo, id }))],
      }, entry('b')],
    });
    expect(d.entries[0].files!.map(f => f.id)).toEqual(['p1', 'd1', 'f1', 'f2', 'f3']);
    expect(d.entries[0].files![1].name).toBe('Rech nung');
    expect(d.entries[1]).not.toHaveProperty('files');
  });

  it('counts them, and a carried entry starts without the old receipt', () => {
    const d = book([entry('a', { files: [photo, pdf] }), entry('b', { files: [{ ...photo, id: 'p2' }], repeat: 'monthly' })]);
    expect([...attachmentIds(d)].sort()).toEqual(['d1', 'p1', 'p2']);
    expect(attachmentBytes(d)).toBe(450_000);
    expect(carryOver([d.entries[1]], '2026-12', 5)[0]).not.toHaveProperty('files');
  });

  it('a backup carries the files; an import keeps only the receipts that came along', () => {
    const d = book([entry('a', { files: [photo, pdf] })]);
    const text = JSON.stringify({ ...makeBackup(d), files: { p1: 'QUJD', '../evil': 'QQ==', d1: 'not base64!' } });
    expect(backupFiles(text, 1000)).toEqual({ p1: 'QUJD' });
    expect(backupFiles(text, 1)).toEqual({});
    const parsed = parseBackup(text);
    expect(parsed.ok && parsed.data.entries[0].files).toHaveLength(2);
    const kept = keepAttachments(d, new Set(['p1']));
    expect(kept.entries[0].files).toEqual([photo]);
    expect(keepAttachments(d, new Set())?.entries[0]).not.toHaveProperty('files');
    expect(keepAttachments(d, new Set(['p1', 'd1']))).toBe(d);
    // A backup from before receipts has no files, and still loads.
    expect(backupFiles(JSON.stringify(makeBackup(book([entry('a')]))), 1000)).toEqual({});
  });
});
