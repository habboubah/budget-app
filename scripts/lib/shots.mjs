// Shared by scripts/screenshots.mjs (the store captures) and the app preview
// video (.claude/skills/app-preview-video/config/storyboard.mjs): six months
// of believable data, the app's own words, how each store screen is reached
// and where its parts are.
//
// The labels the clicks need are the app's own: src/translations.ts (and,
// for the Android captures, src/i18n/android.ts) is loaded through Vite, so
// renaming a button in the app can't silently break a capture, and one list
// of screens is right in German, English and Arabic.
//
// A store screen also says where its parts are (`marks`): the store set lifts
// pieces of a screen out of the phone (store-screenshot-studio's call-outs),
// and finds them by name in `<screen>.marks.json`, written next to the capture.
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { createServer, preview } from 'vite';
import { goTab } from '../nav.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PORT = 4319;
export const ORIGIN = `http://127.0.0.1:${PORT}`;
/** The Android captures run on Vite's dev server: only there does the browser take Android's face (`spartopf-dev-platform`). */
export const DEV_PORT = 4320;
export const DEV_ORIGIN = `http://127.0.0.1:${DEV_PORT}`;

/** 430 × 932 pt at 3x = 1290 × 2796, the raw capture size. */
export const IPHONE = { width: 430, height: 932, scale: 3 };
/** The store languages, and the browser locale each is captured in. */
export const LANGS = ['de', 'en', 'ar'];
export const LOCALE = { de: 'de-DE', en: 'en-GB', ar: 'ar' };

/** The names in the sample data, per language: what a household in that language would write. */
const NAMES = {
  de: {
    salary: 'Gehalt', child: 'Kindergeld', rent: 'Miete', power: 'Strom', net: 'Internet', phone: 'Handy',
    ins: 'Haftpflicht', gym: 'Fitnessstudio', fuel: 'Tanken', carIns: 'Kfz-Versicherung', carTax: 'Kfz-Steuer',
    shops: ['Lidl', 'Rewe', 'dm', 'Aldi', 'Edeka'], extras: ['Amazon', 'Apotheke', 'Restaurant', 'Kleidung'], kita: 'Kita',
  },
  en: {
    salary: 'Salary', child: 'Child benefit', rent: 'Rent', power: 'Electricity', net: 'Internet', phone: 'Mobile phone',
    ins: 'Liability insurance', gym: 'Gym', fuel: 'Fuel', carIns: 'Car insurance', carTax: 'Car tax',
    shops: ['Lidl', 'Tesco', 'Boots', 'Aldi', 'Sainsbury’s'], extras: ['Amazon', 'Pharmacy', 'Restaurant', 'Clothes'], kita: 'Daycare',
  },
  ar: {
    salary: 'الراتب', child: 'إعانة الأطفال', rent: 'الإيجار', power: 'الكهرباء', net: 'الإنترنت', phone: 'الجوال',
    ins: 'تأمين المسؤولية', gym: 'النادي الرياضي', fuel: 'وقود', carIns: 'تأمين السيارة', carTax: 'ضريبة السيارة',
    shops: ['Lidl', 'سوبرماركت', 'صيدلية', 'Aldi', 'مخبز'], extras: ['أمازون', 'دواء', 'مطعم', 'ملابس'], kita: 'الحضانة',
  },
};
/** What the entry screen types, in the way each language writes it, and the suggestion it taps. */
const ENTRY = { de: { amount: '47,85', chip: 'Lidl' }, en: { amount: '47.85', chip: 'Lidl' }, ar: { amount: '47.85', chip: 'Lidl' } };

