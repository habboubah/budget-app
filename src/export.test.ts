import { describe, expect, it } from 'vitest';
import { safeFileName } from './export';

describe('safeFileName', () => {
  it('keeps an ordinary name and its extension', () => {
    expect(safeFileName('spartopf-backup-2026-11-11.json')).toBe('spartopf-backup-2026-11-11.json');
    expect(safeFileName('Kassenbon Rewe.jpg')).toBe('Kassenbon Rewe.jpg');
  });
  it('never lets a name become a path', () => {
    expect(safeFileName('Rechnung 11/2026.pdf')).toBe('Rechnung 11-2026.pdf');
    expect(safeFileName('../../Library/spartopf/data.json.jpg')).toBe('-..-Library-spartopf-data.json.jpg');
    expect(safeFileName('..\\..\\x.jpg')).toBe('-..-x.jpg');
    expect(safeFileName('a:b*c?"<>|.pdf')).toBe('a-b-c-----.pdf');
  });
  it('falls back when nothing is left', () => {
    expect(safeFileName('..')).toBe('Haushaltsbuch Einfach');
    expect(safeFileName('.jpg')).toBe('Haushaltsbuch Einfach.jpg');
    expect(safeFileName(' . .pdf')).toBe('Haushaltsbuch Einfach.pdf');
    expect(safeFileName('/.pdf')).toBe('-.pdf');
  });
  it('drops control characters and caps the length', () => {
    expect(safeFileName('a\u0000b\nc.jpg')).toBe('a-b-c.jpg');
    expect(safeFileName(`${'x'.repeat(300)}.pdf`)).toBe(`${'x'.repeat(100)}.pdf`);
  });
});
