import { MonthKey } from '../types';
import { cleanText, parseAmount } from '../logic';

/*
 * The app's own links (plan 14), for widgets and Shortcuts:
 *   spartopf://add?category=…&amount=…&name=…   the entry sheet, filled in
 *   spartopf://month/2026-11                      that month
 *   spartopf://entry/<id>                         that entry, open to edit
 * Any app or web page can open such a link, so every part is checked and
 * nothing is saved by one: "add" only fills the sheet. Unknown parameters are
 * ignored; anything else is no link (null). Pure and tested (native.test.ts).
 */

export type DeepLink =
  | { kind: 'add'; categoryId?: string; amount?: number; name?: string }
  | { kind: 'month'; month: MonthKey }
  | { kind: 'entry'; id: string };

const ID = /^[A-Za-z0-9_-]{1,64}$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export function parseDeepLink(link: string): DeepLink | null {
  if (typeof link !== 'string' || link.length > 2048) return null;
  let url: URL;
  try { url = new URL(link); } catch { return null; }
  if (url.protocol !== 'spartopf:') return null;
  const parts = url.pathname.split('/').filter(Boolean).map(p => { try { return decodeURIComponent(p); } catch { return ''; } });
  switch (url.hostname) {
    case 'add': {
      if (parts.length) return null;
      const out: DeepLink = { kind: 'add' };
      const category = url.searchParams.get('category');
      if (category && ID.test(category)) out.categoryId = category;
      const amount = url.searchParams.get('amount');
      const cents = amount ? parseAmount(amount) : null;
      if (cents !== null && cents > 0) out.amount = cents;
      const name = cleanText((url.searchParams.get('name') ?? '').replace(/[\u0000-\u001f\u007f]/g, ''));
      if (name) out.name = name;
      return out;
    }
    case 'month':
      return parts.length === 1 && MONTH.test(parts[0]) ? { kind: 'month', month: parts[0] } : null;
    case 'entry':
      return parts.length === 1 && ID.test(parts[0]) ? { kind: 'entry', id: parts[0] } : null;
    default:
      return null;
  }
}
