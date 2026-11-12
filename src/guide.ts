import type { Strings } from './translations';
import type { GuidePages } from './i18n/guide/de';
import type { MarkId, TourId } from './guideKit';

/*
 * The guide (Mehr › Anleitung), the tours, and what *Zeigen* points at.
 *
 * How other apps teach, and what was taken from it: Apple's guidelines ask
 * for onboarding that is fast, optional and found again later in a help or
 * settings area, for tips next to the thing they are about, and for learning
 * by doing; the apps people cite as the best let the first action be the
 * product itself and reveal the rest step by step, and help pages that work
 * show the real button inside the sentence and a picture of the screen. So
 * nothing here runs by itself. Before the first screen stands only the start
 * (plan 39: three questions, each skippable, whose answer is the app's first
 * screen), and the tips (plan 37) come one at a time; this is the place to
 * look things up — every
 * feature as one sentence, numbered steps and a tip, the buttons drawn as
 * they look, a small picture of the screen — with *Zeigen*, which goes there
 * and lights up the thing to tap, and five short tours of the real screens,
 * which only run when they are asked for.
 *
 * Pure and tested. Here: what the guide lists, by chapter, and what it
 * remembers — what the store and App need from the start. The rest (the
 * labels a text names, the search, the tours' marks) is in src/guideKit.ts,
 * its pages in src/i18n/guide/ (src/guidePages.ts loads a language's), and
 * the screens (GuideView, Tour) are chunks of their own: all of it comes
 * when the guide is opened or a tour begins — the launch pays for none of it.
 */

export const GUIDE_CHAPTERS = ['basics', 'entering', 'planning', 'looking', 'importing', 'more', 'safe'] as const;
export type GuideChapter = (typeof GUIDE_CHAPTERS)[number];

/** Where *Zeigen* leads: a tab, a pushed screen, the entry sheet or the month start's sheet. */
export type GuideAction =
  | 'month' | 'stats' | 'insights' | 'settings'
  | 'entry' | 'monthStart' | 'report' | 'preferences'
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
  { id: 'lock', chapter: 'safe', title: 'guideLock', action: 'preferences', point: 'setSecurity' },
  { id: 'reminders', chapter: 'safe', title: 'remindersTitle', action: 'reminders', only: 'app' },
  { id: 'look', chapter: 'safe', title: 'displaySection', action: 'preferences', point: 'setDisplay' },
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
