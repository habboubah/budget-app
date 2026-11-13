// App Store screenshots for Spartopf, in German and English.
//
// Builds the web app, serves it, fills it with six realistic months (salary,
// rent, insurances, groceries …, generated relative to today so the current
// month is always "Dieser Monat") and four category budgets, and captures ten
// screens per language — the most App Store Connect takes per slot. Every
// screen starts from a fresh page with the same data, so a screen that can't
// be reached fails under its own name and the others are still taken. Run it
// on the Mac so the emoji are Apple's own.
//
// These are the raw captures. `npm run store-screenshots` frames and captions
// them at the size App Store Connect asks for (.claude/skills/store-screenshot-studio).
//
// Usage:  npm run screenshots                     all ten, both languages
//         npm run screenshots -- --only 08-category,10-plan
// Once per machine:  npx playwright install chromium
// Output: screenshots/<de|en>/01-month.png … 10-plan.png (1290 x 2796)
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { createServer, preview } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'screenshots');
const PORT = 4319;
const VIEWPORT = { width: 430, height: 932 }; // x3 = 1290 x 2796
const args = process.argv.slice(2);
const onlyArg = args.includes('--only') ? args[args.indexOf('--only') + 1] : '';
const only = onlyArg ? onlyArg.split(',').map(s => s.trim()).filter(Boolean) : null;

// Names per language, and the app's own labels the script clicks.
const L = {
  de: {
    locale: 'de-DE',
    names: {
      salary: 'Gehalt', child: 'Kindergeld', rent: 'Miete', power: 'Strom', net: 'Internet', phone: 'Handy',
      ins: 'Haftpflicht', gym: 'Fitnessstudio', fuel: 'Tanken', carIns: 'Kfz-Versicherung', carTax: 'Kfz-Steuer',
      shops: ['Lidl', 'Rewe', 'dm', 'Aldi', 'Edeka'], extras: ['Amazon', 'Apotheke', 'Restaurant', 'Kleidung'], kita: 'Kita',
    },
    sectionMenu: /^Mehr — /,
    addEntry: 'Eintrag hinzufügen',
    amount: '47,85',
    chip: 'Lidl',
    suggestions: 'Vorschläge',
    groceries: 'Lebensmittel',
    where: 'Wofür das Geld geht',
    next: 'Nächster Monat',
    prev: 'Vorheriger Monat',
    transfer: 'Sichern und übertragen',
    report: /^Monatsbericht/,
  },
  en: {
    locale: 'en-GB',
    names: {
      salary: 'Salary', child: 'Child benefit', rent: 'Rent', power: 'Electricity', net: 'Internet', phone: 'Mobile phone',
      ins: 'Liability insurance', gym: 'Gym', fuel: 'Fuel', carIns: 'Car insurance', carTax: 'Car tax',
      shops: ['Lidl', 'Tesco', 'Boots', 'Aldi', 'Sainsbury’s'], extras: ['Amazon', 'Pharmacy', 'Restaurant', 'Clothes'], kita: 'Daycare',
    },
    sectionMenu: /^More — /,
    addEntry: 'Add entry',
    amount: '47.85',
    chip: 'Lidl',
    suggestions: 'Suggestions',
    groceries: 'Groceries',
    where: 'Where the money goes',
    next: 'Next month',
    prev: 'Previous month',
    transfer: 'Back up and transfer',
    report: /^Month report/,
  },
};

/** Six months of believable data ending in the running month, partly paid (as in ui-review.mjs). */
function sampleData(n) {
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
 * The shipped categories (through Vite, so the TypeScript is the app's own),
 * four with a monthly budget as in ui-review.mjs: one comfortable, one ahead
 * of the month's pace, one over, one not touched yet.
 */
async function demoCategories() {
  const vite = await createServer({ root, logLevel: 'silent', appType: 'custom', server: { middlewareMode: true, hmr: false } });
  try {
    const { defaultCategories } = await vite.ssrLoadModule('/src/data/defaults.ts');
    const { SCHEMA_VERSION } = await vite.ssrLoadModule('/src/logic.ts');
    const limits = { groceries: 65000, car: 40000, extra: 15000, restaurants: 12000 };
    return { categories: defaultCategories().map(c => (limits[c.id] ? { ...c, limit: limits[c.id] } : c)), schema: SCHEMA_VERSION };
  } finally {
    await vite.close();
  }
}

const pause = (page, ms = 450) => page.waitForTimeout(ms);
/** The tab bar: 0 Monat, 1 Statistik, 2 Planen, 3 Einstellungen. */
const tab = async (page, n) => { await page.locator('nav button:not(.hero)').nth(n).click(); await pause(page); };
/** A pushed screen starts at its top, not where the row that opened it was. */
const toTop = page => page.evaluate(() => window.scrollTo(0, 0));
/** Scrolls a heading or card to just under the sticky header; fails loudly if it is gone. */
const scrollTo = (locator) => locator.first().evaluate(el => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); });

