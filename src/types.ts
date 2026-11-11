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

/**
 * A `yearly` entry that comes back sooner than a year on (schema 24): every
 * two months, every quarter or every half year. It stays a `yearly` entry in
 * every other respect — a bill outside the monthly run, kept out of trends,
 * counted in the reserve — only its distance in months differs (`Entry.every`,
 * unset = 12; read it with `intervalOf`).
 */
export const INTERVALS = [2, 3, 6] as const;
export type Interval = (typeof INTERVALS)[number];

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
  /** For an expense category: what it may cost a month, in cents — the same
   *  every month, nothing carried over (schema 9). Unset = no budget. Not to
   *  be confused with `budget`, the need / want / save split. */
  limit?: number;
  /** Part of every newly started month. Unset = yes. */
  standard?: boolean;
  /** Ships with the app (can be edited, deleted and restored). */
  builtin?: boolean;
  /**
   * Words that point to this category when typed as an entry's name ("Lidl",
   * "Strom", "Gym") — for the category guess and the name's completion
   * (schema 18, src/keywords.ts). Unset = what a built-in ships with
   * (src/data/keywords.ts); set once edited in Settings, even to none.
   */
  keywords?: string[];
}

/**
 * A recurring cost as a contract (schema 10), kept per entry series, so it
 * follows the bill from month to month: when it runs until, how long before
 * that it must be cancelled, and by how much it renews when it isn't.
 */
export interface Contract {
  /** The day it runs until — and, unless cancelled, renews from — YYYY-MM-DD. */
  end?: string;
  /** Notice in months (Kündigungsfrist): cancel at least this long before `end`. Unset = none. */
  notice?: number;
  /** How many months it renews by when not cancelled. Unset = 12. */
  renews?: number;
  note?: string;
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
  /** With `repeat: 'yearly'`: how many months until it comes back, when not twelve (schema 24). */
  every?: Interval;
  /** The last month a recurring entry runs — nothing is carried over past it (schema 24: an instalment plan, a contract that ends). */
  until?: MonthKey;
  /** Day of the month it is due, 1–31. */
  dueDay?: number;
  /** The day it belongs to, YYYY-MM-DD, inside `month` — today when entered,
   *  changeable in the editor. Entries from before dates existed have none. */
  date?: string;
  note?: string;
  /** Shared by the copies of one recurring entry across months ("Miete" in
   *  October and in November), so carrying over never duplicates. */
  seriesId: string;
  createdAt: number;
  paidAt?: number;
  /** Position inside its category, once the user has dragged entries there.
   *  Entries without one follow, by due day and then as entered. */
  order?: number;
  /** A bank transaction's fingerprint, for entries imported from a statement — the same one isn't imported twice. */
  ref?: string;
  /** The savings goal this paid entry fills (plan 12). Only on `budget: 'save'` categories. */
  goalId?: string;
  /** Free tags (plan 14 data; schema 14), lowercase, without "#", at most 5. */
  tags?: string[];
  /** Shared by the parts of a split payment (schema 16, plan 21). */
  splitId?: string;
  /** The account it was paid from or into (schema 20, plan 30). Unset = the main account. */
  accountId?: string;
  /** The debt this entry pays off — or, for money lent, is paid back on (schema 21, plan 31). */
  debtId?: string;
  /** Receipts and documents attached to it (schema 22, plan 27): what each is; the file itself is kept by storage.ts under its id. */
  files?: Attachment[];
  /**
   * One side of a transfer between two accounts (plan 30): money leaving one
   * account (`out`) and arriving in another (`in`), two entries sharing a
   * `pairId`. Its category is `TRANSFER_CATEGORY`; it is neither income nor
   * expense, so it moves only its account's balance.
   */
  transfer?: Transfer;
}

/** A receipt or document on an entry (plan 27). Photos are always re-encoded JPEGs; a PDF is kept as it came. */
export interface Attachment {
  id: string;
  name: string;
  type: 'image/jpeg' | 'application/pdf';
  /** Bytes, for "Belege: 42 MB". */
  size: number;
}

export interface Transfer {
  pairId: string;
  direction: 'out' | 'in';
}

/** Where money is kept (plan 30): the bank account every book has, cash, a savings account. */
export type AccountKind = 'bank' | 'cash' | 'savings';
export const ACCOUNT_KINDS: readonly AccountKind[] = ['bank', 'cash', 'savings'];

/**
 * An account (schema 20, plan 30). A book has one, the main account (id
 * `main`), until the user adds another; only then are they stored.
 */
export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  emoji: string;
  hue: Hue;
  createdAt: number;
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
  /** When the month was last matched against the bank (ms epoch, plan 10). Unset = never. */
  reconciledAt?: number;
  /** The other accounts' opening balances in cents, by account id (plan 30) — `opening` is the main account's. */
  openings?: Record<string, number>;
}

