import type { Strings } from './translations';
import type { GuidePages } from './i18n/guide/de';
import { searchTerms, foldForSearch } from './logic';

/*
 * The guide (Optionen › Anleitung), the tours, and what *Zeigen* points at.
 *
 * How other apps teach, and what was taken from it: Apple's guidelines ask
 * for onboarding that is fast, optional and found again later in a help or
 * settings area, for tips next to the thing they are about, and for learning
 * by doing; the apps people cite as the best let the first action be the
 * product itself and reveal the rest step by step, and help pages that work
 * show the real button inside the sentence and a picture of the screen. So
 * nothing here stands before the first screen. The setup card and the tips
 * (plan 37) stay as they are; this adds the place to look things up — every
 * feature as one sentence, numbered steps and a tip, the buttons drawn as
 * they look, a small picture of the screen — with *Zeigen*, which goes there
 * and lights up the thing to tap, and five short tours of the real screens,
 * which only run when they are asked for.
 *
 * Pure and tested: what the guide lists, what a search finds, which steps a
 * tour has. Its pages are in src/i18n/guide/ (src/guidePages.ts loads a
 * language's), and the screens (GuideView, Tour) are chunks of their own:
 * all of it comes when the guide is opened or a tour begins — the launch
 * pays for none of it.
 */

export const GUIDE_CHAPTERS = ['basics', 'entering', 'planning', 'looking', 'importing', 'more', 'safe'] as const;
export type GuideChapter = (typeof GUIDE_CHAPTERS)[number];

/** Where *Zeigen* leads: a tab, a pushed screen, the entry sheet or the month start's sheet. */
export type GuideAction =
  | 'month' | 'stats' | 'insights' | 'settings'
  | 'entry' | 'monthStart' | 'report'
  | 'categories' | 'dueSoon' | 'favorites' | 'capture' | 'goals' | 'contracts' | 'debts'
  | 'transfer' | 'accounts' | 'projects' | 'tax' | 'reminders';

/** The app's labels and the guide's pages together: what a guide text may be read from. */
export type GuideWords = Strings & GuidePages;

export interface GuideTopic {
  id: string;
  chapter: GuideChapter;
  /** The feature's own label wherever it has one, so the guide says what the screen says. */
  title: keyof GuideWords;
  action?: GuideAction;
  /** What *Zeigen* lights up once there — the button to tap, the card to read — with the topic's summary beside it. */
  point?: MarkId;
  /** The tour that shows this part of the app, offered under the topic. */
  tour?: TourId;
  /** `ios`: only where Shortcuts exist; `app`: only in an installed app (notifications). */
  only?: 'ios' | 'app';
}

export const GUIDE_TOPICS = [
  { id: 'balances', chapter: 'basics', title: 'guideBalances', action: 'month', point: 'balance', tour: 'month' },
  { id: 'paid', chapter: 'basics', title: 'guidePaid', action: 'month', point: 'tick', tour: 'month' },
  { id: 'months', chapter: 'basics', title: 'guideMonths', action: 'month', point: 'month', tour: 'month' },
  { id: 'categories', chapter: 'basics', title: 'categories', action: 'categories' },
  { id: 'search', chapter: 'basics', title: 'searchMonth', action: 'month', point: 'search' },
  { id: 'due', chapter: 'basics', title: 'dueTitle', action: 'dueSoon' },

  { id: 'add', chapter: 'entering', title: 'addEntry', action: 'month', point: 'add', tour: 'entry' },
  { id: 'repeats', chapter: 'entering', title: 'guideRepeats', action: 'entry', point: 'entryRepeat' },
  { id: 'favorites', chapter: 'entering', title: 'favorites', action: 'favorites' },
  { id: 'split', chapter: 'entering', title: 'guideSplit', action: 'month', point: 'tick' },
  { id: 'receipts', chapter: 'entering', title: 'guideReceipts', action: 'entry', point: 'entryReceipt' },
  { id: 'capture', chapter: 'entering', title: 'captureRow', action: 'capture', only: 'ios' },

  { id: 'budgets', chapter: 'planning', title: 'budgetsTitle', action: 'insights', point: 'planBudgets', tour: 'plan' },
  { id: 'goals', chapter: 'planning', title: 'goalsTitle', action: 'goals' },
  { id: 'outlook', chapter: 'planning', title: 'outlookTitle', action: 'insights', point: 'planOutlook', tour: 'plan' },
  { id: 'contracts', chapter: 'planning', title: 'contractsTitle', action: 'contracts' },
  { id: 'debts', chapter: 'planning', title: 'debtsTitle', action: 'debts' },

  { id: 'stats', chapter: 'looking', title: 'statsTitle', action: 'stats', point: 'statsHero', tour: 'stats' },
  { id: 'reports', chapter: 'looking', title: 'reportTitle', action: 'report' },

  { id: 'bank', chapter: 'importing', title: 'guideBank', action: 'month', point: 'actions' },
  { id: 'invoice', chapter: 'importing', title: 'scanInvoice', action: 'month', point: 'actions' },
  { id: 'excel', chapter: 'importing', title: 'importExcel', action: 'transfer' },
  { id: 'reconcile', chapter: 'importing', title: 'reconcileTitle', action: 'month', point: 'actions' },

  { id: 'accounts', chapter: 'more', title: 'accountsTitle', action: 'accounts' },
  { id: 'projects', chapter: 'more', title: 'projectsTitle', action: 'projects' },
  { id: 'tax', chapter: 'more', title: 'taxTitle', action: 'tax' },
  { id: 'monthStart', chapter: 'more', title: 'monthStartRow', action: 'monthStart' },

  { id: 'private', chapter: 'safe', title: 'guidePrivate' },
  { id: 'backup', chapter: 'safe', title: 'transferTitle', action: 'transfer', tour: 'settings' },
  { id: 'lock', chapter: 'safe', title: 'guideLock', action: 'settings', point: 'setSecurity', tour: 'settings' },
  { id: 'reminders', chapter: 'safe', title: 'remindersTitle', action: 'reminders', only: 'app' },
  { id: 'look', chapter: 'safe', title: 'displaySection', action: 'settings', point: 'setDisplay', tour: 'settings' },
] as const satisfies readonly GuideTopic[];

