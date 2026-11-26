// The film: Spartopf's App Store preview, chapter by chapter. This file and
// the copy next to it (copy.<lang>.json) are all that is about this app —
// the scripts play any storyboard.
//
// A chapter is a caption and what happens after it:
//   caption  the key of its line in copy.<lang>.json › captions. It stands on
//            the frozen screen for `hold` seconds, then the screen comes alive.
//   hold     how long the caption stands, with its fades (about 0.6 s of it).
//   setup    (optional) gets the app somewhere else first, off camera; the
//            video dissolves to it.
//   run      what is filmed: `a` taps, scrolls and lights things up (the verbs
//            are in scripts/film.mjs › Actor), `w` are the app's own words
//            in the language being filmed (scripts/lib/shots.mjs › words).
//   card     the end card instead: the icon, the name and the points from
//            copy.<lang>.json › card, for `seconds`.
//
// Every label a tap needs comes from the app's strings (`w.t`), like the store
// screenshots — one storyboard films every language, and a renamed button
// stops the run with a message instead of filming the wrong thing. The film
// runs on the store screenshots' household: six invented months with salary,
// rent, groceries and four budgets (scripts/lib/shots.mjs › sampleData).
import {
  PORT, ORIGIN, LOCALE, SCREENS, categoryCard, sheet, loadSource as loadShotsSource, storage, words,
} from '../../../../scripts/lib/shots.mjs';
import { MENU, TILE } from '../../../../scripts/nav.mjs';

/** Where the built app is served while it is filmed (the screenshot scripts' port). */
export const server = { port: PORT, origin: ORIGIN };

// The source (strings, categories, schema) is read once; prefs() needs it.
let source = null;
export async function loadSource() {
  source = await loadShotsSource();
  return source;
}
export { words };

/**
 * The video. 886 × 1920 is what App Store Connect takes for every iPhone
 * from 6.1″ to 6.9″; at scale 2 the app is laid out 443 × 960 pt, an iPhone
 * Pro Max. reference/app-preview-specs.md has the numbers and their source.
 */
export const video = {
  width: 886,
  height: 1920,
  scale: 2,
  fps: 30,
  // Apple takes 15 to 30 seconds. A film that comes out longer than `maxSeconds`
  // is played a little faster (up to 15 %); past that the run stops.
  minSeconds: 15,
  maxSeconds: 29.5,
  // The room an iPhone keeps for the status bar and the home indicator, in pt.
  safeArea: { top: 59, bottom: 34 },
  // The status bar and the home indicator a screen recording has. false leaves them out.
  statusBar: { time: '9:41' },
  // A dot where each tap lands (Apple: "touch hotspots").
  touchDots: true,
  // A soundtrack, as a path from the repo's root — only music Ahmad may use
  // for advertising, everywhere. null: a silent track (previews play muted).
  music: null,
};

export const locales = ['de', 'en', 'ar'];
export const browserLocale = LOCALE;

/** The app's storage as a real household would have it: six months, four budgets, past the first run. */
export const prefs = lang => Object.fromEntries(Object.entries(storage(source, lang)).filter(([, v]) => v !== null));

/**
 * Before the camera runs: the month page of the running month. The app keeps
 * room for the status bar and the home indicator through env(), which a
 * desktop browser answers with 0 — Chromium is told the iPhone's insets.
 */
export async function prepare(page) {
  try {
    const cdp = await page.context().newCDPSession(page);
    const { top, bottom } = video.safeArea;
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top, topMax: top, bottom, bottomMax: bottom, left: 0, leftMax: 0, right: 0, rightMax: 0 } });
  } catch {
    console.log('  ! this Chromium cannot emulate the safe area: the app runs under the drawn status bar.');
  }
  await page.goto(`${ORIGIN}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
}

/* ------------------------------------------------------------ what is tapped */

const button = label => `button[aria-label="${label.replace(/"/g, '\\"')}"]`;

/**
 * The parts a chapter may light up or tap, by name. The store screenshots'
 * marks (scripts/lib/shots.mjs › SCREENS) all work here, plus what only the
 * film needs.
 */
