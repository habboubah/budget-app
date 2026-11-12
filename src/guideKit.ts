import type { Strings } from './translations';
import type { GuidePages } from './i18n/guide/de';
import { searchTerms, foldForSearch } from './logic';
import { GuideTopic, GuideWords, topicText } from './guide';

/*
 * The guide's machinery that only the guide and the tours need (src/guide.ts
 * has the rest): the buttons a text names, the search, and the tours' marks.
 * A chunk of its own — App loads it with the tour, GuideView with itself —
 * so the main bundle carries none of it. Pure and tested (guide.test.ts).
 */

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
    taxSwitch: t.taxSwitch, rules: t.rulesRow, monthStart: t.monthStartRow, transfer: t.transferTitle, excel: t.importExcel,
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
  setMore: at('set-more', 24, 'center'),
  setTransfer: at('set-transfer', 24, 'center'),
} as const satisfies Record<string, TourMark>;
export type MarkId = keyof typeof MARKS;

/** Each tour's marks, in order. */
export const TOUR_STEPS: Record<TourId, readonly MarkId[]> = {
  month: ['balance', 'tick', 'month', 'tabs', 'add'],
  entry: ['entryAmount', 'entryName', 'entryCategory', 'entryDetails', 'save'],
  stats: ['statsRange', 'statsHero', 'statsChart', 'statsWhere', 'statsRhythm'],
  plan: ['planPace', 'planBudgets', 'planRunway', 'planOutlook', 'planGoals'],
  settings: ['setTransfer', 'setBook', 'setMore', 'setDisplay', 'setSecurity'],
};

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
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