export type GuideTopicId = (typeof GUIDE_TOPICS)[number]['id'];

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/**
 * A topic's words, in the guide's pages: one sentence of what it is
 * (`guideAddSum`), the steps — one a line — (`guideAddSteps`) and a tip
 * (`guideAddTip`). *Zeigen*'s mark shows the sentence.
 */
export function topicText(topic: GuideTopic): { sum: keyof GuidePages; steps: keyof GuidePages; tip: keyof GuidePages } {
  const id = cap(topic.id);
  return { sum: `guide${id}Sum` as keyof GuidePages, steps: `guide${id}Steps` as keyof GuidePages, tip: `guide${id}Tip` as keyof GuidePages };
}

/** The chapters' headings. *Planen* is the tab's own name. */
export const CHAPTER_TITLES: Record<GuideChapter, keyof GuideWords> = {
  basics: 'guideChBasics', entering: 'guideChEntering', planning: 'tabInsights', looking: 'guideChLooking',
  importing: 'guideChImporting', more: 'guideChMore', safe: 'guideChSafe',
};

export interface GuidePlatform {
  /** The iPhone app: Shortcuts automations exist. */
  ios: boolean;
  /** An installed app, iPhone or Android: reminders exist. */
  app: boolean;
}

/** The topics this device can use, in the guide's order. */
export function guideTopics(on: GuidePlatform): GuideTopic[] {
  return (GUIDE_TOPICS as readonly GuideTopic[]).filter(t => (t.only === 'ios' ? on.ios : t.only === 'app' ? on.app : true));
}

/**
 * The buttons a guide text names, drawn where they stand in the sentence
 * (GuideView) and read from the app's own strings — so "tap *Aufteilen*" can
 * never name a button that is called something else, in any language. A few
 * are symbols on screen (+, ⋯, the tick that saves, ⓘ, ‹ ›): their character
 * here, for the search and the tours' plain sentences.
 */
