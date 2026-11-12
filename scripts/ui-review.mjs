// UI review captures for the iPhone redesign — the "exercise it at iPhone
// width" step of CLAUDE.md, made repeatable so every change can be shown
// before and after.
//
// Starts Vite's dev server in-process, fills the app with six months of demo
// data (like scripts/screenshots.mjs, but with real entry dates and an Arabic
// set), and opens every screen and sheet at four iPhone sizes with their real
// safe areas, in light and dark, German and Arabic. Writes:
//
//   <out>/<device>-<lang>-<theme>/<screen>.png  viewport captures (…-full = whole page,
//                                               …-kb = viewport shortened by the keyboard)
//   <out>/audit.json + audit.md                 touch targets under 44 px, horizontal
//                                               overflow, truncated text, text under 11 px
//   <out>/sheets/*.png                          contact sheets: the four sizes side by side,
//                                               and DE / AR × light / dark at one size
//   <out>/dom/<device>-<lang>-<theme>/*.html    static DOM snapshots (--dom), the base for mockups
//
// Usage:  node scripts/ui-review.mjs [--out screenshots/ui-redesign/before]
//           [--devices se,16,17pro,17promax] [--langs de,ar] [--themes light,dark]
//           [--only month,stats] [--dom] [--no-sheets] [--no-budgets] [--text 2]
// Once per machine:  npx playwright install chromium --only-shell
//
// Fonts are the machine's: on Windows the system stack falls back from SF Pro
// to Segoe UI and from Apple Color Emoji to Segoe UI Emoji, so run it on the
// Mac for pixel-true type. Layout, spacing and colour are the app's own.
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(`--${name}`); return i === -1 ? fallback : args[i + 1]; };
const flag = name => args.includes(`--${name}`);
const list = (name, fallback) => opt(name, fallback).split(',').map(s => s.trim()).filter(Boolean);

const outDir = path.resolve(root, opt('out', 'screenshots/ui-redesign/before'));
const PORT = Number(opt('port', '4327'));

// Points, the device's safe areas, and the keyboard's height (with the
// suggestion bar) for the "-kb" captures — the sheet follows the visual viewport.
const DEVICES = {
  se: { width: 375, height: 667, top: 20, bottom: 0, kb: 260, label: 'iPhone SE · 375 × 667' },
  16: { width: 393, height: 852, top: 59, bottom: 34, kb: 336, label: 'iPhone 16 · 393 × 852' },
  '17pro': { width: 402, height: 874, top: 62, bottom: 34, kb: 336, label: 'iPhone 17 Pro · 402 × 874' },
  '17promax': { width: 440, height: 956, top: 62, bottom: 34, kb: 346, label: 'iPhone 17 Pro Max · 440 × 956' },
  // Android (plan 23), not in the default set: `--devices pixel,android360`. The app runs as on
  // Android there (its wording and its rounded face, `spartopf-dev-platform`); the insets are
  // the status bar's and the gesture bar's.
  pixel: { width: 412, height: 915, top: 28, bottom: 24, kb: 300, label: 'Pixel · 412 × 915', storage: { 'spartopf-dev-platform': 'android' } },
  android360: { width: 360, height: 800, top: 24, bottom: 24, kb: 290, label: 'Android · 360 × 800', storage: { 'spartopf-dev-platform': 'android' } },
  // Not in the default set: `--devices desktop` (mouse, no safe areas).
  desktop: { width: 1280, height: 820, top: 0, bottom: 0, kb: 0, label: 'Desktop · 1280 × 820', desktop: true },
};
// Root text size: --text 2 is iOS's largest accessibility size (dynamicType.ts caps there).
const TEXT_SCALE = Number(opt('text', '1'));
/** Categories with budgets for the demo data (set once the dev server runs). */
let DEMO = {};

const LANGS = {
  de: {
    locale: 'de-DE',
    categories: 'Kategorien',
    guide: 'Anleitung',
    show: 'Zeigen',
    transfer: 'Sichern und übertragen',
    reminders: 'An offene Posten erinnern',
    capture: 'Automatisch erfassen',
    contracts: 'Abos & Verträge',
    explain: 'So berechnet',
    names: {
      salary: 'Gehalt', child: 'Kindergeld', rent: 'Miete', power: 'Strom', net: 'Internet', phone: 'Handy',
      ins: 'Haftpflicht', gym: 'Fitnessstudio', fuel: 'Tanken', carIns: 'Kfz-Versicherung', carTax: 'Kfz-Steuer',
      shops: ['Lidl', 'Rewe', 'dm', 'Aldi', 'Edeka'], extras: ['Amazon', 'Apotheke', 'Restaurant', 'Kleidung'], kita: 'Kita',
    },
    debts: { title: 'Schulden und Kredite', car: 'Autokredit', friend: 'Lena' },
    accounts: { title: 'Konten', cash: 'Bargeld', savings: 'Tagesgeld', atm: 'Abheben', save: 'Sparrate', market: 'Wochenmarkt', bakery: 'Bäcker' },
  },
  ar: {
    locale: 'ar',
    categories: 'الفئات',
    guide: 'الدليل',
    show: 'أرِني',
    transfer: 'النسخ الاحتياطي والنقل',
    reminders: 'التذكير بالبنود المعلّقة',
    capture: 'التسجيل التلقائي',
    contracts: 'الاشتراكات والعقود',
    explain: 'كيف يُحسب',
    // Shop names stay Latin, as on a German receipt: mixed direction on purpose.
    names: {
      salary: 'الراتب', child: 'إعانة الأطفال', rent: 'الإيجار', power: 'الكهرباء', net: 'الإنترنت', phone: 'الجوال',
      ins: 'تأمين المسؤولية', gym: 'النادي الرياضي', fuel: 'وقود', carIns: 'تأمين السيارة', carTax: 'ضريبة السيارة',
      shops: ['Lidl', 'Rewe', 'dm', 'Aldi', 'Edeka'], extras: ['Amazon', 'الصيدلية', 'مطعم', 'ملابس'], kita: 'الحضانة',
    },
    debts: { title: 'الديون والقروض', car: 'قرض السيارة', friend: 'لينا' },
    accounts: { title: 'الحسابات', cash: 'النقد', savings: 'التوفير', atm: 'سحب نقدي', save: 'ادخار شهري', market: 'سوق الخضار', bakery: 'المخبز' },
  },
};

