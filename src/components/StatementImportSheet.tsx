import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { Category } from '../types';
import { dayLabel, displayName, formatMoney, monthLabel } from '../logic';
import { PlannedRow } from '../statementImport';
import { Strings, fmt } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { tapLight } from '../ui/haptics';

export type ImportState =
  | null
  | { phase: 'reading'; source: 'photo' | 'csv'; progress: number }
  | { phase: 'review'; source: 'photo' | 'csv'; rows: PlannedRow[] };

interface Props {
  state: ImportState;
  categories: Category[];
  language: string;
  t: Strings;
  onClose: () => void;
  onConfirm: (rows: PlannedRow[]) => void;
  /** A row's category was changed — offer to make it an import rule (plan 20). */
  onReclassified?: (row: PlannedRow, categoryId: string, anchor: HTMLElement) => void;
  /** The account the rows go into, once there is more than one (plan 30). */
  accountLabel?: string;
}

/**
 * The bank transactions found in a CSV export or a photo, to check before
 * anything is written: one row each — taken over or not, its name and
 * category (both can be changed), date and amount, and what will happen: a
 * new entry, already entered (left out unless ticked), or an open entry that
 * gets ticked off. Grouped by month; nothing changes until the button.
 */
export function StatementImportSheet({ state, categories, language, t, onClose, onConfirm, onReclassified, accountLabel }: Props) {
  const [rows, setRows] = useState<PlannedRow[]>([]);
  useEffect(() => { if (state?.phase === 'review') setRows(state.rows); }, [state]);
  const money = (c: number, income: boolean) => formatMoney(income ? c : -c, t.locale, 'exceptZero');
  const patch = (key: string, p: Partial<PlannedRow>) => setRows(rs => rs.map(r => (r.key === key ? { ...r, ...p } : r)));
  const chosen = rows.filter(r => r.include).length;
  const counts = useMemo(() => ({
    fresh: rows.filter(r => r.status === 'new').length,
    exists: rows.filter(r => r.status === 'exists').length,
    pay: rows.filter(r => r.status === 'pay').length,
  }), [rows]);
  const groups = useMemo(() => {
    const by = new Map<string, PlannedRow[]>();
    for (const r of rows) {
      const k = r.found.date?.slice(0, 7) ?? '';
      by.set(k, [...(by.get(k) ?? []), r]);
    }
    return [...by].sort(([a], [b]) => (a < b ? 1 : -1));
  }, [rows]);
  const title = state?.source === 'photo' ? t.importPhoto : t.importCsv;
  const allOn = rows.every(r => r.include || r.status === 'exists');

  return (
    <Sheet
      open={!!state}
      title={state?.phase === 'review' ? t.importTitle : title}
      closeLabel={t.cancel}
      onClose={onClose}
      action={state?.phase === 'review' ? { label: fmt(t.importConfirm, { n: chosen }), onClick: () => onConfirm(rows), disabled: chosen === 0 } : undefined}
    >
      {state?.phase === 'reading' && (
        <div className="py-10 text-center" role="status">
          <p className="display text-heading font-semibold text-fg">{t.importReading}</p>
          <div className="mt-4 mx-auto max-w-xs h-2 rounded-full bg-surface-2 overflow-hidden" aria-hidden="true">
            <div className="h-full rounded-full bg-accent-fill transition-[width] duration-300" style={{ width: `${Math.round(state.progress * 100)}%` }} />
          </div>
          <p className="mt-2 text-caption text-fg-mute tabular-nums">{Math.round(state.progress * 100)} %</p>
          <p className="mt-6 text-label text-fg-mute wrap-prose">{t.importReadingNote}</p>
        </div>
      )}

      {state?.phase === 'review' && (
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <p className="min-w-0 flex-1 text-label text-fg-mute tabular-nums wrap-prose">
              {fmt(t.importFound, { n: rows.length })}
              {' · '}{fmt(t.importCounts, { fresh: counts.fresh, exists: counts.exists, pay: counts.pay })}
              {accountLabel && <span className="block mt-0.5 font-medium text-fg">{fmt(t.importIntoAccount, { account: accountLabel })}</span>}
            </p>
            <button
              type="button"
              onClick={() => { tapLight(); setRows(rs => rs.map(r => ({ ...r, include: allOn ? false : r.status !== 'exists' }))); }}
              className="shrink-0 text-label font-semibold text-accent active:opacity-60 focus-visible:ring-focus rounded-sm"
            >
              {allOn ? t.importSelectNone : t.importSelectAll}
            </button>
          </div>

          {groups.map(([month, list]) => (
            <section key={month}>
              <h3 className="px-1 pb-1.5 eyebrow text-fg-mute">{month ? monthLabel(month, t.locale) : t.importNoDate}</h3>
              <ul className="rounded-md bg-surface card-edge overflow-hidden divide-hairline-inset" style={{ '--sep': '52px' } as React.CSSProperties}>
                {list.map(r => {
                  const c = categories.find(x => x.id === r.categoryId);
                  return (
                    <li key={r.key} data-hue={c?.hue} className={`relative flex items-start gap-3 ps-3 pe-4 py-2.5 ${r.include ? '' : 'opacity-60'}`}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={r.include}
                        aria-label={fmt(t.importInclude, { name: r.name })}
                        onClick={() => { tapLight(); patch(r.key, { include: !r.include }); }}
                        className="shrink-0 w-7 h-11 -my-1 flex items-center justify-center focus-visible:ring-focus rounded-sm"
                      >
                        <span className={`w-[22px] h-[22px] rounded-full inline-flex items-center justify-center ${
                          r.include ? 'bg-accent-fill text-accent-fill-ink' : 'border-[1.75px] border-fg-faint'}`} aria-hidden="true">
                          {r.include && <Check className="w-3.5 h-3.5" strokeWidth={3.25} />}
                        </span>
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <input
                            value={r.name}
                            onChange={e => patch(r.key, { name: e.target.value })}
                            aria-label={t.whatFor}
                            maxLength={80}
                            className="min-w-0 flex-1 bg-transparent text-body text-fg outline-none focus:underline decoration-accent underline-offset-4"
                          />
                          <span className={`shrink-0 text-body font-semibold num ${r.found.income ? 'text-pos' : 'text-fg'}`}>{money(r.found.amount, r.found.income)}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-fg-mute">
                          {r.found.date && <span className="whitespace-nowrap">{dayLabel(r.found.date, t.locale)}</span>}
                          {/* The chip shows the category; the native picker lies invisibly over it. */}
                          <label className="relative inline-flex items-center gap-1 rounded-full bg-hue-bg text-hue-ink ps-1.5 pe-2.5 py-0.5 font-medium focus-within:ring-focus">
                            <span className="emoji text-[13px]" aria-hidden="true">{c?.emoji}</span>
                            <span aria-hidden="true" className="wrap-compound">{c ? displayName(c.names, language) : ''}</span>
                            <span className="sr-only">{t.category}</span>
                            <select
                              value={r.categoryId}
                              onChange={e => { const id = e.target.value; patch(r.key, { categoryId: id }); onReclassified?.({ ...r, categoryId: id }, id, e.currentTarget); }}
                              disabled={r.status === 'pay'}
                              className="absolute inset-0 w-full opacity-0 appearance-none"
                            >
                              {categories.map(x => <option key={x.id} value={x.id}>{displayName(x.names, language)}</option>)}
                            </select>
                          </label>
                          {r.status === 'exists' && <span>{t.importStatusExists}</span>}
                          {r.status === 'pay' && <span className="text-warn font-medium wrap-prose">{fmt(t.importStatusPay, { name: r.match?.name ?? '' })}</span>}
                          {r.found.foreignCurrency && <span className="text-warn font-medium wrap-prose">{fmt(t.importForeignCurrency, { currency: r.found.foreignCurrency })}</span>}
                          {r.skipped && <span className="text-fg-mute wrap-prose">{t.ruleSkipShort}</span>}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          <div className="pt-1 pb-2">
            <Button full size="lg" disabled={chosen === 0} onClick={() => onConfirm(rows)}>{fmt(t.importConfirm, { n: chosen })}</Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
