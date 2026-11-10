import { CSSProperties, ReactNode, useMemo } from 'react';
import { ChevronRight, FileText, X } from 'lucide-react';
import { MonthKey } from '../types';
import { displayName, formatMoney, formatMoneyApprox, formatPercent, monthLabel } from '../logic';
import { Book, MonthReview, monthReview } from '../insights';
import { Strings, fmt } from '../translations';
import { Empty, Screen } from '../ui/Screen';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { tapLight } from '../ui/haptics';
import { MiniBars, ShareBar } from './Charts';
import { HintRow } from './HintRows';

/** The report's first sentence: what the month saved, against a usual one. */
export function reviewResult(r: MonthReview, t: Strings): string {
  const month = monthLabel(r.month, t.locale, 'name');
  const money = (c: number) => formatMoneyApprox(Math.abs(c), t.locale);
  if (r.point.saved < 0) return fmt(t.reportResultOver, { month, amount: money(r.point.saved) });
  const saved = money(r.point.saved);
  if (r.usualSaved === null || r.running) return fmt(t.reportResultPlain, { month, saved });
  const diff = r.point.saved - r.usualSaved;
  if (Math.abs(diff) < 2500) return fmt(t.reportResultSame, { month, saved });
  return fmt(diff > 0 ? t.reportResultMore : t.reportResultLess, { month, saved, diff: money(diff) });
}

/** A part of the report under its heading. */
function Part({ title, children }: { title: string; children: ReactNode }) {
  return <Card title={title}>{children}</Card>;
}

/**
 * The Monatsbericht (§9.7, plan 13), for any month — the running one says
 * "läuft noch": the result against a usual month, four tiles, the budgets,
 * what changed, where the money went, what is still open (*Abhaken* opens
 * the month) and a look at the month after. Its figures are Statistik's.
 */
export function MonthReportView({ book, month, language, t, onBack, onOpenMonth, onPdf }: {
  book: Book;
  month: MonthKey;
  language: string;
  t: Strings;
  onBack: () => void;
  onOpenMonth: (m: MonthKey) => void;
  /** *Bericht teilen* (plan 28): a PDF of this report. */
  onPdf?: () => void;
}) {
  const r = useMemo(() => monthReview(book, month, new Date()), [book, month]);
  const title = monthLabel(month, t.locale);
  return (
    <Screen title={t.reportTitle} eyebrow={r.running ? fmt(t.reportRunning, { month: title }) : title} onBack={onBack} backLabel={t.back} tabbed>
      <MonthReportBody r={r} book={book} month={month} language={language} t={t} onOpenMonth={onOpenMonth} />
      {!r.empty && onPdf && <Button variant="secondary" full icon={FileText} onClick={onPdf}>{t.reportShare}</Button>}
    </Screen>
  );
}