/** Six months of believable data ending in the running month, partly paid. */
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
 * The same book with a cash and a savings account (plan 30): money taken out
 * and a monthly savings transfer in each month, a few cash payments.
 */
function withAccounts(data, a) {
  const entries = [...data.entries];
  let id = 0;
  const add = (e, account) => entries.push({ repeat: 'none', createdAt: 9000 + ++id, ...e, id: `x${id}`, seriesId: e.seriesId ?? `x${id}`, ...(account ? { accountId: account } : {}) });
  const today = new Date().getDate();
  data.months.forEach((m, i) => {
    const cur = i === data.months.length - 1;
    const day = d => `${m.key}-${String(d).padStart(2, '0')}`;
    const pair = (name, cents, d, to, paid, repeat = 'none') => {
      const p = `p${i}-${to}`;
      add({ month: m.key, categoryId: 'transfer', name, amount: cents, paid, repeat, date: day(d), seriesId: `t-${to}-out`, transfer: { pairId: p, direction: 'out' } });
      add({ month: m.key, categoryId: 'transfer', name, amount: cents, paid, repeat, date: day(d), seriesId: `t-${to}-in`, transfer: { pairId: p, direction: 'in' } }, to);
    };
    pair(a.atm, 20000, 2, 'a-cash', true);
    pair(a.save, 30000, 27, 'a-sav', !cur || today >= 27, 'monthly');
    add({ month: m.key, categoryId: 'groceries', name: a.market, amount: 2340 + i * 110, paid: true, date: day(Math.min(6, today)) }, 'a-cash');
    add({ month: m.key, categoryId: 'groceries', name: a.bakery, amount: 680, paid: true, date: day(Math.min(2, today)) }, 'a-cash');
  });
  const months = data.months.map((m, i) => (i === 0 ? { ...m, openings: { 'a-cash': 6000, 'a-sav': 450000 } } : m));
  return { ...data, entries, months };
}
const ACCOUNTS = l => ({
  'spartopf-accounts': JSON.stringify([
    { id: 'main', name: '', kind: 'bank', emoji: '🏦', hue: 'blue', createdAt: 0 },
    { id: 'a-cash', name: l.accounts.cash, kind: 'cash', emoji: '💶', hue: 'leaf', createdAt: 1 },
    { id: 'a-sav', name: l.accounts.savings, kind: 'savings', emoji: '🐷', hue: 'berry', createdAt: 2 },
  ]),
});
/** A car loan and money lent (plan 31), started a year ago. */
const DEBTS = l => {
  const d = new Date(); d.setMonth(d.getMonth() - 10);
  const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return {
    'spartopf-debts': JSON.stringify([
      { id: 'debt-car', name: l.debts.car, direction: 'owe', principal: 1200000, start, rate: 4.9, payment: 26500, seriesId: l.names.carIns, createdAt: 1 },
      { id: 'debt-lena', name: l.debts.friend, direction: 'owed', principal: 40000, start, createdAt: 2 },
    ]),
  };
};
/** Optionen → Schulden und Kredite. */
const openDebts = async (page, l) => {
  await tab(3)(page);
  await page.locator('main button', { hasText: l.debts.title }).first().click();
  await page.waitForTimeout(500);
};
/** Optionen → Konten. */
const openAccounts = async (page, l) => {
  await tab(3)(page);
  await page.locator('main button', { hasText: l.accounts.title }).first().click();
  await page.waitForTimeout(500);
};

