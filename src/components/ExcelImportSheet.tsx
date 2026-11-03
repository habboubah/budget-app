import { CSSProperties } from 'react';
import { ArrowRight, Info } from 'lucide-react';
import { Category, MonthKey } from '../types';
import { ImportPlan, mappedName } from '../excelImport';
import { formatMoney, monthLabel } from '../logic';
import { Strings, fmt, plural } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';

interface Props {
  plan: ImportPlan | null;
  fileName: string;
  /** Months that already have entries and would be replaced. */
  replaced: MonthKey[];
  categories: Category[];
  language: string;
  t: Strings;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * What an Excel file will become, before anything is written: every month
 * found (and a tab whose year was a typo), how the columns map onto
 * categories, which tabs are left out, and which months get replaced.
 */
export function ExcelImportSheet({ plan, fileName, replaced, categories, language, t, onClose, onConfirm }: Props) {
  const money = (c: number) => formatMoney(c, t.locale);
  const n = plan?.months.length ?? 0;
  const first = plan?.months[0];

  return (
    <Sheet open={!!plan} title={t.excelTitle} closeLabel={t.cancel} onClose={onClose}>
      {plan && (
        <div className="space-y-5">
          <div>
            <p className="text-label text-fg-mute wrap-compound">{fileName}</p>
            <p className="display text-heading font-semibold text-fg mt-0.5">
              {plural(n, t.excelMonthsOne, t.excelMonthsMany)} · {plural(plan.entryCount, t.entriesOne, t.entriesMany)}
            </p>
            {first && (
              <p className="text-label text-fg-mute mt-0.5">
                {monthLabel(first.key, t.locale)}{n > 1 && <> – {monthLabel(plan.months[n - 1].key, t.locale)}</>}
              </p>
            )}
          </div>

          <ul className="rounded-md bg-surface-2 divide-hairline-inset max-h-[40vh] overflow-y-auto">
            {plan.months.map((m, i) => (
              <li key={m.key} className="relative px-4 py-2.5" style={{ '--sep': '1rem' } as CSSProperties}>
                <div className="flex items-baseline gap-3">
                  <span className="min-w-0 flex-1 text-body text-fg">{monthLabel(m.key, t.locale)}</span>
                  <span className="text-caption text-fg-mute tabular-nums">{plural(m.entries.length, t.entriesOne, t.entriesMany)}</span>
                </div>
                <div className="flex flex-wrap gap-x-3 text-caption tabular-nums">
                  <span className="text-pos">+{money(m.income)}</span>
                  <span className="text-fg-mute">−{money(m.expense)}</span>
                  {m.correctedFrom && <span className="text-warn font-semibold">{fmt(t.excelTab, { sheet: m.sheet })} → {monthLabel(m.key, t.locale, 'short')}</span>}
                </div>
                {m.opening !== undefined && (
                  <p className="text-caption text-fg-mute mt-0.5">
                    {i === 0 ? t.excelOpening : `${t.carryManual} (${t.excelCorrection})`}: <span className="num font-semibold text-fg">{money(m.opening)}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>

          <div>
            <p className="eyebrow text-fg-mute mb-2">{t.excelColumns}</p>
            <ul className="space-y-1">
              {plan.mapping.map(m => (
                <li key={m.header} className="flex items-center gap-2 text-label">
                  <span className="text-fg-mute wrap-compound">{m.header}</span>
                  <ArrowRight className="w-4 h-4 text-fg-faint shrink-0 rtl:rotate-180" aria-hidden="true" />
                  <span className="font-semibold text-fg wrap-compound">{mappedName(plan, categories, m.categoryId, language)}</span>
                  {m.created && <span className="px-2 rounded-full bg-accent-dim text-accent text-micro font-bold">{t.excelNew}</span>}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2 text-caption text-fg-mute wrap-prose">
            <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1.5">
              <p>{t.excelRepeatNote}</p>
              {plan.skipped.length > 0 && <p>{fmt(t.excelSkipped, { names: plan.skipped.join(', ') })}</p>}
            </div>
          </div>

          {replaced.length > 0 && (
            <p role="note" className="rounded-sm bg-warn-dim px-4 py-3 text-label text-warn font-semibold wrap-prose">
              {fmt(t.excelReplaces, { months: replaced.map(k => monthLabel(k, t.locale)).join(', ') })}
            </p>
          )}

          <div className="grid gap-2">
            <Button full size="lg" disabled={n === 0} onClick={onConfirm}>
              {plural(n, t.excelConfirmOne, t.excelConfirmMany)}
            </Button>
            <Button full variant="secondary" onClick={onClose}>{t.cancel}</Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