export function guideLabels(t: Strings): Record<string, string> {
  return {
    // The tabs, and the two balances.
    month: t.tabMonth, stats: t.tabStats, plan: t.tabInsights, settings: t.tabSettings, now: t.balanceNow, end: t.balanceEnd,
    // On screen as symbols.
    add: '+', actions: '⋯', save: '✓', info: 'ⓘ', arrows: '‹ ›',
    // The entry sheet.
    repeat: t.repeat, split: t.splitPayAction, refund: t.refund, receipt: t.receipt, tag: t.tag, note: t.note,
    favorite: t.pinFavorite, tax: t.taxPill, undo: t.undo,
    // The month page and its "⋯".
    today: t.toThisMonth, due: t.dueTitle, report: t.reportTitle, csv: t.importCsv, pdf: t.importPdf, photo: t.importPhoto,
    invoice: t.scanInvoice, reconcile: t.reconcileMenuItem, transferNew: t.transferNew, budgetMenu: t.budgetMenu,
    // Statistik and Planen.
    where: t.whereMoneyGoes, share: t.reportShare, budgets: t.budgetsTitle, budgetSet: t.budgetsAdd, goals: t.goalsTitle,
    goalNew: t.goalNew, runway: t.runwayTitle, outlook: t.outlookTitle, whatIf: t.whatIfTitle, contracts: t.contractsTitle,
    // Optionen.
    security: t.securitySection, hide: t.hideAmounts, reminders: t.remindersRow, nudge: t.nudgeRow, capture: t.captureRow,
    review: t.captureReview, display: t.displaySection, language: t.language, appearance: t.appearance, currency: t.currency,
    categories: t.categoriesTitle, favorites: t.favorites, accounts: t.accountsTitle, accountAdd: t.accountAddOther,
    debts: t.debtsTitle, debtAdd: t.debtAdd, projects: t.projectsTitle, projectAdd: t.projectAdd, taxList: t.taxTitle,
    taxSwitch: t.taxSwitch, monthStart: t.monthStartRow, transfer: t.transferTitle, excel: t.importExcel,
    exportData: t.exportData, importData: t.importData, exportCsv: t.exportCsv,
  };
}

/** A guide or tour string with its labels filled in, as plain text. */
export function guideText(words: GuideWords, key: keyof GuideWords): string {
  const labels = guideLabels(words);
  return words[key].replace(/\{(\w+)\}/g, (m, k: string) => labels[k] ?? m);
}

/** A guide string in pieces: text, and the labels it names — for GuideView to draw each as its button. */
export type GuidePart = string | { label: string; key: string };
export function guideParts(words: GuideWords, key: keyof GuideWords): GuidePart[] {
  const labels = guideLabels(words);
  const parts: GuidePart[] = [];
  let last = 0;
  for (const m of words[key].matchAll(/\{(\w+)\}/g)) {
    if (m.index! > last) parts.push(words[key].slice(last, m.index));
    parts.push(labels[m[1]] !== undefined ? { label: labels[m[1]], key: m[1] } : m[0]);
    last = m.index! + m[0].length;
  }
  if (last < words[key].length) parts.push(words[key].slice(last));
  return parts;
}

/** The topics whose title or text holds every word of the search (case-, accent- and letter-form-blind). */
export function searchGuide(topics: GuideTopic[], words: GuideWords, query: string): GuideTopic[] {
  const terms = searchTerms(query);
  if (!terms.length) return topics;
  return topics.filter(topic => {
    const { sum, steps, tip } = topicText(topic);
    const text = foldForSearch([topic.title, sum, steps, tip].map(k => guideText(words, k)).join(' '));
    return terms.every(w => text.includes(w));
  });
}

/** Topics by chapter, in order; chapters without a topic left are dropped. */
export function byChapter(topics: GuideTopic[]): { chapter: GuideChapter; topics: GuideTopic[] }[] {
  return GUIDE_CHAPTERS.map(chapter => ({ chapter, topics: topics.filter(t => t.chapter === chapter) })).filter(g => g.topics.length > 0);
}

/** The topics opened so far, as stored: known ids only, each once. */
export function readGuideSeen(v: unknown): GuideTopicId[] {
  if (!Array.isArray(v)) return [];
  const ids = new Set<string>(GUIDE_TOPICS.map(t => t.id));
  return [...new Set(v.filter((x): x is GuideTopicId => typeof x === 'string' && ids.has(x)))];
}

/* ------------------------------------------------------------------ tours */

/**
 * The tours: a handful of marks on a real screen, one at a time, in the order
 * the eye meets them. Coach marks stop helping after about five, so no tour
 * has more. The month page's ends on the add button — the thing to do — and
 * the entry sheet's on the tick that saves. Only ever started by hand: from
 * the guide, or the month page's from the *Gut zu wissen* card.
 */
export const TOURS = ['month', 'entry', 'stats', 'plan', 'settings'] as const;
export type TourId = (typeof TOURS)[number];

/** What a mark points at (a selector, `data-tour` mostly), its ring's corners, and how it is brought into view. */
export interface TourMark {
  anchor: string;
  radius: number;
  /** `top`: the page's top; `center`: scrolled to the middle; `none`: fixed chrome that never moves. */
  scroll: 'top' | 'center' | 'none';
}