const dialog = '[role="dialog"], [role="alertdialog"]';
const tab = n => async page => { await page.locator('nav button:not(.hero)').nth(n).click(); await page.waitForTimeout(450); };
const openCategories = async (page, l) => {
  await tab(3)(page);
  await page.locator('main button', { hasText: l.categories }).first().click();
  await page.waitForTimeout(500);
};
/** Optionen → Anleitung (src/guide.ts). */
const openGuide = async (page, l) => {
  await tab(3)(page);
  await page.locator('main button', { hasText: l.guide }).first().click();
  await page.waitForTimeout(500);
};
/** A tour from the guide's list (src/guide.ts), `steps` times *Weiter* on. */
const openTour = (tour, steps) => async (page, l) => {
  await openGuide(page, l);
  await page.locator(`[data-guide-tour="${tour}"]`).click();
  await page.waitForSelector('[data-tour-open]', { timeout: 5000 });
  await page.waitForTimeout(700);
  for (let i = 0; i < steps; i++) {
    await page.locator('[data-tour-open] [role="dialog"] button.hero').click();
    await page.waitForTimeout(450);
  }
  await page.waitForTimeout(500);
};
/** A topic of the guide, opened and brought to the top. */
const openTopic = topic => async (page, l) => {
  await openGuide(page, l);
  const row = page.locator(`main [data-guide-topic="${topic}"] button`).first();
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await page.waitForTimeout(400);
  await page.evaluate(t => {
    const el = document.querySelector(`[data-guide-topic="${t}"]`);
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 110);
  }, topic);
  await page.waitForTimeout(200);
};
/** A topic's *Zeigen*: the screen it leads to, and the mark on it. `ok`: the mark put away, the way back showing. */
const openPoint = (topic, ok = false) => async (page, l) => {
  await openGuide(page, l);
  const row = page.locator(`main [data-guide-topic="${topic}"] button`).first();
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await page.waitForTimeout(350);
  await page.locator(`main [data-guide-topic="${topic}"] button[aria-label^="${l.show}"]`).click();
  await page.waitForTimeout(1300);
  if (ok) {
    await page.locator('[data-tour-open] [role="dialog"] button.hero').click();
    await page.waitForTimeout(500);
  }
};
/** Statistik → the first row of "Wofür das Geld geht": the category's own screen. */
const openCategory1 = async page => {
  await tab(1)(page);
  const row = page.locator('main li[data-hue] > button').first();
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await page.waitForTimeout(600);
};
/** Statistik → "Wofür das Geld geht" → Empfänger. */
const openPayees = async page => {
  await tab(1)(page);
  await page.locator('[role="radiogroup"]').last().locator('[role="radio"]').last().click();
  await page.waitForTimeout(250);
};
/** The month's "⋯" → its first item, the Monatsbericht. */
const openReport = async page => {
  await page.locator('header button').last().click();
  await page.waitForSelector('[role="menu"]');
  await page.waitForTimeout(300);
  await page.locator('[role="menuitem"]').first().click();
  await page.waitForTimeout(600);
};
/** Statistik → the year review's card. */
const openYearReview = async page => {
  await tab(1)(page);
  await page.locator('main .hero button').first().click();
  await page.waitForTimeout(600);
};
/** Planen's Abos & Verträge card, found by its title (the cards above it come and go with the data). */
const contractsCard = (page, l) => page.locator('main section', { has: page.locator('h3', { hasText: l.contracts }) }).first();
/** Unfolds the balance card's details; returns the id of what it shows (null on a card without them). */
const openDetails = async page => {
  const toggle = page.locator('section.hero button[aria-controls]').first();
  if (!(await toggle.count())) return null;
  const id = await toggle.getAttribute('aria-controls');
  await toggle.click();
  await page.waitForTimeout(300);
  return id;
};

/** With Beträge verbergen on (plan 06). */
const HIDDEN = { 'spartopf-hide-amounts': '1' };