/** Six months of believable data ending in the running month, partly paid (as in ui-review.mjs). */
export function sampleData(n) {
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const now = new Date();
  const key = off => { const d = new Date(now.getFullYear(), now.getMonth() + off, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const today = now.getDate();
  let id = 0;
  const entries = [];
  const day = (m, d) => `${m}-${String(d).padStart(2, '0')}`;
  const add = (month, categoryId, name, euros, paid, d, extra = {}) => entries.push({
    id: `s${++id}`, month, categoryId, name, amount: Math.round(euros * 100), paid, repeat: 'none',
    seriesId: extra.seriesId ?? `s${id}`, createdAt: id, date: day(month, d), ...(paid ? { paidAt: id } : {}), ...extra,
  });
  const monthly = name => ({ repeat: 'monthly', seriesId: name });
  const months = [];
  for (let off = -5; off <= 0; off++) {
    const m = key(off);
    months.push(off === -5 ? { key: m, opening: 820000, startedAt: id } : { key: m, startedAt: id });
    const cur = off === 0;
    const last = cur ? Math.max(1, today) : 28;
    const paidBy = due => !cur || due <= today;
    const anyDay = () => 1 + Math.floor(rnd() * last);
    add(m, 'income', n.salary, 3480 + Math.round(rnd() * 120), paidBy(28), 28, monthly(n.salary));
    add(m, 'income', n.child, 255, paidBy(17), 17, monthly(n.child));
    add(m, 'fixed', n.rent, 1050, paidBy(1), 1, monthly(n.rent));
    add(m, 'fixed', n.power, 83, paidBy(3), 3, monthly(n.power));
    add(m, 'fixed', n.net, 39.99, paidBy(18), 18, monthly(n.net));
    add(m, 'fixed', n.phone, 19.99, paidBy(22), 22, monthly(n.phone));
    add(m, 'fixed', n.ins, 6.5, paidBy(1), 1, monthly(n.ins));
    add(m, 'fixed', n.gym, 24.9, paidBy(15), 15, monthly(n.gym));
    add(m, 'car', n.carIns, 54.26, paidBy(14), 14, monthly(n.carIns));
    if (off === -2) add(m, 'car', n.carTax, 140, true, 9, { repeat: 'yearly', seriesId: n.carTax });
    const trips = cur ? 2 : 3 + Math.round(rnd() * 2);
    for (let i = 0; i < trips; i++) add(m, 'car', n.fuel, 55 + Math.round(rnd() * 3000) / 100, true, anyDay());
    const shopping = cur ? 5 : 9 + Math.round(rnd() * 4);
    for (let i = 0; i < shopping; i++) add(m, 'groceries', n.shops[Math.floor(rnd() * n.shops.length)], 12 + Math.round(rnd() * 8500) / 100, true, anyDay());
    for (const x of n.extras) if (rnd() > 0.35) add(m, 'extra', x, 9 + Math.round(rnd() * 9000) / 100, true, anyDay());
    add(m, 'family', n.kita, 180, paidBy(5), 5, monthly(n.kita));
  }
  return { entries, months };
}

/**
 * The app's own strings and categories, read from source through Vite:
 * German, English and Arabic are bundled, Android's wording lies over them
 * in the Android app. Four categories get a monthly budget as in
 * ui-review.mjs: one comfortable, one ahead of the month's pace, one over,
 * one not touched yet.
 */
export async function loadSource() {
  const vite = await createServer({ root, logLevel: 'silent', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false } });
  try {
    const tr = await vite.ssrLoadModule('/src/translations.ts');
    const android = (await vite.ssrLoadModule('/src/i18n/android.ts')).default;
    const { defaultCategories } = await vite.ssrLoadModule('/src/data/defaults.ts');
    const { SCHEMA_VERSION } = await vite.ssrLoadModule('/src/logic.ts');
    const limits = { groceries: 65000, car: 40000, extra: 15000, restaurants: 12000 };
    const categories = defaultCategories().map(c => (limits[c.id] ? { ...c, limit: limits[c.id] } : c));
    return { strings: tr.default, android, categories, schema: SCHEMA_VERSION };
  } finally {
    await vite.close();
  }
}

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Everything a screen's `run` needs for one language: the app's strings (with Android's words for an Android capture) and the sample data's names. */
export function words(src, lang, platform) {
  const base = src.strings[lang];
  if (!base) throw new Error(`src/translations.ts has no strings for "${lang}"`);
  const t = platform === 'android' ? { ...base, ...(src.android[lang] ?? {}) } : base;
  const category = id => src.categories.find(c => c.id === id)?.names?.[lang] ?? id;
  return {
    lang, platform: platform ?? 'ios', t, names: NAMES[lang], category,
    // The labels the clicks need, built from the strings.
    sectionMenu: new RegExp(`^${escapeRe(t.more)} — `),
    report: new RegExp(`^${escapeRe(t.reportTitle)}`),
    groceries: category('groceries'),
    ...ENTRY[lang],
  };
}

/** The page's storage before the app starts: six months, the categories with budgets, past the first run. Values are strings (null removes). */
export function storage(src, lang, { platform } = {}) {
  const { entries, months } = sampleData(NAMES[lang]);
  return {
    'spartopf-entries': JSON.stringify(entries),
    'spartopf-months': JSON.stringify(months),
    'spartopf-categories': JSON.stringify(src.categories),
    'spartopf-meta': JSON.stringify({ schemaVersion: src.schema, seeded: true }),
    'spartopf-lang': lang,
    'spartopf-intro-done': '1',
    // Not a new install's month page: the tip about the guide has been met.
    'spartopf-tip-state': '{"done":["guide"]}',
    'spartopf-dev-platform': platform === 'android' ? 'android' : null,
  };
}

/* ---------------------------------------------------------------- the clicks */

export const pause = (page, ms = 450) => page.waitForTimeout(ms);
/**
 * The app's pages: 0 Monat, 1 Statistik, 2 Planen, 3 the menu (☰) — reached
 * the way a person does (scripts/nav.mjs): back to the month with ‹ and ✕,
 * ☰, then a tile.
 */
export async function tab(page, n) {
  await goTab(page, n);
  await pause(page);
}
/** A pushed screen starts at its top, not where the row that opened it was. */
export const toTop = page => page.evaluate(() => window.scrollTo(0, 0));
/** Scrolls a heading or card to just under the sticky header; fails loudly if it is gone. */
export const scrollTo = locator => locator.first().evaluate(el => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); });

