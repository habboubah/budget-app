import { FileDown } from 'lucide-react';
import { TaxKind } from '../types';
import { TaxYear } from '../insights';
import { dayLabelYear, formatMoney, monthLabel } from '../logic';
import { Strings, fmt } from '../translations';
import { Screen, Empty, Group, MenuRow } from '../ui/Screen';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';

/** A tax kind's name ("Handwerker", "Kinderbetreuung"). */
export function taxKindLabel(kind: TaxKind, t: Strings): string {
  return { craftsman: t.taxCraftsman, household: t.taxHousehold, childcare: t.taxChildcare, donation: t.taxDonation, work: t.taxWork, health: t.taxHealth, other: t.taxOther }[kind];
}

/** The year's list as it is read and printed: per kind its entries (day, name, amount) and its sum, then the sum of all. */
export function TaxListBody({ list, t }: { list: TaxYear; t: Strings }) {
  return (
    <div className="space-y-4">
      {list.groups.map(g => (
        <section key={g.kind} className="rounded-md bg-surface card-edge px-4 py-3">
          <div className="flex items-baseline gap-3">
            <h3 className="min-w-0 flex-1 text-heading font-semibold text-fg wrap-compound">{taxKindLabel(g.kind, t)}</h3>
            <span className="shrink-0 rounded-num text-body font-semibold text-fg">{formatMoney(g.total, t.locale)}</span>
          </div>
          <table className="mt-2 w-full text-label text-fg">
            <tbody>
              {g.entries.map(e => (
                <tr key={e.id} className="align-baseline">
                  <td className="py-1 pe-3 text-fg-mute tabular-nums whitespace-nowrap">{e.date ? dayLabelYear(e.date, t.locale) : monthLabel(e.month, t.locale)}</td>
                  <td className="py-1 pe-3 wrap-prose">{e.name}{e.note ? <span className="text-fg-mute"> · {e.note}</span> : null}</td>
                  <td className="py-1 num text-end whitespace-nowrap">{formatMoney(e.amount, t.locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <p className="px-1 flex items-baseline gap-3 text-body font-semibold text-fg">
        <span className="min-w-0 flex-1">{fmt(t.taxTotal, { year: list.year })}</span>
        <span className="shrink-0 rounded-num">{formatMoney(list.total, t.locale)}</span>
      </p>
      <p className="px-1 text-caption text-fg-mute wrap-prose">{t.taxHint}</p>
    </div>
  );
}

/**
 * Mehr › Werkzeuge › Steuerliste (pushed, schema 29): the switch that
 * puts the tax mark into the entry sheet, and the year's marked expenses by
 * kind, to share as a PDF.
 */
export function TaxView({ list, years, marks, t, onBack, onYear, onMarks, onPdf }: {
  list: TaxYear;
  years: string[];
  marks: boolean;
  t: Strings;
  onBack: () => void;
  onYear: (year: string) => void;
  onMarks: (on: boolean) => void;
  onPdf: () => void;
}) {
  return (
    <Screen title={t.taxTitle} subtitle={t.taxIntro} onBack={onBack} backLabel={t.back} tabbed>
      <Group footer={t.taxSwitchHint}>
        <div className="min-h-[52px] ps-4 pe-2 py-1 flex items-center gap-3">
          <span className="min-w-0 flex-1 text-body text-fg wrap-compound" aria-hidden="true">{t.taxSwitch}</span>
          <Switch checked={marks} onChange={onMarks} label={t.taxSwitch} />
        </div>
        {years.length > 1 && (
          <MenuRow<string> label={t.taxYearLabel} value={list.year} onChange={onYear} options={years.map(y => ({ value: y, label: y }))} />
        )}
      </Group>
      {list.count === 0 ? (
        <Empty emoji="🧾" title={fmt(t.taxEmpty, { year: list.year })} body={t.taxEmptyBody} />
      ) : (
        <>
          <TaxListBody list={list} t={t} />
          <Button full variant="secondary" icon={FileDown} onClick={onPdf}>{t.reportShare}</Button>
        </>
      )}
    </Screen>
  );
}