/** The report itself — on the screen, and in the printed PDF (plan 28's `PrintReport`). */
export function MonthReportBody({ r, book, month, language, t, onOpenMonth }: {
  r: MonthReview;
  book: Book;
  month: MonthKey;
  language: string;
  t: Strings;
  onOpenMonth?: (m: MonthKey) => void;
}) {
  const money = (c: number) => formatMoney(c, t.locale);
  const approx = (c: number) => formatMoneyApprox(c, t.locale);
  const byId = book.byId;
  if (r.empty) return <Empty emoji="🗓️" title={fmt(t.reportEmpty, { month: monthLabel(month, t.locale, 'name') })} />;

  const p = r.point;
  const tiles = [
    { label: t.income, value: approx(p.income) },
    { label: t.expenses, value: approx(p.spending) },
    { label: t.saved, value: approx(p.saved), tone: p.saved < 0 ? 'text-neg' : 'text-fg' },
    { label: t.savingsRateTitle, value: p.rate === null ? '–' : formatPercent(Math.round(p.rate * 100), t.locale) },
  ];
  const spendTotal = r.categories.reduce((s, c) => s + c.amount, 0);

  return (
    <>
      <section className="rounded-md bg-surface card-edge p-[16px]">
        <h2 className={`display text-heading font-semibold tabular-nums wrap-prose ${p.saved < 0 ? 'text-neg' : 'text-fg'}`}>{reviewResult(r, t)}</h2>
        {r.usualSaved !== null && !r.running && (
          <MiniBars rows={[
            { label: monthLabel(month, t.locale, 'month'), value: Math.max(0, p.saved), text: approx(p.saved) },
            { label: t.reportUsual, value: Math.max(0, r.usualSaved), text: approx(r.usualSaved), faded: true },
          ]} />
        )}
        {p.invested > 0 && <p className="text-caption text-fg-mute mt-2 tabular-nums">{fmt(t.investedOf, { amount: money(p.invested) })}</p>}
      </section>

      <dl className="grid grid-cols-2 gap-2">
        {tiles.map(x => (
          <div key={x.label} className="min-w-0 flex flex-col justify-between rounded-md bg-surface card-edge px-3 py-2.5">
            <dt className="text-caption text-fg-mute wrap-compound">{x.label}</dt>
            <dd className={`mt-0.5 rounded-num text-heading font-semibold ${x.tone ?? 'text-fg'}`}>{x.value}</dd>
          </div>
        ))}
      </dl>

      {r.budgets.total > 0 && (
        <Part title={t.budgetsTitle}>
          <p className="text-body text-fg tabular-nums">{fmt(t.reportBudgetsLine, { n: r.budgets.within, total: r.budgets.total })}</p>
          {r.budgets.over.length > 0 && (
            <p className="text-label text-warn font-semibold mt-0.5 tabular-nums wrap-prose">
              {fmt(t.reportBudgetsOver, { names: r.budgets.over.map(o => `${displayName(o.category.names, language)} (+${approx(o.over)})`).join(', ') })}
            </p>
          )}
        </Part>
      )}

      <Part title={t.reportChanges}>
        {r.hints.length === 0 ? (
          <p className="text-label text-fg-mute wrap-prose">{t.reportChangesNone}</p>
        ) : (
          <ul className="-my-3 divide-hairline-inset" style={{ '--sep': '48px' } as CSSProperties}>
            {r.hints.map(i => <HintRow key={i.id} insight={i} category={i.categoryId ? byId.get(i.categoryId) : undefined} language={language} t={t} compact />)}
          </ul>
        )}
      </Part>

      {r.categories.length > 0 && (
        <Part title={t.reportWhere}>
          <ShareBar
            label={r.categories.slice(0, 5).map(c => `${displayName(c.category.names, language)} ${formatPercent(Math.round((c.amount / Math.max(1, spendTotal)) * 100), t.locale)}`).join(', ')}
            items={r.categories.map(c => ({ key: c.category.id, hue: c.category.hue, value: c.amount }))}
          />
          <ul className="mt-3 -mx-4 -mb-2 divide-hairline-inset" style={{ '--sep': '16px' } as CSSProperties}>
            {r.categories.map(c => (
              <li key={c.category.id} className="min-h-tap px-4 py-2 flex items-baseline gap-2">
                <span className="emoji text-[15px]" aria-hidden="true">{c.category.emoji}</span>
                <span className="min-w-0 flex-1 text-label text-fg wrap-compound">{displayName(c.category.names, language)}</span>
                {c.usual !== null && <span className="shrink-0 text-caption text-fg-mute tabular-nums">{fmt(t.reportVsUsual, { amount: approx(c.usual) })}</span>}
                <span className="shrink-0 rounded-num text-label font-semibold text-fg">{money(c.amount)}</span>
              </li>
            ))}
          </ul>
        </Part>
      )}

      <Part title={t.reportOpen}>
        {r.open.count === 0 ? (
          <p className="text-label text-fg-mute">{t.reportOpenNone}</p>
        ) : (
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-body text-warn font-semibold tabular-nums wrap-prose">{fmt(t.reportOpenLine, { n: r.open.count, amount: money(r.open.expense) })}</p>
              {r.open.income > 0 && <p className="text-label text-fg-mute tabular-nums wrap-prose">{fmt(t.reportOpenIncome, { amount: money(r.open.income) })}</p>}
            </div>
            {onOpenMonth && <button
              type="button"
              onClick={() => { tapLight(); onOpenMonth(month); }}
              className="shrink-0 -me-2 h-tap px-2 inline-flex items-center gap-1 text-label font-semibold text-accent rounded-sm active:opacity-60 focus-visible:ring-focus"
            >
              {t.reportOpenAction}
              <ChevronRight className="w-4 h-4 rtl:rotate-180" strokeWidth={2.4} aria-hidden="true" />
            </button>}
          </div>
        )}
      </Part>

      <Part title={fmt(t.reportNext, { month: monthLabel(r.next.month, t.locale, 'name') })}>
        <p className="text-body text-fg tabular-nums">{fmt(t.reportNextFixed, { amount: approx(r.next.fixed) })}</p>
        <p className="text-label text-fg-mute mt-0.5 tabular-nums wrap-prose">
          {r.next.yearly.length
            ? fmt(t.reportNextYearly, { items: r.next.yearly.map(y => `${y.name} ${money(y.amount)}`).join(', ') })
            : t.reportNextNone}
        </p>
      </Part>
    </>
  );
}