export const sheet = '[role="dialog"]';
/** A category's card on the month, by the category's id. */
export const categoryCard = id => `main section[data-drop-category="${id}"]`;

/** Groceries' "⋯" → Add entry → the entry sheet. */
export async function openEntry(page, w) {
  await page.locator(categoryCard('groceries')).getByRole('button', { name: w.sectionMenu }).first().click();
  await page.getByRole('menuitem', { name: w.t.addEntry }).first().click();
  const dialog = page.locator(sheet);
  await dialog.waitFor();
  await pause(page, 600);
  return dialog;
}
/** In the entry sheet: the suggestion `name`, from behind "Alle (n)" when it is not among the first three. */
export async function tapSuggestion(dialog, w, name = w.chip) {
  const group = dialog.getByRole('group', { name: w.t.suggestions });
  const chip = group.locator(`button:text-is("${name}")`);
  if (!(await chip.isVisible())) await group.locator('button[aria-expanded="false"]').click();
  await chip.click();
}
/** Statistik → "Wofür das Geld geht" → a category's own page. */
export async function openCategory(page, w, id = 'groceries') {
  // Inside that card only: other lists on the page carry data-hue rows too.
  const card = page.locator('main section', { has: page.locator('h3', { hasText: w.t.whereMoneyGoes }) }).first();
  const row = card.locator('li[data-hue] > button', { hasText: w.category(id) }).first();
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await pause(page, 600);
  await toTop(page);
}
/** Last month (finished) → "⋯" → Monatsbericht. */
export async function openReport(page, w) {
  await page.click(`button[aria-label="${w.t.prevMonth}"]`);
  await pause(page);
  await page.locator('header button').last().click();
  await page.getByRole('menuitem', { name: w.report }).click();
  await pause(page, 600);
  await toTop(page);
}

/* ----------------------------------------------------------------- the marks */