export type ThemeMode = 'system' | 'light' | 'dark';

/** The app's own colour, chosen in Settings: index.css `[data-accent]`. Petrol is the icon's. */
export const ACCENTS = ['petrol', 'ocean', 'indigo', 'violet', 'berry', 'coral', 'emerald', 'graphite'] as const;
export type Accent = (typeof ACCENTS)[number];

/** Everything that is the user's data — what a backup contains. */
export interface AppData {
  categories: Category[];
  entries: Entry[];
  months: MonthRecord[];
  /** Contract details by `Entry.seriesId` (schema 10). Unset or missing = none. */
  contracts?: Record<string, Contract>;
  /** ISO 4217 currency (schema 11). Unset = EUR, so older books stay as they are. */
  currency?: string;
  /** Pinned entries for one-tap adding (schema 12). Unset or missing = none. */
  favorites?: Favorite[];
  /** Savings goals, "Spartöpfe" (schema 13). Unset or missing = none. */
  goals?: Goal[];
  /** Import rules, applied to bank/other-app imports (schema 15, plan 20). Unset = none. */
  rules?: Rule[];
  /** What the test data (Optionen → Testdaten) added, so removing it leaves the rest as it was (schema 17). Unset = none. */
  demo?: DemoInfo;
  /** The accounts, the main one first, once there is more than one (schema 20, plan 30). Unset = only the main account. */
  accounts?: Account[];
  /** Debts and loans, and money lent (schema 21, plan 31). Unset = none. */
  debts?: Debt[];
  /** The day the months start on, 2–28 (schema 23, plan 32: a month from payday to payday). Unset = the 1st. */
  monthStart?: number;
}

/**
 * A loan or a debt (`owe`), or money lent to someone (`owed`) — plan 31.
 * What is paid back comes from the book: the paid entries of the linked
 * recurring series, and any entry carrying its id (`Entry.debtId`).
 */
export interface Debt {
  id: string;
  name: string;
  direction: 'owe' | 'owed';
  /** What it was at `start`, in cents. */
  principal: number;
  /** The month it began; interest runs from the month after. */
  start: MonthKey;
  /** Interest per year in percent (3.9 = 3,9 %), compounded monthly. Unset = none. */
  rate?: number;
  /** The monthly payment in cents. Unset = the linked series' latest amount. */
  payment?: number;
  /** The recurring entry it is paid with (`Entry.seriesId`). */
  seriesId?: string;
  createdAt: number;
}

/**
 * The test data's own record (schema 17, `src/demo.ts`). Its entries,
 * favourites, goals and contracts carry the `demo-` prefix (entries by their
 * series, so a carried-over copy goes too); this notes what else it touched.
 */
export interface DemoInfo {
  addedAt: number;
  /** Months it started (they go again unless the user put entries of their own in them). */
  months: MonthKey[];
  /** The opening balance it gave its first month, when it set one. */
  opening?: { month: MonthKey; amount: number };
  /** Budgets it set on categories that had none: category id → cents. Cleared again only while unchanged. */
  limits: Record<string, number>;
  /** Built-in categories it brought back because the book did not have them. */
  categories: string[];
}

/** An import rule (plan 20): when a field contains text, set a category/name or skip the row. */
export interface Rule {
  id: string;
  match: { field: 'name' | 'purpose' | 'payee'; contains: string };
  /** Either reclassify/rename the row, or drop it (a transfer). */
  set: { categoryId?: string; name?: string } | { skip: true };
  createdAt: number;
}

/** A savings goal (plan 12). Money "in" a goal is a paid entry in a Sparen category carrying its `goalId`. */
export interface Goal {
  id: string;
  name: string;
  emoji: string;
  hue: Hue;
  /** The target amount in cents. */
  target: number;
  /** Optional target month (YYYY-MM). */
  due?: MonthKey;
  /** An amount already saved before the app tracked it (cents). */
  start?: number;
  createdAt: number;
  /** When the goal was closed (reached or given up); it stays in history. */
  closedAt?: number;
}

/** A pinned entry: one tap adds it, dated today and paid (plan 09). */
export interface Favorite {
  id: string;
  name: string;
  categoryId: string;
  /** Unset means the one-tap opens the sheet with the amount focused instead of saving. */
  amount?: number;
  repeat?: Repeat;
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
  /** The interval of a `yearly` entry that isn't twelve months, and a recurring entry's last month (schema 24). */
  every?: Interval;
  until?: MonthKey;
  dueDay?: number;
  date?: string;
  note?: string;
  /** The savings goal this entry fills (plan 12). */
  goalId?: string;
  /** Free tags (plan 26). */
  tags?: string[];
  /** The account (plan 30). Unset = the main account. */
  accountId?: string;
  /** The debt it pays off (plan 31). */
  debtId?: string;
  /** Receipts and documents (plan 27). */
  files?: Attachment[];
}