// Every screen starts from a fresh load of "/" with the same seed.
// audit: 'page' checks the whole document, 'dialog' only the open sheet.
const SCREENS = [
  { name: 'month', audit: 'page' },
  { name: 'month-full', full: true },
  { name: 'month-scroll', run: page => page.evaluate(() => window.scrollTo(0, 720)) },
  { name: 'month-end', run: page => page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)) },
  { name: 'search', run: async page => { await page.click('input[type="search"]'); await page.keyboard.type('Lidl'); await page.waitForTimeout(300); } },
  { name: 'entry-new', run: page => page.click('nav button.hero'), wait: dialog, audit: 'dialog' },
  { name: 'entry-new-kb', run: page => page.click('nav button.hero'), wait: dialog, keyboard: true },
  { name: 'entry-edit', run: page => page.locator('[data-entry-row] [data-entry-body]').nth(3).click(), wait: dialog },
  { name: 'month-picker', run: page => page.click('h1 button[aria-haspopup="dialog"]'), wait: dialog, audit: 'dialog' },
  { name: 'month-actions', run: page => page.locator('header button').last().click(), wait: '[role="menu"]', audit: 'menu' },
  { name: 'month-details', run: openDetails, audit: 'page' },
  // The month before (the first header button is "‹"): finished, so the balance card's line is all solid.
  { name: 'month-before', run: async page => { await page.locator('header button').first().click(); await page.waitForTimeout(700); } },
  { name: 'card-menu', run: page => page.locator('main section[data-drop-category] h2 button[aria-haspopup="menu"]').first().click(), wait: '[role="menu"]', audit: 'menu' },
  // Groceries' "⋯" → its second item, the monthly budget.
  { name: 'budget-sheet', run: async page => {
    const more = page.locator('main section[data-drop-category="groceries"] h2 button[aria-haspopup="menu"]');
    await more.scrollIntoViewIfNeeded();
    await more.click();
    await page.waitForSelector('[role="menu"]');
    await page.waitForTimeout(300);
    await page.locator('[role="menuitem"]').nth(1).click();
  }, wait: dialog, audit: 'dialog' },
  { name: 'month-budgets', run: page => page.evaluate(() => document.querySelector('main section[data-drop-category="car"]')?.scrollIntoView({ block: 'start' })) },
  // "Demnächst fällig" → "Alle": the pushed list.
  { name: 'due-soon', run: async page => {
    await page.locator('main section[aria-labelledby] h2 + button').first().click();
    await page.waitForTimeout(600);
  }, audit: 'page' },
  { name: 'due-soon-full', run: async page => {
    await page.locator('main section[aria-labelledby] h2 + button').first().click();
    await page.waitForTimeout(600);
  }, full: true },
  { name: 'empty-menu', run: async page => {
    const chip = page.locator('main section[aria-labelledby] button[data-drop-category]').first();
    await chip.scrollIntoViewIfNeeded();
    await chip.click();
  }, wait: '[role="menu"]', audit: 'menu' },
  // The carry-over row sits in the balance card's details since the redesign.
  { name: 'opening', run: async page => {
    const id = await openDetails(page);
    if (id) await page.locator(`[id="${id}"] button`).first().click();
    else await page.locator('section.hero button').first().click();
  }, wait: dialog },
  { name: 'stats', run: tab(1), audit: 'page' },
  { name: 'stats-full', run: tab(1), full: true },
  // "Wofür das Geld geht" → the first category's own screen (plan 06a), and the payees.
  { name: 'category', run: openCategory1, audit: 'page' },
  { name: 'category-full', run: openCategory1, full: true },
  { name: 'stats-payees', full: true, run: openPayees },
  // "Wann du Geld ausgibst": a weekday and a day of the calendar picked.
  { name: 'stats-rhythm', run: async page => {
    await tab(1)(page);
    const day = page.locator('main button.heat-pop').nth(6);
    await day.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 160));
    await day.click();
    await page.waitForTimeout(500);
  } },
  // A payee row → its sheet.
  { name: 'payee-sheet', run: async page => {
    await openPayees(page);
    await page.locator('main ol li button').first().click();
  }, wait: dialog, audit: 'dialog' },
  // The ⓘ beside the averages → "So berechnet".
  { name: 'explain-sheet', run: async (page, l) => {
    await tab(1)(page);
    const info = page.locator(`main button[aria-label^="${l.explain}"]`).first();
    await info.scrollIntoViewIfNeeded();
    await info.click();
  }, wait: dialog, audit: 'dialog' },
  // The month's "⋯" → Monatsbericht (plan 13).
  { name: 'month-report', run: openReport, audit: 'page' },
  { name: 'month-report-full', run: openReport, full: true },
  // The year review's card, out of season through the dev flag.
  { name: 'year-review', storage: { 'spartopf-dev-season': '1' }, run: openYearReview, audit: 'page' },
  { name: 'year-review-full', storage: { 'spartopf-dev-season': '1' }, run: openYearReview, full: true },
  { name: 'insights', run: tab(2), audit: 'page' },
  { name: 'insights-full', run: tab(2), full: true },
  // "Nächste 30 Tage" with a day in hand: the tooltip and the band behind it.
  { name: 'insights-runway', run: async page => {
    await tab(2)(page);
    const card = page.locator('main section[aria-labelledby="runway-title"]');
    await card.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 120));
    const plot = card.locator('[dir="ltr"] button').nth(1);
    await plot.hover({ position: { x: 20, y: 60 } });
    await page.waitForTimeout(500);
  } },
  // Finanz-Check's first row opened: the savings rate and 50/30/20.
  { name: 'check-detail', full: true, run: async page => {
    await tab(2)(page);
    const row = page.locator('main button[aria-expanded]').first();
    await row.scrollIntoViewIfNeeded();
    await row.click();
    await page.waitForTimeout(300);
  } },
  // Planen → a contract's details, and the whole list of contracts.
  { name: 'contract-sheet', run: async (page, l) => {
    await tab(2)(page);
    const row = contractsCard(page, l).locator('li button').first();
    await row.scrollIntoViewIfNeeded();
    await row.click();
  }, wait: dialog, audit: 'dialog' },
  { name: 'contracts', run: async (page, l) => {
    await tab(2)(page);
    // "Alle (n)" beside the card's title; with four or fewer there is none, and the card shows them all.
    const all = contractsCard(page, l).locator(':scope > div:first-child > button');
    if (await all.count()) { await all.click(); await page.waitForTimeout(600); }
  }, audit: 'page' },
  { name: 'settings', run: tab(3), audit: 'page' },
  { name: 'settings-full', run: tab(3), full: true },
  // The iPhone app's Optionen: the lock, the iPhone backup and reminders (dev flag: shown on the web, nothing scheduled).
  { name: 'settings-native', storage: { 'spartopf-dev-native': '1' }, run: tab(3), audit: 'page' },
  // Beträge verbergen (plan 06): every amount "•••• €", the eye on the balance card, and a peek.
  { name: 'month-hidden', storage: HIDDEN, audit: 'page' },
  { name: 'month-hidden-details', storage: HIDDEN, run: openDetails, audit: 'page' },
  { name: 'month-peek', storage: HIDDEN, run: async page => { await page.locator('section.hero button').first().click(); await page.waitForTimeout(700); } },
  { name: 'stats-hidden', storage: HIDDEN, run: tab(1), full: true },
  { name: 'insights-hidden', storage: HIDDEN, run: tab(2), full: true },
  // Optionen → An offene Posten erinnern, switched on.
  { name: 'reminders', storage: { 'spartopf-dev-native': '1', 'spartopf-reminders': JSON.stringify({ on: true, time: '09:00', lead: 1, amounts: false }) }, run: async (page, l) => {
    await tab(3)(page);
    await page.locator('main button', { hasText: l.reminders }).first().click();
    await page.waitForTimeout(500);
  }, audit: 'page' },
  // Optionen → Automatisch erfassen (plan 19).
  { name: 'capture', storage: { 'spartopf-dev-native': '1' }, run: async (page, l) => {
    await tab(3)(page);
    await page.locator('main button', { hasText: l.capture }).first().click();
    await page.waitForTimeout(500);
  }, audit: 'page', full: true },
  // Optionen → Sichern und übertragen.
  { name: 'transfer', run: async (page, l) => {
    await tab(3)(page);
    await page.locator('main button', { hasText: l.transfer }).first().click();
    await page.waitForTimeout(500);
  }, audit: 'page' },
  { name: 'categories', run: openCategories, audit: 'page' },
  { name: 'categories-full', run: openCategories, full: true },
  // "Bearbeiten" in the bar: grips and delete buttons.
  { name: 'categories-edit', run: async (page, l) => {
    await openCategories(page, l);
    await page.locator('header button').last().click();
    await page.waitForTimeout(400);
  }, audit: 'page' },
  { name: 'category-edit', run: async (page, l) => { await openCategories(page, l); await page.locator('main [data-category-body]').nth(4).click(); }, wait: dialog, audit: 'dialog' },
  { name: 'first-run', fresh: true, audit: 'page' },
  { name: 'first-run-full', fresh: true, full: true },
  // The setup's first step answered: the balance card appears above it.
  { name: 'setup-balance', fresh: true, run: async page => {
    await page.locator('main section input[inputmode="decimal"]').first().fill('1234,56');
    await page.locator('main section form button[type="submit"]').first().click();
    await page.waitForTimeout(400);
    await page.evaluate(() => document.querySelector('main section[aria-labelledby]')?.scrollIntoView({ block: 'center' }));
  }, audit: 'page' },
  // After the setup: the gestures card on the running month.
  { name: 'tips', storage: { 'spartopf-tips-done': '0' }, run: page => page.evaluate(() => window.scrollTo(0, 560)), audit: 'page' },
  // The guide: its screen, a topic opened, a search, the tour's marks, and the one tip that points to it.
  { name: 'guide', run: openGuide, audit: 'page' },
  { name: 'guide-full', run: openGuide, full: true },
  // A topic opened: its picture, its sentence, the steps with the buttons drawn in, the tip.
  { name: 'guide-topic', run: openTopic('add'), audit: 'page' },
  { name: 'guide-topic-balances', run: openTopic('balances'), audit: 'page' },
  { name: 'guide-topic-paid', run: openTopic('paid'), audit: 'page' },
  { name: 'guide-topic-budgets', run: openTopic('budgets'), audit: 'page' },
  { name: 'guide-topic-bank', run: openTopic('bank'), audit: 'page' },
  { name: 'guide-topic-stats', run: openTopic('stats'), audit: 'page' },
  { name: 'guide-topic-look', run: openTopic('look'), audit: 'page' },
  { name: 'guide-search', run: async (page, l) => { await openGuide(page, l); await page.click('input[type="search"]'); await page.keyboard.type('pdf'); await page.waitForTimeout(300); }, audit: 'page' },
  { name: 'guide-native', storage: { 'spartopf-dev-native': '1' }, run: openGuide, full: true },
  { name: 'tour-balance', run: openTour('month', 0), audit: 'dialog' },
  { name: 'tour-tick', run: openTour('month', 1), audit: 'dialog' },
  { name: 'tour-month', run: openTour('month', 2), audit: 'dialog' },
  { name: 'tour-tabs', run: openTour('month', 3), audit: 'dialog' },
  { name: 'tour-add', run: openTour('month', 4), audit: 'dialog' },
  // A first run has no balance and nothing to tick: the tour is three steps.
  { name: 'tour-fresh', fresh: true, run: openTour('month', 0), audit: 'dialog' },
  // The other tours: the entry sheet, Statistik, Planen, Optionen.
  { name: 'tour-entry-amount', run: openTour('entry', 0), audit: 'dialog' },
  { name: 'tour-entry-details', run: openTour('entry', 3), audit: 'dialog' },
  { name: 'tour-entry-save', run: openTour('entry', 4), audit: 'dialog' },
  { name: 'tour-stats-range', run: openTour('stats', 0), audit: 'dialog' },
  { name: 'tour-stats-chart', run: openTour('stats', 2), audit: 'dialog' },
  { name: 'tour-stats-rhythm', run: openTour('stats', 4), audit: 'dialog' },
  { name: 'tour-plan-pace', run: openTour('plan', 0), audit: 'dialog' },
  { name: 'tour-plan-outlook', run: openTour('plan', 3), audit: 'dialog' },
  { name: 'tour-settings-security', run: openTour('settings', 0), audit: 'dialog' },
  { name: 'tour-settings-transfer', run: openTour('settings', 3), audit: 'dialog' },
  // Zeigen: the mark on the screen a topic leads to, and the way back once it is put away.
  { name: 'point-add', run: openPoint('add'), audit: 'dialog' },
  { name: 'point-repeats', run: openPoint('repeats'), audit: 'dialog' },
  { name: 'point-bank', run: openPoint('bank'), audit: 'dialog' },
  { name: 'point-budgets', run: openPoint('budgets'), audit: 'dialog' },
  { name: 'point-lock', run: openPoint('lock'), audit: 'dialog' },
  { name: 'guide-back', run: openPoint('bank', true), audit: 'page' },
  { name: 'hint-guide', storage: { 'spartopf-tip-state': '{"done":[]}' }, run: page => page.evaluate(() => document.querySelector('main section[aria-label]:not(.hero)')?.scrollIntoView({ block: 'center' })), audit: 'page' },
  { name: 'stats-empty', fresh: true, run: tab(1) },
  // Cash and savings accounts (plan 30): the switch on the balance card, the transfers card, Konten, the sheets.
  { name: 'accounts-month', accounts: true, audit: 'page' },
  { name: 'accounts-month-full', accounts: true, full: true },
  { name: 'accounts-details', accounts: true, run: openDetails, audit: 'page' },
  { name: 'accounts-switch', accounts: true, run: page => page.locator('section.hero button[aria-haspopup="menu"]').first().click(), wait: '[role="menu"]', audit: 'menu' },
  { name: 'accounts-cash', accounts: true, storage: { 'spartopf-account': 'a-cash' }, full: true, audit: 'page' },
  { name: 'accounts-all', accounts: true, storage: { 'spartopf-account': 'all' }, run: openDetails, audit: 'page' },
  { name: 'accounts-transfers', accounts: true, run: page => page.evaluate(() => document.querySelector('#transfers-title')?.scrollIntoView({ block: 'center' })), audit: 'page' },
  { name: 'accounts-screen', accounts: true, run: openAccounts, audit: 'page' },
  { name: 'account-sheet', accounts: true, run: async (page, l) => { await openAccounts(page, l); await page.locator('main button[aria-label]').nth(3).click(); }, wait: dialog, audit: 'dialog' },
  { name: 'accounts-first', run: async (page, l) => { await openAccounts(page, l); }, audit: 'page' },
  { name: 'transfer-sheet', accounts: true, run: async page => {
    await page.locator('header button').last().click();
    await page.waitForSelector('[role="menu"]');
    await page.waitForTimeout(300);
    await page.locator('[role="menuitem"]').nth(3).click();
  }, wait: dialog, audit: 'dialog' },
  { name: 'entry-account', accounts: true, run: page => page.click('nav button.hero'), wait: dialog, audit: 'dialog' },
  { name: 'insights-accounts', accounts: true, run: tab(2), full: true },
  // Debts and loans (plan 31).
  { name: 'debts-empty', run: openDebts, audit: 'page' },
  { name: 'debts', debts: true, run: openDebts, audit: 'page' },
  { name: 'debt-sheet', debts: true, run: async (page, l) => { await openDebts(page, l); await page.locator('main button[aria-label]').nth(1).click(); }, wait: dialog, audit: 'dialog' },
  { name: 'debt-new', run: async (page, l) => { await openDebts(page, l); await page.locator('main button', { hasText: '+' }).or(page.locator('main [class*="py-12"] button')).first().click(); }, wait: dialog, audit: 'dialog' },
  { name: 'insights-debts', debts: true, run: tab(2), full: true },
  { name: 'entry-debt', debts: true, run: page => page.click('nav button.hero'), wait: dialog, audit: 'dialog' },
];
// Snapshotted as static HTML with --dom (mockups start from these).
const DOM_SCREENS = ['month', 'entry-new', 'stats', 'insights', 'settings', 'category', 'month-report'];
const DOM_CONTEXTS = ['16-de-light', '16-ar-dark'];

