import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { colIndex, colName, readXlsx } from './xlsx';
import { applyExcelImport, fixYears, monthFromSheetName, planExcelImport, replacedMonths, splitDue } from './excelImport';
import { computeBalances } from './logic';
import { defaultCategories } from './data/defaults';

/**
 * Builds a real .xlsx in memory — shared strings, numbers, a formula with its
 * cached result, an inline string — laid out like My_expense.xlsx (made-up
 * numbers): headers in row 1, name / paid / open per category.
 */
type Rows = Record<string, string | number | { f: string; v: number }>;
function workbook(sheets: { name: string; cells: Rows }[]): Uint8Array {
  const shared: string[] = [];
  const s = (t: string) => { let i = shared.indexOf(t); if (i === -1) { shared.push(t); i = shared.length - 1; } return i; };
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const files: Record<string, Uint8Array> = {};
  sheets.forEach((sh, i) => {
    const rows = new Map<number, string[]>();
    for (const [ref, v] of Object.entries(sh.cells)) {
      const r = Number(ref.replace(/^[A-Z]+/, ''));
      const xml = typeof v === 'number' ? `<c r="${ref}"><v>${v}</v></c>`
        : typeof v === 'object' ? `<c r="${ref}"><f>${v.f}</f><v>${v.v}</v></c>`
          : v.startsWith('inline:') ? `<c r="${ref}" t="inlineStr"><is><t>${esc(v.slice(7))}</t></is></c>`
            : `<c r="${ref}" t="s"><v>${s(v)}</v></c>`;
      rows.set(r, [...(rows.get(r) ?? []), xml]);
    }
    const body = [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([r, cs]) => `<row r="${r}">${cs.join('')}</row>`).join('');
    files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(`<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`);
  });
  files['xl/workbook.xml'] = strToU8(`<?xml version="1.0"?><workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${
    sheets.map((sh, i) => `<sheet name="${esc(sh.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`);
  files['xl/_rels/workbook.xml.rels'] = strToU8(`<?xml version="1.0"?><Relationships>${
    sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`);
  files['xl/sharedStrings.xml'] = strToU8(`<?xml version="1.0"?><sst>${shared.map(t => `<si><t xml:space="preserve">${esc(t)}</t></si>`).join('')}</sst>`);
  return zipSync(files);
}

const HEAD: Rows = { C1: 'Einkommen', F1: 'Fixed Kosten', I1: 'Sonder Kosten', L1: 'Einkaufen', O1: 'Auto', R1: 'Hobby', A2: 'Einkommen', B2: { f: 'SUM(D2:D57)', v: 1 } };

const book = workbook([
  { name: '09.2026', cells: { ...HEAD,
    C2: 'Gehalt', D2: 3000, C3: 'Before', D3: 1000,
    F2: 'Miete(01)', G2: 900, F3: 'Strom (03.07)', G3: 80,
    L2: 'Lidl', M2: 45.5, L3: 'Rewe', M3: { f: '20+5', v: 25 },
    O2: 'Versicherung(14)', P2: 50, R2: 'Gitarre', S2: 120 } },
  { name: '10.2025', cells: { ...HEAD, // a typo: really October 2026
    C2: 'Gehalt', D2: 3100, C3: 'Before', D3: 2780.5,
    F2: 'Miete(01)', G2: 900, F3: 'Strom (03.07)', H3: 80,
    L2: 'Lidl', M2: 60, O2: 'Versicherung(14)', P2: 50,
    I2: 'inline:Brille (26.06.2026)', J2: 0 } },
  { name: '11.2026', cells: { ...HEAD,
    C2: 'Gehalt', E2: 3100, C3: 'Before', D3: 9999, C4: 'Kindergeld(17)', E4: 255,
    F2: 'Miete(01)', H2: 900, L2: 'Lidl', M2: 33.3, O2: 'Versicherung(14)', Q2: 50 } },
  { name: 'Gold', cells: { A1: 'Gramm', B1: 10 } },
]);

describe('reading .xlsx', () => {
  it('reads shared strings, numbers, cached formula results and inline strings', () => {
    const sheets = readXlsx(book);
    expect(sheets.map(s => s.name)).toEqual(['09.2026', '10.2025', '11.2026', 'Gold']);
    const sep = sheets[0].cells;
    expect(sep.get('C1')).toBe('Einkommen');
    expect(sep.get('M2')).toBe(45.5);
    expect(sep.get('M3')).toBe(25);
    expect(sheets[1].cells.get('I2')).toBe('Brille (26.06.2026)');
  });
  it('refuses a file that is not a workbook', () => {
    expect(() => readXlsx(zipSync({ 'a.txt': strToU8('x') }))).toThrow();
    expect(() => readXlsx(strToU8('not a zip'))).toThrow();
  });
  it('converts column names', () => {
    expect(colIndex('A')).toBe(1);
    expect(colIndex('AA')).toBe(27);
    expect(colName(27)).toBe('AA');
    expect(colName(colIndex('XFD'))).toBe('XFD');
  });
});

describe('months from tab names', () => {
  it('understands the common ways to write a month', () => {
    expect(monthFromSheetName('11.2026')).toBe('2026-11');
    expect(monthFromSheetName('1/2026')).toBe('2026-01');
    expect(monthFromSheetName('2026-03')).toBe('2026-03');
    expect(monthFromSheetName('11.26')).toBe('2026-11');
    expect(monthFromSheetName('Capfun 06.2026')).toBeNull();
    expect(monthFromSheetName('13.2026')).toBeNull();
  });
  it('fixes a year that breaks the order of the tabs, and only then', () => {
    expect(fixYears(['2026-07', '2025-08', '2026-09'])).toEqual(['2026-07', '2026-08', '2026-09']);
    expect(fixYears(['2026-09', '2025-10'])).toEqual(['2026-09', '2026-10']);
    expect(fixYears(['2025-12', '2026-01'])).toEqual(['2025-12', '2026-01']);
    expect(fixYears(['2024-05'])).toEqual(['2024-05']);
  });
});

describe('due days in names', () => {
  it('takes the day out of the brackets', () => {
    expect(splitDue('DEVK Versicherung(14) ')).toEqual({ name: 'DEVK Versicherung', dueDay: 14 });
    expect(splitDue('Vodafone(18.06)')).toEqual({ name: 'Vodafone', dueDay: 18 });
    expect(splitDue('Brille (26.06.2026)')).toEqual({ name: 'Brille', dueDay: 26, note: '26.06.2026' });
    expect(splitDue('DFV(Zahn versicherung)(01)')).toEqual({ name: 'DFV(Zahn versicherung)', dueDay: 1 });
  });
  it('leaves other brackets alone', () => {
    expect(splitDue('Opel steuer 67 (02.2025)')).toEqual({ name: 'Opel steuer 67 (02.2025)' });
    expect(splitDue('Rundfunk (01.07.2026, 55.08)')).toEqual({ name: 'Rundfunk (01.07.2026, 55.08)' });
    expect(splitDue('(14)')).toEqual({ name: '(14)' });
  });
});

describe('planning the import', () => {
  const cats = defaultCategories();
  let n = 0;
  const plan = planExcelImport(readXlsx(book), cats, 'de', 1000, () => `id${++n}`);
  const [sep, oct, nov] = plan.months;

  it('reads the month tabs only, in order, with the typo fixed', () => {
    expect(plan.months.map(m => m.key)).toEqual(['2026-09', '2026-10', '2026-11']);
    expect(oct.correctedFrom).toBe('2025-10');
    expect(plan.skipped).toEqual(['Gold']);
  });

  it('maps the headers to categories and creates the unknown ones', () => {
    expect(plan.mapping.map(m => [m.header, m.categoryId, m.created])).toEqual([
      ['Einkommen', 'income', false], ['Fixed Kosten', 'fixed', false], ['Sonder Kosten', 'extra', false],
      ['Einkaufen', 'groceries', false], ['Auto', 'car', false], ['Hobby', 'id1', true],
    ]);
    expect(plan.newCategories).toMatchObject([{ id: 'id1', names: { de: 'Hobby' }, kind: 'expense' }]);
  });

  it('turns paid / open columns into paid / open entries, due days and all', () => {
    expect(sep.entries.find(e => e.name === 'Miete')).toMatchObject({ categoryId: 'fixed', amount: 90000, paid: true, dueDay: 1 });
    expect(oct.entries.find(e => e.name === 'Strom')).toMatchObject({ amount: 8000, paid: false, dueDay: 3 });
    expect(nov.entries.find(e => e.name === 'Kindergeld')).toMatchObject({ categoryId: 'income', amount: 25500, paid: false, dueDay: 17 });
    expect(oct.entries.find(e => e.name === 'Brille')).toMatchObject({ amount: 0, paid: true, note: '26.06.2026' });
    expect(sep.entries.some(e => e.name === 'Before')).toBe(false);
  });

  it('marks what comes back every month, and shares a series across months', () => {
    const rent = plan.months.flatMap(m => m.entries.filter(e => e.name === 'Miete'));
    expect(rent.map(e => e.repeat)).toEqual(['monthly', 'monthly', 'monthly']);
    expect(new Set(rent.map(e => e.seriesId)).size).toBe(1);
    expect(nov.entries.find(e => e.name === 'Versicherung')?.repeat).toBe('monthly'); // same amount twice
    expect(nov.entries.find(e => e.name === 'Lidl')?.repeat).toBe('none'); // a different amount every time
    expect(nov.entries.find(e => e.name === 'Kindergeld')?.repeat).toBe('none'); // only once so far
    expect(nov.entries.find(e => e.name === 'Gehalt')?.repeat).toBe('monthly');
  });

  it('opens with "Before", and keeps a later "Before" only where Excel was corrected by hand', () => {
    expect(sep.opening).toBe(100000);
    // September: 1000 + 3000 − 900 − 80 − 45.50 − 25 − 50 − 120 = 2779.50; the sheet says 2780.50.
    expect(oct.opening).toBe(278050);
    // October ends at 2780.50 + 3100 − 900 − 60 − 50 = 4870.50; November's 9999 is a hand correction too.
    expect(nov.opening).toBe(999900);
  });

  it('replaces only the months in the file and lands on the sheet’s balances', () => {
    const before = {
      categories: cats,
      entries: [
        { id: 'keep', month: '2026-08', categoryId: 'fixed', name: 'Alt', amount: 100, paid: true, repeat: 'none' as const, seriesId: 'keep', createdAt: 0 },
        { id: 'gone', month: '2026-11', categoryId: 'fixed', name: 'Test', amount: 100, paid: true, repeat: 'none' as const, seriesId: 'gone', createdAt: 0 },
      ],
      months: [{ key: '2026-08', startedAt: 0 }, { key: '2026-11', startedAt: 0 }],
    };
    expect(replacedMonths(before, plan)).toEqual(['2026-11']);
    const after = applyExcelImport(before, plan, 5);
    expect(after.months.map(m => m.key)).toEqual(['2026-08', '2026-09', '2026-10', '2026-11']);
    expect(after.entries.some(e => e.id === 'keep')).toBe(true);
    expect(after.entries.some(e => e.id === 'gone')).toBe(false);
    expect(after.categories.map(c => c.id)).toContain('id1');
    const b = computeBalances(after);
    expect(b.find(x => x.key === '2026-09')?.now).toBe(277950);
    expect(b.find(x => x.key === '2026-10')?.now).toBe(487050);
  });
});