/**
 * The month-review card (plan 13) above the running month's categories: the
 * month before in one line — saved against usual, a budget count, what is
 * still open. A tap opens its report; ✕ puts it away (both count as seen).
 */
export function ReviewCard({ review: r, t, onOpen, onHide }: { review: MonthReview; t: Strings; onOpen: () => void; onHide: () => void }) {
  const approx = (c: number) => formatMoneyApprox(Math.abs(c), t.locale);
  const month = monthLabel(r.month, t.locale, 'name');
  const parts = [
    r.point.saved < 0 ? fmt(t.reviewCardOver, { amount: approx(r.point.saved) }) : fmt(t.reviewCardSaved, { amount: approx(r.point.saved) }),
    r.usualSaved !== null && r.point.saved >= 0 && Math.abs(r.point.saved - r.usualSaved) >= 2500
      ? fmt(r.point.saved > r.usualSaved ? t.reviewCardMore : t.reviewCardLess, { diff: approx(r.point.saved - r.usualSaved) }) : null,
    r.budgets.total ? fmt(t.reviewCardBudgets, { n: r.budgets.within, total: r.budgets.total }) : null,
    r.open.count ? fmt(t.reviewCardOpen, { n: r.open.count }) : null,
  ].filter(Boolean);
  return (
    <div className="relative rounded-md bg-surface card-edge">
      <button
        type="button"
        onClick={() => { tapLight(); onOpen(); }}
        className="w-full min-h-[72px] ps-4 pe-14 py-3.5 text-start rounded-md active:bg-surface-2 transition-colors focus-visible:ring-focus"
      >
        <span className="block display text-heading font-semibold text-fg wrap-compound">{fmt(t.reviewCardTitle, { month })}</span>
        <span className="block text-label text-fg-mute mt-0.5 tabular-nums wrap-prose">{parts.join(' · ')}</span>
      </button>
      <button
        type="button"
        onClick={() => { tapLight(); onHide(); }}
        aria-label={t.reviewCardHide}
        title={t.reviewCardHide}
        className="absolute top-1 end-1 h-tap w-tap inline-flex items-center justify-center rounded-full text-fg-mute active:bg-surface-2 focus-visible:ring-focus"
      >
        <X className="w-5 h-5" strokeWidth={2.4} aria-hidden="true" />
      </button>
    </div>
  );
}
