import type { Strings } from './translations';
import type { GuidePages } from './i18n/guide/de';
import { searchTerms, foldForSearch } from './logic';

/*
 * The guide (Optionen › Anleitung) and the short tour of the month page.
 *
 * How other apps teach, and what was taken from it: Apple's guidelines ask
 * for onboarding that is fast, optional and found again later in a help or
 * settings area, for tips next to the thing they are about, and for learning
 * by doing; the apps people cite as the best let the first action be the
 * product itself and reveal the rest step by step. So nothing here stands
 * before the first screen. The setup card and the tips (plan 37) stay as they
 * are; this adds the place to look things up — every feature in two or three
 * sentences, each with *Zeigen*, which opens the real screen — and a tour of
 * five marks on the real month page, which only runs when it is asked for.
 *
 * Pure and tested: what the guide lists, what a search finds, which steps a
 * tour has. Its pages are in src/i18n/guide/ (src/guidePages.ts loads a
 * language's), and the screens (GuideView, Tour) are chunks of their own:
 * all of it comes when the guide is opened or a tour begins — the launch
 * pays for none of it.
 */

export const GUIDE_CHAPTERS = ['basics', 'entering', 'planning', 'looking', 'importing', 'more', 'safe'] as const;
export type GuideChapter = (typeof GUIDE_CHAPTERS)[number];

/** Where *Zeigen* leads: a tab, a pushed screen, or something the month page opens. */
export type GuideAction =
  | 'month' | 'stats' | 'insights' | 'settings'
  | 'entry' | 'monthPicker' | 'monthMenu' | 'monthStart' | 'report'
  | 'categories' | 'dueSoon' | 'favorites' | 'capture' | 'goals' | 'contracts' | 'debts'
  | 'transfer' | 'accounts' | 'projects' | 'tax' | 'reminders';

/** The app's labels and the guide's pages together: what a guide text may be read from. */
export type GuideWords = Strings & GuidePages;

export interface GuideTopic {
  id: string;
  chapter: GuideChapter;
  /** The feature's own label wherever it has one, so the guide says what the screen says. */
  title: keyof GuideWords;
  body: keyof GuideWords;
  action?: GuideAction;
  /** `ios`: only where Shortcuts exist; `app`: only in an installed app (notifications). */
  only?: 'ios' | 'app';
}

export const GUIDE_TOPICS = [
  { id: 'balances', chapter: 'basics', title: 'guideBalances', body: 'guideBalancesBody', action: 'month' },
  { id: 'paid', chapter: 'basics', title: 'guidePaid', body: 'guidePaidBody', action: 'month' },
  { id: 'months', chapter: 'basics', title: 'guideMonths', body: 'guideMonthsBody', action: 'monthPicker' },
  { id: 'categories', chapter: 'basics', title: 'categories', body: 'guideCategoriesBody', action: 'categories' },
  { id: 'search', chapter: 'basics', title: 'searchMonth', body: 'guideSearchBody', action: 'month' },
  { id: 'due', chapter: 'basics', title: 'dueTitle', body: 'guideDueBody', action: 'dueSoon' },

  { id: 'add', chapter: 'entering', title: 'addEntry', body: 'guideAddBody', action: 'entry' },
  { id: 'repeats', chapter: 'entering', title: 'guideRepeats', body: 'guideRepeatsBody', action: 'entry' },
  { id: 'favorites', chapter: 'entering', title: 'favorites', body: 'guideFavoritesBody', action: 'favorites' },
  { id: 'split', chapter: 'entering', title: 'guideSplit', body: 'guideSplitBody', action: 'month' },
  { id: 'receipts', chapter: 'entering', title: 'guideReceipts', body: 'guideReceiptsBody', action: 'entry' },
  { id: 'capture', chapter: 'entering', title: 'captureRow', body: 'guideCaptureBody', action: 'capture', only: 'ios' },

  { id: 'budgets', chapter: 'planning', title: 'budgetsTitle', body: 'guideBudgetsBody', action: 'categories' },
  { id: 'goals', chapter: 'planning', title: 'goalsTitle', body: 'guideGoalsBody', action: 'goals' },
  { id: 'outlook', chapter: 'planning', title: 'outlookTitle', body: 'guideOutlookBody', action: 'insights' },
  { id: 'contracts', chapter: 'planning', title: 'contractsTitle', body: 'guideContractsBody', action: 'contracts' },
  { id: 'debts', chapter: 'planning', title: 'debtsTitle', body: 'guideDebtsBody', action: 'debts' },

  { id: 'stats', chapter: 'looking', title: 'statsTitle', body: 'guideStatsBody', action: 'stats' },
  { id: 'reports', chapter: 'looking', title: 'reportTitle', body: 'guideReportsBody', action: 'report' },

  { id: 'bank', chapter: 'importing', title: 'guideBank', body: 'guideBankBody', action: 'monthMenu' },
  { id: 'invoice', chapter: 'importing', title: 'scanInvoice', body: 'guideInvoiceBody', action: 'monthMenu' },
  { id: 'excel', chapter: 'importing', title: 'importExcel', body: 'guideExcelBody', action: 'transfer' },
  { id: 'reconcile', chapter: 'importing', title: 'reconcileTitle', body: 'guideReconcileBody', action: 'monthMenu' },

  { id: 'accounts', chapter: 'more', title: 'accountsTitle', body: 'guideAccountsBody', action: 'accounts' },
  { id: 'projects', chapter: 'more', title: 'projectsTitle', body: 'guideProjectsBody', action: 'projects' },
  { id: 'tax', chapter: 'more', title: 'taxTitle', body: 'taxRowSub', action: 'tax' },
  { id: 'monthStart', chapter: 'more', title: 'monthStartRow', body: 'guideMonthStartBody', action: 'monthStart' },

  { id: 'private', chapter: 'safe', title: 'guidePrivate', body: 'guidePrivateBody' },
  { id: 'backup', chapter: 'safe', title: 'transferTitle', body: 'guideBackupBody', action: 'transfer' },
  { id: 'lock', chapter: 'safe', title: 'guideLock', body: 'guideLockBody', action: 'settings' },
  { id: 'reminders', chapter: 'safe', title: 'remindersTitle', body: 'guideRemindersBody', action: 'reminders', only: 'app' },
  { id: 'look', chapter: 'safe', title: 'displaySection', body: 'guideLookBody', action: 'settings' },
] as const satisfies readonly GuideTopic[];

