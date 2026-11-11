import { Interval, Repeat } from './types';
import { Strings } from './translations';

type Recurs = { repeat: Repeat; every?: number };

/** "mtl.", "viertelj.", "jährl." — how often a recurring amount comes, beside the amount (schema 24). */
export function perShort(t: Strings, e: Recurs): string {
  if (e.repeat === 'monthly') return t.perMonthShort;
  return e.every === 2 ? t.per2MonthsShort : e.every === 3 ? t.perQuarterShort : e.every === 6 ? t.perHalfYearShort : t.perYearShort;
}

/** "Monatlich", "Vierteljährlich", "Jährlich" — a repeat by its name, as the entry sheet's menu and the CSV say it. */
export function repeatName(t: Strings, e: Recurs): string {
  if (e.repeat === 'none') return t.repeatNone;
  if (e.repeat === 'monthly') return t.repeatMonthly;
  return e.every === 2 ? t.repeatEvery2 : e.every === 3 ? t.repeatQuarterly : e.every === 6 ? t.repeatHalfYearly : t.repeatYearly;
}

/** The entry sheet's choices, in the order of the menu: once, monthly, every 2 / 3 / 6 months, yearly. */
export const REPEAT_CHOICES: { repeat: Repeat; every?: Interval }[] = [
  { repeat: 'none' }, { repeat: 'monthly' }, { repeat: 'yearly', every: 2 }, { repeat: 'yearly', every: 3 }, { repeat: 'yearly', every: 6 }, { repeat: 'yearly' },
];
