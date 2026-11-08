import { CSSProperties, useMemo } from 'react';
import { Search } from 'lucide-react';
import { dayLabel, formatMoney, formatMoneyApprox, monthLabel } from '../logic';
import { Book, payeeDetail } from '../insights';
import { Strings, fmt } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { CategoryTrendChart } from './Charts';

/**
 * One payee across the whole book (S6), from a payee row: how often and
 * since when, the average per entry, the last twelve months in its
 * category's colour and its latest entries — *Alle Einträge* runs the month
 * page's search over every month with its name.
 */
export function PayeeSheet({ book, nameKey, language, t, onClose, onSearch }: {
  book: Book;
  /** The normalised name; null while closed. */
  nameKey: string | null;
  language: string;
  t: Strings;
  onClose: () => void;
  onSearch: (name: string) => void;
}) {
  const p = useMemo(() => (nameKey ? payeeDetail(book, nameKey) : null), [book, nameKey]);
  if (!nameKey || !p) return null;
  const category = book.byId.get(p.categoryId);
  const values = new Map(p.months.map(m => [m.key, m.total]));
  return (
    <Sheet open title={p.name} closeLabel={t.close} onClose={onClose}>
      <div className="space-y-4 pb-2">
        <div>
          <p className="text-body text-fg tabular-nums wrap-prose">
            {fmt(t.payeeSummary, { n: p.count, month: monthLabel(p.first, t.locale), amount: formatMoneyApprox(p.average, t.locale) })}
          </p>
          <p className="text-label text-fg-mute tabular-nums">{fmt(t.payeeTotal, { amount: formatMoney(p.total, t.locale) })}</p>
        </div>
        {category && (
          <div>
            <h3 className="text-caption font-semibold text-fg-mute mb-2">{t.payeeMonths}</h3>
            <CategoryTrendChart category={category} values={values} months={p.months.map(m => m.key)} language={language} t={t} label={p.name} />
          </div>
        )}
        {p.recent.length > 0 && (
          <div>
            <h3 className="text-caption font-semibold text-fg-mute">{t.payeeRecent}</h3>
            <ul className="-mx-1 divide-hairline-inset" style={{ '--sep': '4px' } as CSSProperties}>
              {p.recent.map(e => (
                <li key={e.id} className="min-h-tap px-1 py-2 flex items-center gap-3">
                  <span className="min-w-0 flex-1 text-label text-fg tabular-nums">
                    {e.date ? `${dayLabel(e.date, t.locale)} ${e.month.slice(0, 4)}` : monthLabel(e.month, t.locale)}
                    {!e.paid && <span className="text-fg-mute"> · {t.open}</span>}
                  </span>
                  <span className={`shrink-0 rounded-num text-body font-semibold ${e.paid ? 'text-fg' : 'text-fg-mute'}`}>{formatMoney(e.amount, t.locale)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Button variant="secondary" full icon={Search} onClick={() => onSearch(p.name)}>{t.payeeAll}</Button>
      </div>
    </Sheet>
  );
}