// The store order. Each one starts from a fresh page on the running month.
const SCREENS = [
  // The two balances: what is in the bank now, what is left at month end.
  { name: '01-month' },
  // Groceries' "⋯" → Add entry → 47,85 → the "Lidl" suggestion.
  { name: '02-entry', run: async (page, l) => {
    await page.locator('main section[data-drop-category="groceries"]').getByRole('button', { name: l.sectionMenu }).first().click();
    await page.getByRole('menuitem', { name: l.addEntry }).first().click();
    const dialog = page.locator('[role="dialog"]');
    await dialog.waitFor();
    await pause(page, 600);
    await page.keyboard.type(l.amount);
    // Only the three most-used names show at first; "Lidl" may be behind "Alle (n)".
    // Once it is tapped the list narrows to it again, so the capture looks the same.
    const group = dialog.getByRole('group', { name: l.suggestions });
    const chip = group.locator(`button:text-is("${l.chip}")`);
    if (!(await chip.isVisible())) await group.locator('button[aria-expanded="false"]').click();
    await chip.click();
  } },
  // Einstellungen → Sichern und übertragen: "Alles bleibt auf diesem Gerät, es gibt keine Cloud."
  { name: '03-backup', run: async (page, l) => {
    await tab(page, 3);
    await page.locator('main button', { hasText: l.transfer }).first().click();
    await pause(page, 600);
    await toTop(page);
  } },
  // The month further down: Auto, Sonstiges and Lebensmittel with their budgets.
  { name: '04-budgets', run: page => scrollTo(page.locator('main section[data-drop-category="car"]')) },
  // The month after: not started yet, with what starting it carries over.
  { name: '05-next-month', run: (page, l) => page.click(`button[aria-label="${l.next}"]`) },
  // Statistik: what stands out, then Verlauf.
  { name: '06-stats', run: page => tab(page, 1) },
  { name: '07-history', run: async page => { await tab(page, 1); await scrollTo(page.locator('#history-title')); } },
  // Statistik → "Wofür das Geld geht" → Lebensmittel's own page.
  { name: '08-category', run: async (page, l) => {
    await tab(page, 1);
    // Inside that card only: other lists on the page carry data-hue rows too.
    const card = page.locator('main section', { has: page.locator('h3', { hasText: l.where }) }).first();
    const row = card.locator('li[data-hue] > button', { hasText: l.groceries }).first();
    await row.scrollIntoViewIfNeeded();
    await row.click();
    await pause(page, 600);
    await toTop(page);
  } },
  // Last month (finished) → "⋯" → Monatsbericht.
  { name: '09-report', run: async (page, l) => {
    await page.click(`button[aria-label="${l.prev}"]`);
    await pause(page);
    await page.locator('header button').last().click();
    await page.getByRole('menuitem', { name: l.report }).click();
    await pause(page, 600);
    await toTop(page);
  } },
  // Planen: "November bis heute" — spending so far against a usual month — and the budgets.
  { name: '10-plan', run: page => tab(page, 2) },
];

// Vite's own preview server, in-process, so it closes cleanly at the end.
const serve = () => preview({ root, logLevel: 'silent', preview: { port: PORT, strictPort: true, host: '127.0.0.1' } });

async function shoot(browser, lang, demo) {
  const l = L[lang];
  const dir = path.join(outDir, lang);
  // A full run replaces the folder, so no capture from an older screen list is left in it.
  if (!only) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({
    viewport: VIEWPORT, deviceScaleFactor: 3, locale: l.locale, colorScheme: 'light', hasTouch: true, isMobile: true,
    reducedMotion: 'reduce', serviceWorkers: 'block',
  });
  const data = { ...sampleData(l.names), ...demo };
  await ctx.addInitScript(([d, lng]) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    localStorage.setItem('spartopf-entries', JSON.stringify(d.entries));
    localStorage.setItem('spartopf-months', JSON.stringify(d.months));
    localStorage.setItem('spartopf-categories', JSON.stringify(d.categories));
    localStorage.setItem('spartopf-meta', JSON.stringify({ schemaVersion: d.schema, seeded: true }));
    localStorage.setItem('spartopf-lang', lng);
    localStorage.setItem('spartopf-intro-done', '1');
    // Not a new install's month page: the tip about the guide has been met.
    localStorage.setItem('spartopf-tip-state', '{"done":["guide"]}');
  }, [data, lang]);

  const failed = [];
  for (const s of SCREENS.filter(x => !only || only.includes(x.name))) {
    const page = await ctx.newPage();
    page.on('pageerror', e => console.error(`  [${lang}/${s.name}] page error:`, e.message));
    try {
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      if (s.run) await s.run(page, l);
      await pause(page, 700);
      await page.screenshot({ path: path.join(dir, `${s.name}.png`) });
      console.log(`  ${lang}/${s.name}.png`);
    } catch (e) {
      failed.push(`${lang}/${s.name}`);
      console.error(`  ✗ ${lang}/${s.name}: ${String(e.message).split('\n')[0]}`);
    } finally {
      await page.close();
    }
  }
  await ctx.close();
  return failed;
}

console.log('Building …');
execSync('npx vite build', { cwd: root, stdio: 'ignore' });
const demo = await demoCategories();
const server = await serve();
const browser = await chromium.launch();
const failed = [];
try {
  for (const lang of Object.keys(L)) failed.push(...await shoot(browser, lang, demo));
} finally {
  await browser.close();
  await new Promise(r => server.httpServer.close(() => r()));
}
if (failed.length) {
  console.error(`\n✗ ${failed.length} screen(s) not captured: ${failed.join(', ')}`);
  process.exit(1);
}
console.log(`\nDone → ${path.relative(root, outDir)}/<de|en>/  (${SCREENS.length} per language, 1290 × 2796)`);