const at = (name: string, radius: number, scroll: TourMark['scroll']): TourMark => ({ anchor: `[data-tour="${name}"]`, radius, scroll });

/** Every mark a tour or a topic's *Zeigen* can light up. */
export const MARKS = {
  // The month page and the tab bar (the first entry's row, tick and all).
  balance: at('balance', 36, 'top'),
  tick: { anchor: '[data-entry-row]', radius: 18, scroll: 'center' },
  month: at('month', 18, 'top'),
  tabs: at('tabs', 999, 'none'),
  add: at('add', 999, 'none'),
  search: at('search', 999, 'top'),
  actions: at('actions', 999, 'top'),
  due: at('due', 24, 'center'),
  // The entry sheet.
  entryAmount: at('entry-amount', 24, 'center'),
  entryName: at('entry-name', 18, 'center'),
  entryCategory: at('entry-category', 18, 'center'),
  entryDetails: at('entry-details', 18, 'center'),
  entryRepeat: at('entry-repeat', 999, 'center'),
  entryReceipt: at('entry-receipt', 999, 'center'),
  save: at('sheet-save', 999, 'none'),
  // Statistik.
  statsRange: at('stats-range', 999, 'top'),
  statsHero: at('stats-hero', 28, 'center'),
  statsChart: at('stats-chart', 24, 'center'),
  statsWhere: at('stats-where', 24, 'center'),
  statsRhythm: at('stats-rhythm', 24, 'center'),
  // Planen.
  planPace: at('plan-pace', 28, 'center'),
  planBudgets: at('plan-budgets', 24, 'center'),
  planRunway: at('plan-runway', 24, 'center'),
  planOutlook: at('plan-outlook', 24, 'center'),
  planGoals: at('plan-goals', 24, 'center'),
  // Optionen.
  setSecurity: at('set-security', 24, 'center'),
  setDisplay: at('set-display', 24, 'center'),
  setBook: at('set-book', 24, 'center'),
  setTransfer: at('set-transfer', 18, 'center'),
} as const satisfies Record<string, TourMark>;
export type MarkId = keyof typeof MARKS;

/** Each tour's marks, in order. */
export const TOUR_STEPS: Record<TourId, readonly MarkId[]> = {
  month: ['balance', 'tick', 'month', 'tabs', 'add'],
  entry: ['entryAmount', 'entryName', 'entryCategory', 'entryDetails', 'save'],
  stats: ['statsRange', 'statsHero', 'statsChart', 'statsWhere', 'statsRhythm'],
  plan: ['planPace', 'planBudgets', 'planRunway', 'planOutlook', 'planGoals'],
  settings: ['setSecurity', 'setDisplay', 'setBook', 'setTransfer'],
};

/** A mark's sentence in a tour: `tourBalance`, `tourEntryAmount` … */
export const markText = (mark: MarkId) => `tour${cap(mark)}` as keyof GuidePages;
/** A tour's name in the guide's list, and the line under it. */
export const tourName = (tour: TourId) => `tourName${cap(tour)}` as keyof GuidePages;
export const tourAbout = (tour: TourId) => `tourAbout${cap(tour)}` as keyof GuidePages;

/** What a mark points at right now: the first match that is really on the screen. */
export function tourAnchor(mark: MarkId): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(MARKS[mark].anchor)) {
    if (el.getClientRects().length > 0 && !el.closest('[inert]')) return el;
  }
  return null;
}

/**
 * The steps a screen can show: a mark that isn't there — no balance yet, no
 * entry to tick, no budget — is left out, so a tour never points at nothing.
 */
export function tourSteps(tour: TourId, present: (mark: MarkId) => boolean): MarkId[] {
  return TOUR_STEPS[tour].filter(present);
}

/**
 * Where the tour's card goes: under the mark when there is room, else above
 * it, else (a mark as tall as the screen) over its lower part. All in px;
 * `gap` is kept between mark and card and from the screen's edges.
 */
export function tourCardPlace(mark: { top: number; bottom: number }, cardHeight: number, viewport: { height: number; top: number; bottom: number }, gap = 12): { top: number; side: 'below' | 'above' | 'over' } {
  const lowest = viewport.height - viewport.bottom - gap - cardHeight;
  const highest = viewport.top + gap;
  if (mark.bottom + gap <= lowest) return { top: mark.bottom + gap, side: 'below' };
  if (mark.top - gap - cardHeight >= highest) return { top: mark.top - gap - cardHeight, side: 'above' };
  return { top: Math.max(highest, lowest), side: 'over' };
}