// What the store set may lift out of a screen, by name → selector. The names
// are what store-screenshot-studio's config refers to ("mark": "amount"), so
// keep them when a screen changes and only mend the selector. The selectors
// are the app's own handles (`data-tour`, a category's id, the page's
// structure), never its words, so one selector is right in every language. A
// mark has to be wholly on the screen when the capture is taken; one that is
// not stops that screen with a message, like a button that can't be clicked.
// A list of selectors marks the box around all of them — for a part that has
// no element of its own (a card's heading with the first row under it).

/** The balance card and the two figures in it (month end, left this month). */
const balanceMarks = {
  balance: '[data-tour="balance"]',
  'month-end': '[data-tour="balance"] dl > div:nth-child(1)',
  left: '[data-tour="balance"] dl > div:nth-child(2)',
};

// The store order. Each one starts from a fresh page on the running month.
// `marks` names the parts of the screen the studio may lift (see above).
export const SCREENS = [
  // The two balances: what is in the bank now, what is left at month end.
  { name: '01-month', marks: { ...balanceMarks, search: '[data-tour="search"]' } },
  // Groceries' "⋯" → Add entry → 47,85 → the "Lidl" suggestion.
  { name: '02-entry', run: async (page, w) => {
    const dialog = await openEntry(page, w);
    await page.keyboard.type(w.amount);
    // Once it is tapped the list narrows to it again, so the capture looks the same.
    await tapSuggestion(dialog, w);
  }, marks: {
    amount: `${sheet} [data-tour="entry-amount"]`,
    name: `${sheet} [data-tour="entry-name"]`,
    category: `${sheet} [data-tour="entry-category"]`,
    details: `${sheet} [data-tour="entry-details"]`,
  } },
  // Mehr → Sichern und übertragen: "Alles bleibt auf diesem Gerät, es gibt keine Cloud."
  { name: '03-backup', run: async (page, w) => {
    await tab(page, 3);
    await page.locator('[data-menu] button, main:not([inert] main) button', { hasText: w.t.transferTitle }).first().click();
    await pause(page, 600);
    await toTop(page);
  }, marks: {
    // The backup card alone, and with the sentence under it ("Alles bleibt auf
    // diesem Gerät, es gibt keine Cloud") — without the heading above the card.
    backup: 'main > section:nth-of-type(1) > div',
    'backup-note': ['main > section:nth-of-type(1) > div', 'main > section:nth-of-type(1) > p'],
    excel: 'main > section:nth-of-type(2) > div',
  } },
  // The month further down: Auto, Sonstiges and Lebensmittel with their budgets.
  { name: '04-budgets', run: page => scrollTo(page.locator(categoryCard('car'))), marks: {
    'budget-car': categoryCard('car'),
    'budget-extra': categoryCard('extra'),
    // Groceries' card runs on under the tab bar: its head (name, bar, budget) is the part in view.
    'budget-groceries-head': `${categoryCard('groceries')} > h2`,
  } },
  // The month after: not started yet, with what starting it carries over.
  { name: '05-next-month', run: (page, w) => page.click(`button[aria-label="${w.t.nextMonth}"]`), marks: {
    // The toast: "Dezember 2026 gestartet – 10 Posten übernommen".
    started: '[role="status"]',
    ...balanceMarks,
  } },
  // Statistik: what stands out, then Verlauf.
  { name: '06-stats', run: page => tab(page, 1), marks: {
    range: '[data-tour="stats-range"] > div',
    summary: '[data-tour="stats-hero"] > section',
    // "Das fällt auf" with its first hint: the heading and that row's text and bars.
    'stands-out': ['[data-tour="stats-hero"] + section h3', '[data-tour="stats-hero"] + section li:first-child > div'],
  } },
  { name: '07-history', run: async page => { await tab(page, 1); await scrollTo(page.locator('#history-title')); }, marks: {
    'income-expenses': '[data-tour="stats-chart"] > section',
    'balance-trend': '[data-tour="stats-chart"] + div > section',
  } },
  // Statistik → "Wofür das Geld geht" → Lebensmittel's own page.
  { name: '08-category', run: async (page, w) => { await tab(page, 1); await openCategory(page, w); }, marks: {
    average: 'main > section:nth-of-type(1)',
    // The three figures side by side (so far this month, a month's average, the year so far).
    figures: 'main > section:nth-of-type(2) dl',
    'figure-1': 'main > section:nth-of-type(2) dl > div:nth-child(1)',
    'figure-2': 'main > section:nth-of-type(2) dl > div:nth-child(2)',
    'figure-3': 'main > section:nth-of-type(2) dl > div:nth-child(3)',
    budget: 'main > button',
  } },
  // Last month (finished) → "⋯" → Monatsbericht.
  { name: '09-report', run: openReport, marks: {
    summary: 'main > section:nth-of-type(1)',
    income: 'main > dl > div:nth-child(1)',
    spending: 'main > dl > div:nth-child(2)',
    saved: 'main > dl > div:nth-child(3)',
    rate: 'main > dl > div:nth-child(4)',
    budgets: 'main > section:nth-of-type(2)',
    changes: 'main > section:nth-of-type(3)',
  } },
  // Planen: "November bis heute" — spending so far against a usual month — and the budgets.
  { name: '10-plan', run: page => tab(page, 2), marks: {
    // The card's head: "32 € weniger als sonst bis zum 15. Nov." with today, usual and month end.
    pace: '[data-tour="plan-pace"] > section > div:nth-child(1)',
  } },
];

