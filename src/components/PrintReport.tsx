import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Accent, AppData, MonthKey } from '../types';
import { dayLabel, displayName, formatMoney, isoDay, monthLabel, signedAmount, sortEntries } from '../logic';
import { Book, monthReview, yearReview } from '../insights';
import { Strings, fmt } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Switch } from '../ui/Switch';
import { MonthReportBody } from './MonthReportView';
import { YearReviewBody } from './YearReviewView';
import { TaxListBody } from './TaxView';
import { taxYear } from '../insights/tax';

/*
 * Plan 28: the month report and the year review as a PDF, to share or print.
 * The report is drawn a second time, outside the app (a portal on <body>),
 * light whatever the theme, and the print stylesheet (index.css, `.print-root`)
 * shows only that: the report, every entry if asked for, and a footer. iOS
 * renders it to a PDF and opens the share sheet (SpartopfShared.makePdf); the
 * web prints it (window.print — "Save as PDF" is the browser's). Amounts are
 * always shown: it is an export the user asked for (App lifts *Beträge
 * verbergen* while it is drawn).
 */

export interface PrintSpec {
  /** `tax`: the year's list for the tax return (schema 29). */
  kind: 'month' | 'year' | 'tax';
  month: MonthKey;
  year: string;
  /** Every entry of the month or the year, as a table after the report. */
  entries: boolean;
}

/** The file name the share sheet shows: "Spartopf Monatsbericht November 2026.pdf". */
export function reportFileName(spec: PrintSpec, t: Strings): string {
  const what = spec.kind === 'month' ? `${t.reportTitle} ${monthLabel(spec.month, t.locale)}` : `${spec.kind === 'tax' ? t.taxTitle : t.yearTitle} ${spec.year}`;
  return `Spartopf ${what}`.replace(/[\\/:*?"<>|]/g, '-');
}

export function PrintReport({ spec, book, data, language, accent, t, today = new Date() }: {
  spec: PrintSpec;
  book: Book;
  data: AppData;
  language: string;
  accent: Accent;
  t: Strings;
  today?: Date;
}) {
  const title = spec.kind === 'month' ? `${t.reportTitle} · ${monthLabel(spec.month, t.locale)}` : `${spec.kind === 'tax' ? t.taxTitle : t.yearTitle} ${spec.year}`;
  return createPortal(
    <div className="print-root text-fg" data-theme="light" data-accent={accent} dir={t.dir} lang={language}>
      <header className="print-head">
        <p className="text-caption text-fg-mute">Spartopf</p>
        <h1 className="display text-title2 font-bold text-fg wrap-compound">{title}</h1>
      </header>
      <div className="space-y-3">
        {spec.kind === 'tax' ? <TaxListBody list={taxYear(data, spec.year)} t={t} />
          : spec.kind === 'month'
          ? <MonthReportBody r={monthReview(book, spec.month, today)} book={book} month={spec.month} language={language} t={t} />
          : <YearReviewBody y={yearReview(book, spec.year, today)} year={spec.year} language={language} t={t} />}
      </div>
      {spec.entries && spec.kind !== 'tax' && <EntriesTable spec={spec} data={data} language={language} t={t} />}
      <footer className="print-foot text-caption text-fg-mute">{fmt(t.reportFooter, { date: dayLabel(isoDay(today), t.locale) })}</footer>
    </div>,
    document.body,
  );
}

/** Every entry of the month (or of each month of the year): date, name, category, amount, open or not. */
function EntriesTable({ spec, data, language, t }: { spec: PrintSpec; data: AppData; language: string; t: Strings }) {
  const head = t.csvHeader.split(';');
  const byId = new Map(data.categories.map(c => [c.id, c]));
  const order = new Map(data.categories.map((c, i) => [c.id, i]));
  const months = spec.kind === 'month'
    ? [spec.month]
    : [...new Set(data.entries.filter(e => e.month.startsWith(`${spec.year}-`)).map(e => e.month))].sort();
  return (
    <section className="print-entries">
      {months.map(m => {
        const rows = sortEntries(data.entries.filter(e => e.month === m))
          .sort((a, b) => (order.get(a.categoryId) ?? 999) - (order.get(b.categoryId) ?? 999));
        if (!rows.length) return null;
        return (
          <table key={m} className="w-full text-caption text-fg">
            <caption className="text-start text-label font-semibold text-fg">{monthLabel(m, t.locale)}</caption>
            <thead>
              <tr className="text-fg-mute">
                <th className="text-start font-medium">{head[9]}</th>
                <th className="text-start font-medium">{head[3]}</th>
                <th className="text-start font-medium">{head[1]}</th>
                <th className="text-end font-medium">{head[4]}</th>
                <th className="text-end font-medium">{head[5]}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(e => {
                const c = byId.get(e.categoryId);
                return (
                  <tr key={e.id}>
                    <td className="tabular-nums whitespace-nowrap">{e.date ? dayLabel(e.date, t.locale) : ''}</td>
                    <td className="wrap-prose">{e.name}</td>
                    <td className="wrap-compound">{c ? displayName(c.names, language) : ''}</td>
                    <td className="num text-end whitespace-nowrap">{formatMoney(signedAmount(e.amount, c?.kind ?? 'expense'), t.locale, 'exceptZero')}</td>
                    <td className="text-end">{e.paid ? '' : t.open}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        );
      })}
    </section>
  );
}

/** *Bericht teilen*: the one choice — every entry or not — and the PDF. */
export function ReportPdfSheet({ open, t, onClose, onMake }: { open: boolean; t: Strings; onClose: () => void; onMake: (entries: boolean) => void }) {
  const [entries, setEntries] = useState(false);
  return (
    <Sheet open={open} title={t.reportShare} closeLabel={t.cancel} onClose={onClose} action={{ label: t.reportMakePdf, onClick: () => onMake(entries) }}>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1 text-body text-fg wrap-compound">{t.reportAllEntries}</span>
          <Switch checked={entries} onChange={setEntries} label={t.reportAllEntries} />
        </div>
        <p className="text-caption text-fg-mute wrap-prose">{t.reportShareNote}</p>
      </div>
    </Sheet>
  );
}