const only = opt('only', '') ? list('only', '') : null;
const screens = SCREENS.filter(s => !only || only.includes(s.name));
const contexts = [];
for (const device of list('devices', 'se,16,17pro,17promax')) {
  for (const lang of list('langs', 'de,ar')) for (const theme of list('themes', 'light,dark')) contexts.push({ device, lang, theme, id: `${device}-${lang}-${theme}` });
}
for (const c of contexts) if (!DEVICES[c.device] || !LANGS[c.lang]) throw new Error(`Unknown device or language in ${c.id}`);

/** What the eye can't measure: targets, overflow, truncation, tiny text. */
function auditPage(scope) {
  const rootEl = scope === 'dialog' ? document.querySelector('[role="dialog"], [role="alertdialog"]')
    : scope === 'menu' ? document.querySelector('[role="menu"]') : document.body;
  if (!rootEl) return { error: 'nothing to audit' };
  const hidden = el => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || n.getAttribute('aria-hidden') === 'true' || n.hasAttribute('inert')) return true;
    }
    return false;
  };
  const nameOf = el => (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || el.getAttribute('placeholder') || el.value || el.tagName)
    .replace(/\s+/g, ' ').trim().slice(0, 70);
  const out = { overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth), small: [], truncated: [], tiny: [] };
  const targets = 'button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="checkbox"], [role="switch"], [role="radio"], [role="tab"], [role="slider"]';
  for (const el of rootEl.querySelectorAll(targets)) {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || hidden(el)) continue;
    // `hit-44` reaches past the box with an absolute ::before: count that area.
    let w = r.width, h = r.height;
    const pseudo = getComputedStyle(el, '::before');
    if (pseudo.content !== 'none' && pseudo.position === 'absolute') {
      const px = v => Math.min(0, parseFloat(v) || 0);
      h -= px(pseudo.top) + px(pseudo.bottom);
      w -= px(pseudo.left) + px(pseudo.right);
    }
    if (w < 43.5 || h < 43.5) out.small.push({ name: nameOf(el), w: Math.round(w), h: Math.round(h), role: el.getAttribute('role') || el.tagName.toLowerCase() });
  }
  for (const el of rootEl.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1 && !hidden(el)) out.truncated.push(nameOf(el));
  }
  const seen = new Set();
  const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.textContent.replace(/\s+/g, ' ').trim();
    const el = n.parentElement;
    if (!text || !el || el.closest('svg') || el.closest('.sr-only') || hidden(el)) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < 11 && !seen.has(text)) { seen.add(text); out.tiny.push({ text: text.slice(0, 50), px: size }); }
  }
  return out;
}