export type GuideTopicId = (typeof GUIDE_TOPICS)[number]['id'];

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
 * The labels a guide text names, filled in from the app's own strings — so
 * "tap *Aufteilen*" can never name a button that is called something else,
 * in any language.
 */
export function guideLabels(t: Strings): Record<string, string> {
  return {
    now: t.balanceNow, end: t.balanceEnd, stats: t.tabStats, plan: t.tabInsights, settings: t.tabSettings,
    repeat: t.repeat, split: t.splitPayAction, refund: t.refund, receipt: t.receipt, tag: t.tag,
    whatIf: t.whatIfTitle, accounts: t.accountsTitle, display: t.displaySection,
  };
}

/** A guide or tour string with its labels filled in. */
export function guideText(words: GuideWords, key: keyof GuideWords): string {
  const labels = guideLabels(words);
  return words[key].replace(/\{(\w+)\}/g, (m, k: string) => labels[k] ?? m);
}

/** The topics whose title or text holds every word of the search (case-, accent- and letter-form-blind). */
export function searchGuide(topics: GuideTopic[], words: GuideWords, query: string): GuideTopic[] {
  const terms = searchTerms(query);
  if (!terms.length) return topics;
  return topics.filter(topic => {
    const text = foldForSearch(`${guideText(words, topic.title)} ${guideText(words, topic.body)}`);
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

/* ------------------------------------------------------------------- tour */

/**
 * The tour: five marks on the running month's page, in the order the eye
 * meets them — and the add button last, so the tour ends on the thing to do.
 * Coach marks stop helping after about five, so there are no more.
 */
export const TOUR_STEPS = ['balance', 'tick', 'month', 'tabs', 'add'] as const;
export type TourStep = (typeof TOUR_STEPS)[number];

/** What a step points at (`data-tour` on the month page and the tab bar; the first entry's row, tick and all). */
export const TOUR_ANCHORS: Record<TourStep, string> = {
  balance: '[data-tour="balance"]',
  tick: '[data-entry-row]',
  month: '[data-tour="month"]',
  tabs: '[data-tour="tabs"]',
  add: '[data-tour="add"]',
};

/** What a step points at right now: the first match that is really on the page. */
export function tourAnchor(step: TourStep): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(TOUR_ANCHORS[step])) {
    if (el.getClientRects().length > 0 && !el.closest('[inert]')) return el;
  }
  return null;
}

export const TOUR_TEXT: Record<TourStep, keyof GuidePages> = {
  balance: 'tourBalance', tick: 'tourTick', month: 'tourMonth', tabs: 'tourTabs', add: 'tourAdd',
};

/**
 * The steps a page can show: one whose anchor isn't there — no balance yet,
 * no entry to tick — is left out, so the tour never points at nothing.
 */
export function tourSteps(present: (step: TourStep) => boolean): TourStep[] {
  return TOUR_STEPS.filter(present);
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