/**
 * Where each of a screen's marks is, right now: its box in fractions of the
 * viewport (so of the capture) and its corner radius in fractions of the
 * viewport's width. A mark that is missing or off the screen is an error —
 * the store set would lift thin air.
 */
export async function measure(page, wanted) {
  const { width: vw, height: vh } = page.viewportSize();
  const marks = {};
  const f = v => Math.round(v * 1e5) / 1e5;
  for (const [name, selector] of Object.entries(wanted)) {
    const parts = [];
    for (const one of [].concat(selector)) {
      const el = page.locator(one).first();
      if (!(await el.count())) throw new Error(`mark "${name}" is not on the screen (${one})`);
      parts.push(await el.evaluate(node => {
        const r = node.getBoundingClientRect();
        // The corner is the element's own, or — when it has none — that of the
        // first thing in it (a wrapper around a card carries no corner itself).
        let radius = 0;
        for (let n = node, depth = 0; n && depth < 3 && !radius; n = n.firstElementChild, depth += 1) {
          radius = parseFloat(getComputedStyle(n).borderTopLeftRadius) || 0;
        }
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, radius: Math.min(radius, r.width / 2, r.height / 2) };
      }));
    }
    // One element: its own box and corner. Several: the box around them all,
    // which has no corner of its own (the call-out gives it one).
    const left = Math.min(...parts.map(b => b.left)), top = Math.min(...parts.map(b => b.top));
    const right = Math.max(...parts.map(b => b.right)), bottom = Math.max(...parts.map(b => b.bottom));
    const box = {
      x: f(left / vw), y: f(top / vh), w: f((right - left) / vw), h: f((bottom - top) / vh),
      radius: parts.length === 1 ? f(parts[0].radius / vw) : 0,
    };
    if (box.w <= 0 || box.h <= 0 || box.x < -0.001 || box.y < -0.001 || box.x + box.w > 1.001 || box.y + box.h > 1.001) {
      throw new Error(`mark "${name}" is not fully on the screen (${selector})`);
    }
    marks[name] = box;
  }
  return marks;
}

/** `--only a,b` → ['a', 'b'], else null. */
export function onlyArg(argv = process.argv.slice(2)) {
  const i = argv.indexOf('--only');
  if (i === -1) return null;
  const list = String(argv[i + 1] ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return list.length ? list : null;
}
/** `--lang de,ar` → the languages asked for, else all three. */
export function langArg(argv = process.argv.slice(2)) {
  const i = argv.indexOf('--lang');
  if (i === -1) return LANGS;
  const list = String(argv[i + 1] ?? '').split(',').map(s => s.trim()).filter(Boolean);
  for (const l of list) if (!LANGS.includes(l)) throw new Error(`--lang ${l}: the store languages are ${LANGS.join(', ')}`);
  return list.length ? list : LANGS;
}

/** Chromium; CHROME_PATH names another Chrome (a Linux container without Playwright's own). */
export const launch = () => chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });

/**
 * Takes `screens` for each variant ({ id, lang, platform? }) into
 * `outDir/<variant id>/`. The iPhone variants run on the built app (Vite's
 * preview), the Android ones on the dev server, where the browser can be told
 * to look like the Android app. Every screen starts from a fresh page with
 * the same data, so a screen that can't be reached fails under its own name
 * and the others are still taken. Returns the screens that failed.
 */
export async function capture({ variants, screens = SCREENS, outDir, onlyNames = null, marks = true }) {
  const ios = variants.some(v => v.platform !== 'android');
  const android = variants.some(v => v.platform === 'android');
  if (ios) {
    console.log('Building …');
    execSync('npx vite build', { cwd: root, stdio: 'ignore' });
  }
  const src = await loadSource();
  // Vite's own servers, in-process, so they close cleanly at the end.
  const servers = [];
  try {
    if (ios) servers.push(await preview({ root, logLevel: 'silent', preview: { port: PORT, strictPort: true, host: '127.0.0.1' } }));
    if (android) servers.push(await createServer({ root, logLevel: 'error', server: { port: DEV_PORT, strictPort: true, host: '127.0.0.1', hmr: false } }).then(s => s.listen()));
  } catch (e) {
    await Promise.all(servers.map(s => s.close()));
    throw new Error(`The app could not be served on port ${PORT}/${DEV_PORT}: ${String(e.message).split('\n')[0]} — a screenshot run or a film may be going in this folder.`);
  }
  const browser = await launch();
  const failed = [];
  try {
    for (const v of variants) {
      const origin = v.platform === 'android' ? DEV_ORIGIN : ORIGIN;
      const w = words(src, v.lang, v.platform);
      const dir = path.join(outDir, v.id);
      // A full run replaces the folder, so no capture from an older screen list is left in it.
      if (!onlyNames) fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      const ctx = await browser.newContext({
        viewport: { width: IPHONE.width, height: IPHONE.height }, deviceScaleFactor: IPHONE.scale, locale: LOCALE[v.lang],
        colorScheme: 'light', hasTouch: true, isMobile: true, reducedMotion: 'reduce', serviceWorkers: 'block',
      });
      await ctx.addInitScript(values => {
        if (sessionStorage.getItem('seeded')) return;
        sessionStorage.setItem('seeded', '1');
        localStorage.clear();
        for (const [k, val] of Object.entries(values)) if (val !== null) localStorage.setItem(k, val);
      }, storage(src, v.lang, { platform: v.platform }));

      for (const s of screens.filter(x => !onlyNames || onlyNames.includes(x.name))) {
        const page = await ctx.newPage();
        page.on('pageerror', e => console.error(`  [${v.id}/${s.name}] page error:`, e.message));
        try {
          await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
          await page.evaluate(() => document.fonts.ready);
          if (s.run) await s.run(page, w);
          await pause(page, 700);
          // Measured before the file is written: a screen whose marks are gone
          // must not leave a fresh capture behind with stale marks.
          const found = marks && s.marks ? await measure(page, s.marks) : null;
          await page.screenshot({ path: path.join(dir, `${s.name}.png`) });
          if (found) fs.writeFileSync(path.join(dir, `${s.name}.marks.json`), `${JSON.stringify({ capture: `${s.name}.png`, marks: found }, null, 2)}\n`);
          console.log(`  ${v.id}/${s.name}.png${found ? `  (${Object.keys(found).length} marks)` : ''}`);
        } catch (e) {
          failed.push(`${v.id}/${s.name}`);
          console.error(`  ✗ ${v.id}/${s.name}: ${String(e.message).split('\n')[0]}`);
        } finally {
          await page.close();
        }
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    for (const s of servers) await s.close();
  }
  return failed;
}