/** Real safe areas in Chromium (CDP); if the protocol doesn't have it, the CSS is rewritten instead. */
async function applySafeArea(page, d) {
  try {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: d.top, topMax: d.top, bottom: d.bottom, bottomMax: d.bottom, left: 0, leftMax: 0, right: 0, rightMax: 0 } });
    return 'cdp';
  } catch {
    return 'css';
  }
}
async function rewriteSafeAreaCss(page, d) {
  await page.evaluate(({ top, bottom }) => {
    const px = { top, bottom, left: 0, right: 0 };
    const fix = s => s.replace(/env\(\s*safe-area-inset-(top|bottom|left|right)\s*(?:,[^)]*)?\)/g, (_, side) => `${px[side]}px`);
    for (const st of document.querySelectorAll('style')) if (st.textContent.includes('safe-area-inset')) st.textContent = fix(st.textContent);
    const patch = el => { const v = el.getAttribute('style'); if (v && v.includes('safe-area-inset')) el.setAttribute('style', fix(v)); };
    document.querySelectorAll('[style]').forEach(patch);
    new MutationObserver(ms => ms.forEach(m => { if (m.target.nodeType === 1) patch(m.target); m.addedNodes.forEach(n => { if (n.nodeType === 1) { patch(n); n.querySelectorAll?.('[style]').forEach(patch); } }); }))
      .observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });
  }, d);
}