export const marks = w => ({
  ...Object.assign({}, ...SCREENS.filter(s => s.marks).map(s => s.marks)),
  // The round "+" beside ☰: a new entry in the month shown.
  add: button(w.t.addEntry),
  save: `${sheet} button:text-is("${w.t.save}")`,
  next: button(w.t.nextMonth),
  // Statistik's "Wofür das Geld geht" and the groceries row in it.
  where: `main section:has(h3:has-text("${w.t.whereMoneyGoes}"))`,
  'where-groceries': `main section:has(h3:has-text("${w.t.whereMoneyGoes}")) li[data-hue] > button:has-text("${w.groceries}")`,
  groceries: categoryCard('groceries'),
});

/**
 * To one of the app's pages (0 Monat, 1 Statistik, 2 Planen) with taps the
 * film shows, the way scripts/nav.mjs › goTab gets there: back to the month
 * (✕ closes the menu, ‹ leaves a pushed screen), then ☰ and the page's tile.
 */
async function goTo(a, n, { dot = true } = {}) {
  for (let i = 0; i < 6; i++) {
    const close = a.page.locator('[data-nav="close"]:visible');
    const back = a.page.locator('[data-nav="back"]:visible');
    if (await close.count()) await a.tap(close.first(), { dot });
    else if (await back.count()) await a.tap(back.first(), { dot });
    else if (await a.page.locator(`${MENU}:visible`).count()) break;
    else throw new Error('goTo: neither ☰, ‹ nor ✕ on the screen');
    await a.pause(0.4);
  }
  if (n === 0) return;
  await a.tap(a.page.locator(`${MENU}:visible`).first(), { dot });
  await a.pause(0.4);
  await a.tap(TILE(n), { dot });
}

/* -------------------------------------------------------------- the chapters */

// The story: what is left at the month's end (the balance card) → a purchase
// noted in seconds → where the money goes (a category's own page) → the next
// month started with one tap → the icon and the name.
export const chapters = [
  {
    id: 'balance',
    caption: 'balance',
    hold: 2.2,
    run: async a => {
      // The month with its two balances: the still the App Store shows where
      // the video does not play.
      a.poster();
      await a.pause(0.4);
      await a.spotlight('balance', 1.6);
      await a.pause(0.3);
    },
  },
  {
    id: 'entry',
    caption: 'entry',
    hold: 2.0,
    run: async (a, w) => {
      await a.tap('add');
      await a.see(sheet);
      await a.pause(0.6);
      // The amount field has the focus as the sheet opens: type straight in.
      await a.page.keyboard.type(w.amount, { delay: 85 });
      await a.pause(0.4);
      const group = a.page.locator(sheet).getByRole('group', { name: w.t.suggestions });
      const chip = group.locator(`button:text-is("${w.chip}")`);
      if (!(await chip.isVisible())) await a.tap(group.locator('button[aria-expanded="false"]'));
      await a.tap(chip);
      await a.pause(0.7);
      await a.tap('save');
      await a.pause(1.1);
    },
  },
  {
    id: 'stats',
    caption: 'stats',
    hold: 2.0,
    run: async a => {
      await goTo(a, 1);
      await a.pause(0.8);
      await a.scrollTo('where', { block: 'start', seconds: 0.8 });
      await a.pause(0.5);
      await a.tap('where-groceries');
      await a.pause(0.8);
      await a.page.evaluate(() => window.scrollTo(0, 0));
      await a.spotlight('figures', 1.4);
      await a.pause(0.3);
    },
  },
  {
    id: 'next',
    caption: 'next',
    hold: 2.0,
    setup: async a => {
      // Back on the month page, at its top.
      await goTo(a, 0, { dot: false });
      await a.pause(0.5);
      await a.page.evaluate(() => window.scrollTo(0, 0));
      await a.pause(0.3);
    },
    run: async a => {
      await a.tap('next');
      // The toast: "Dezember 2026 gestartet – 10 Posten übernommen".
      await a.see('started');
      await a.pause(0.3);
      await a.spotlight('started', 1.4);
      await a.pause(0.4);
    },
  },
  { id: 'end', card: true, seconds: 2.5 },
];
