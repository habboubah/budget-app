/** Colours a category can be painted in. Each has a day and a night rendition
 *  in index.css (`[data-hue=…]`). */
export const HUES = [
  'tomato', 'carrot', 'lemon', 'lime', 'leaf', 'mint', 'sky', 'blue', 'lavender', 'plum', 'berry', 'sand', 'stone',
] as const;
export type Hue = (typeof HUES)[number];

/** A name in one or more languages, keyed by language code (`de`, `en`, …). */
export type Names = Record<string, string>;

/** Income adds to the account, an expense takes from it. */
export type CategoryKind = 'income' | 'expense';

/**
 * Whether an entry comes back in later months. Starting a month copies every
 * `monthly` entry of the previous month and every `yearly` entry of the same
 * month a year earlier — as open entries, to be ticked off when paid.
 */
export const REPEATS = ['none', 'monthly', 'yearly'] as const;
export type Repeat = (typeof REPEATS)[number];

export interface Category {
  id: string;
  names: Names;
  emoji: string;
  hue: Hue;
  kind: CategoryKind;
  /** What a new entry in this category repeats as, until the user picks otherwise. */
  repeat: Repeat;
  /** For an expense category: basic needs (rent, food, the car), wants, or
   *  money put aside (an ETF plan) — the split behind the 50/30/20 check in
   *  the statistics. Unset = want. */
  budget?: Budget;
  /** Part of every newly started month. Unset = yes. */
  standard?: boolean;
  /** Ships with the app (can be edited, deleted and restored). */
  builtin?: boolean;
}

export type Budget = 'need' | 'want' | 'save';

/** A calendar month as `YYYY-MM`. Compare with `<` / `>`: the format sorts. */
export type MonthKey = string;

export interface Entry {
  id: string;
  month: MonthKey;
  categoryId: string;
  name: string;
  /** Integer cents, never negative — the category's kind gives the sign. */
  amount: number;
  /** Expense paid / income received. False = still open (planned / expected). */
  paid: boolean;
  repeat: Repeat;
  /** Day of the month it is due, 1–31. */
  dueDay?: number;
  note?: string;
  /** Shared by the copies of one recurring entry across months ("Miete" in
   *  October and in November), so carrying over never duplicates. */
  seriesId: string;
  createdAt: number;
  paidAt?: number;
  /** Position inside its category, once the user has dragged entries there.
   *  Entries without one follow, by due day and then as entered. */
  order?: number;
}

/** A month the user has started. Entries only live in started months. */
export interface MonthRecord {
  key: MonthKey;
  /** Manual opening balance in cents. Replaces the carry-over from the
   *  previous month — for the very first month, or to match the real bank. */
  opening?: number;
  /** The categories this month shows (besides any that have entries in it).
   *  Set from the standard categories when the month is started; an empty one
   *  can be taken out, another added. Unset (months from before) = all. */
  categories?: string[];
  startedAt: number;
}

export type ThemeMode = 'system' | 'light' | 'dark';

/** Everything that is the user's data — what a backup contains. */
export interface AppData {
  categories: Category[];
  entries: Entry[];
  months: MonthRecord[];
}

/** A backup file / stored payload. */
export interface Backup extends AppData {
  app: 'spartopf';
  schemaVersion: number;
  exportedAt: string;
}

/** What the entry sheet produces. */
export interface EntryDraft {
  categoryId: string;
  name: string;
  amount: number;
  paid: boolean;
  repeat: Repeat;
  dueDay?: number;
  note?: string;
}