async function runContext(browser, c, report, safeAreaMode) {
  const d = DEVICES[c.device];
  const l = LANGS[c.lang];
  const dir = path.join(outDir, c.id);
  fs.mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: d.width, height: d.height }, deviceScaleFactor: d.desktop ? 1 : 2, isMobile: !d.desktop, hasTouch: !d.desktop,
    locale: l.locale, colorScheme: c.theme, reducedMotion: 'reduce', serviceWorkers: 'block',
  });
  const data = { ...sampleData(l.names), ...DEMO };
  report[c.id] = {};
  for (const s of screens) {
    await ctx.clearCookies();
    const page = await ctx.newPage();
    page.on('pageerror', e => console.error(`  [${c.id}/${s.name}] page error: ${e.message}`));
    await page.addInitScript(([seed, lang, fresh, scale, extra]) => {
      // What dynamicType.ts does on iOS for a larger text size setting. Init
      // scripts run before <html> is parsed, so wait for it.
      if (scale !== 1) {
        const set = () => { if (!document.documentElement) return false; document.documentElement.style.fontSize = `${16 * scale}px`; return true; };
        if (!set()) new MutationObserver((_, mo) => { if (set()) mo.disconnect(); }).observe(document, { childList: true });
      }
      localStorage.clear();
      localStorage.setItem('spartopf-lang', lang);
      if (fresh) return;
      localStorage.setItem('spartopf-entries', JSON.stringify(seed.entries));
      localStorage.setItem('spartopf-months', JSON.stringify(seed.months));
      localStorage.setItem('spartopf-intro-done', '1');
      // The guide's one tip is met (the `hint-guide` screen shows it): the month page as it is from the second week on.
      localStorage.setItem('spartopf-tip-state', '{"done":["guide"]}');
      if (seed.categories) {
        localStorage.setItem('spartopf-categories', JSON.stringify(seed.categories));
        localStorage.setItem('spartopf-meta', JSON.stringify({ schemaVersion: seed.schema, seeded: true }));
      }
      for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
    }, [s.accounts ? withAccounts(data, l.accounts) : data, c.lang, !!s.fresh, TEXT_SCALE, { ...(s.accounts ? ACCOUNTS(l) : {}), ...(s.debts ? DEBTS(l) : {}), ...(d.storage ?? {}), ...(s.storage ?? {}) }]);
    const mode = await applySafeArea(page, d);
    safeAreaMode.add(mode);
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
    if (mode === 'css') await rewriteSafeAreaCss(page, d);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    try {
      if (s.run) await s.run(page, l);
      if (s.wait) await page.waitForSelector(s.wait, { timeout: 5000 });
      if (s.keyboard) await page.setViewportSize({ width: d.width, height: d.height - d.kb });
      await page.waitForTimeout(s.wait || s.keyboard ? 650 : 450);
      await page.screenshot({ path: path.join(dir, `${s.name}.png`), fullPage: !!s.full });
      if (s.audit) report[c.id][s.name] = await page.evaluate(auditPage, s.audit);
      if (flag('dom') && DOM_SCREENS.includes(s.name) && DOM_CONTEXTS.includes(c.id)) {
        const html = await page.evaluate(() => {
          const clone = document.documentElement.cloneNode(true);
          clone.querySelectorAll('script, vite-error-overlay').forEach(n => n.remove());
          return `<!doctype html>\n${clone.outerHTML.replace(/>\s*</g, '>\n<')}\n`;
        });
        const domDir = path.join(outDir, 'dom', c.id);
        fs.mkdirSync(domDir, { recursive: true });
        fs.writeFileSync(path.join(domDir, `${s.name}.html`), html);
      }
    } catch (e) {
      console.error(`  [${c.id}/${s.name}] failed: ${e.message.split('\n')[0]}`);
      report[c.id][s.name] = { error: e.message.split('\n')[0] };
    }
    await page.close();
  }
  await ctx.close();
  console.log(`  ${c.id}: ${screens.length} screens`);
}

/** One PNG per screen: the four sizes side by side (DE light), and DE / AR × light / dark at 393. */
async function contactSheets(browser) {
  const sheetDir = path.join(outDir, 'sheets');
  fs.mkdirSync(sheetDir, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1900, height: 1100 }, deviceScaleFactor: 1 });
  const viewportScreens = screens.filter(s => !s.full).map(s => s.name);
  const cell = (id, name, label) => {
    const file = path.join(outDir, id, `${name}.png`);
    if (!fs.existsSync(file)) return '';
    const w = DEVICES[id.split('-')[0]].width;
    return `<figure><img src="${pathToFileURL(file).href}" style="width:${w}px"><figcaption>${label}</figcaption></figure>`;
  };
  const shoot = async (file, title, cells) => {
    if (!cells.some(Boolean)) return;
    const html = `<!doctype html><meta charset="utf-8"><style>
      body{margin:0;padding:20px 24px;background:#d9dbe1;font:600 15px system-ui,sans-serif;color:#1c1c1e}
      h1{font-size:20px;margin:0 0 14px} .row{display:flex;gap:22px;align-items:flex-start}
      figure{margin:0} img{display:block;border-radius:22px;box-shadow:0 0 0 1px rgba(0,0,0,.14),0 8px 24px rgba(0,0,0,.18)}
      figcaption{margin-top:8px;font-weight:600;color:#3a3a3c}</style>
      <h1>${title}</h1><div class="row">${cells.join('')}</div>`;
    const tmp = path.join(sheetDir, '_sheet.html');
    fs.writeFileSync(tmp, html);
    await page.goto(pathToFileURL(tmp).href);
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(sheetDir, file), fullPage: true });
  };
  const has = id => contexts.some(c => c.id === id);
  for (const name of viewportScreens) {
    const sizes = Object.keys(DEVICES).filter(dv => has(`${dv}-de-light`)).map(dv => cell(`${dv}-de-light`, name, DEVICES[dv].label));
    await shoot(`${name}-sizes.png`, `${name} · Deutsch · hell`, sizes);
    const variants = [['de', 'light', 'DE · hell'], ['de', 'dark', 'DE · dunkel'], ['ar', 'light', 'AR · hell'], ['ar', 'dark', 'AR · dunkel']]
      .filter(([lng, th]) => has(`16-${lng}-${th}`)).map(([lng, th, label]) => cell(`16-${lng}-${th}`, name, `${label} · 393`));
    await shoot(`${name}-variants.png`, `${name} · iPhone 16`, variants);
  }
  fs.rmSync(path.join(sheetDir, '_sheet.html'), { force: true });
  await page.close();
}

function writeAudit(report, safeAreaMode) {
  const head = (() => { try { return execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim(); } catch { return 'unknown'; } })();
  const meta = { capturedAt: new Date().toISOString(), commit: head, safeArea: [...safeAreaMode].join(','), devices: DEVICES };
  fs.writeFileSync(path.join(outDir, 'audit.json'), JSON.stringify({ meta, report }, null, 2));
  // The markdown digest merges identical findings across contexts.
  const lines = [`# UI audit`, '', `${meta.capturedAt} · commit ${head} · safe areas via ${meta.safeArea}`, ''];
  const byScreen = {};
  for (const [id, shots] of Object.entries(report)) for (const [name, r] of Object.entries(shots)) (byScreen[name] ??= []).push([id, r]);
  for (const [name, rows] of Object.entries(byScreen)) {
    lines.push(`## ${name}`, '');
    const small = new Map(), trunc = new Map(), tiny = new Map(), overflow = [];
    for (const [id, r] of rows) {
      if (r.error) { lines.push(`- ${id}: **error** ${r.error}`); continue; }
      if (r.overflowX) overflow.push(`${id} (+${r.overflowX}px)`);
      for (const x of r.small) { const k = `${x.name} — ${x.w}×${x.h} (${x.role})`; small.set(k, [...(small.get(k) ?? []), id]); }
      for (const x of r.truncated) trunc.set(x, [...(trunc.get(x) ?? []), id]);
      for (const x of r.tiny) { const k = `"${x.text}" ${x.px}px`; tiny.set(k, [...(tiny.get(k) ?? []), id]); }
    }
    const where = ids => ids.length === rows.length ? 'all' : ids.join(', ');
    lines.push(`- Horizontal overflow: ${overflow.length ? overflow.join(', ') : 'none'}`);
    lines.push(`- Targets under 44 px: ${small.size || 'none'}`);
    for (const [k, ids] of small) lines.push(`  - ${k} · ${where(ids)}`);
    lines.push(`- Truncated text: ${trunc.size || 'none'}`);
    for (const [k, ids] of trunc) lines.push(`  - ${k} · ${where(ids)}`);
    lines.push(`- Text under 11 px: ${tiny.size || 'none'}`);
    for (const [k, ids] of tiny) lines.push(`  - ${k} · ${where(ids)}`);
    lines.push('');
  }
  fs.writeFileSync(path.join(outDir, 'audit.md'), lines.join('\n'));
}

console.log(`UI review → ${path.relative(root, outDir)}  (${contexts.length} contexts × ${screens.length} screens)`);
const server = await createServer({ root, logLevel: 'error', server: { port: PORT, strictPort: true, host: '127.0.0.1' } });
await server.listen();
// The shipped categories (through Vite, so the TypeScript is the app's own),
// four of them with a monthly budget: one comfortable, one ahead of the
// month's pace, one over, one not touched yet. `--no-budgets` leaves them out.
if (!flag('no-budgets')) {
  const { defaultCategories } = await server.ssrLoadModule('/src/data/defaults.ts');
  const { SCHEMA_VERSION } = await server.ssrLoadModule('/src/logic.ts');
  const limits = { groceries: 65000, car: 40000, extra: 15000, restaurants: 12000 };
  DEMO = { categories: defaultCategories().map(c => (limits[c.id] ? { ...c, limit: limits[c.id] } : c)), schema: SCHEMA_VERSION };
}
const browser = await chromium.launch();
const report = {};
const safeAreaMode = new Set();
try {
  // Warm the dev server's module graph once before the parallel runs.
  const warm = await browser.newPage();
  await warm.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await warm.close();
  const queue = [...contexts];
  await Promise.all(Array.from({ length: 4 }, async () => {
    for (let c = queue.shift(); c; c = queue.shift()) await runContext(browser, c, report, safeAreaMode);
  }));
  writeAudit(report, safeAreaMode);
  if (!flag('no-sheets')) await contactSheets(browser);
  console.log(`Done. Safe areas via ${[...safeAreaMode].join(', ')}.`);
} finally {
  await browser.close();
  await server.close();
}
