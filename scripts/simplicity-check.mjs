// The complexity budget (plan 39): what a new book puts in front of someone
// in the first five minutes, counted — so the screens that were emptied stay
// that way when the next feature arrives.
//
// On the production build, at iPhone size, in German, from a fresh install:
// each state below is reached the way a person reaches it, and what can be
// tapped in the first viewport is counted (buttons, links, fields, switches
// — the tab bar and its add button included; with a sheet or a menu open,
// only what is in it), and on the month page the amounts that show. A state
// over its budget fails the check.
//
// Raising a budget takes a note in the plan that raised it, as with the
// bundle size (scripts/perf-check.mjs): a new control on one of these
// screens is a decision, not a side effect.
//
// Usage: node scripts/simplicity-check.mjs [--no-build] [--list]
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4343;
const origin = `http://127.0.0.1:${PORT}`;
const list = process.argv.includes('--list');

/**
 * The budgets: tappable elements in the first viewport (`taps`), rows of a
 * menu or a list (`rows`), amounts showing (`figures`).
 *   - plan 39, November 2026: recorded as built. Before it the first screen
 *     after install had 21–23 controls, the month page of a new book 16–23
 *     with 4–5 amounts, the entry sheet 25, the month's "⋯" 9–10 rows,
 *     Optionen 17–22 rows on 2.5 screens, Planen 12.
 *   - November 2026, on Ahmad's word: Planen and Statistik show every card
 *     whole from the start (nobody should have to open each card for its
 *     chart), so Planen's first viewport holds the 30-day chart's four weeks
 *     (9 → 13); and *Wofür das Geld geht* has its period menu on the
 *     categories too (Statistik 8 → 9).
 *   - 13 November 2026, on Ahmad's word: the month's "⋯" is one level —
 *     no *Mehr* row with a second menu behind it; only the imports keep
 *     their sheet. In a first month that is the report, the balance, the
 *     imports, folding all and deleting the month (4 → 5; a second month
 *     adds the recurring entries, a second account *Umbuchen*).
 */
const BUDGET = {
  'the first screen after install': { taps: 6 },
  'the month page, everything put off': { taps: 13, figures: 2 },
  'the entry sheet, a new entry': { taps: 16 },
  'the month’s “⋯”': { rows: 5 },
  'Mehr': { rows: 13 },
  'Planen in the first month': { taps: 13 },
  'Statistik in the first month': { taps: 9 },
};

const failures = [];
const report = (good, msg) => { if (!good) failures.push(msg); console.log(`  ${good ? '✓' : '✗'} ${msg}`); };

if (!process.argv.includes('--no-build')) {
  console.log('Building…');
  await build({ root, logLevel: 'error' });
}

/** What can be tapped and shows in the viewport — inside the open sheet or menu when there is one. */
const taps = () => {
  const scope = document.querySelector('[role="menu"]') ?? [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].pop() ?? document.body;
  const shows = el => {
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.bottom <= 0 || r.top >= innerHeight) return false;
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || n.hasAttribute('inert') || n.getAttribute('aria-hidden') === 'true') return false;
    }
    return true;
  };
  const name = el => (el.getAttribute('aria-label') || el.innerText || el.getAttribute('placeholder') || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 32);
  return [...scope.querySelectorAll('button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="checkbox"], [role="switch"], [role="radio"], [role="menuitem"]')]
    .filter(shows).map(name);
};
/** The amounts of money that show in the viewport — a number with the currency's sign, wherever the markup splits them. */
const figures = () => {
  const money = /\d[\d.,\s]*\s?€|€\s?\d/;
  const text = el => (el.innerText ?? '').replace(/\s+/g, ' ').trim();
  const found = new Set();
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (!/\d/.test(n.nodeValue ?? '')) continue;
    // The number's own element, or the nearest one around it that also holds the sign.
    let el = n.parentElement;
    for (let up = 0; el && up < 3 && !money.test(text(el)); up++) el = el.parentElement;
    // An amount and little else ("−1.234,56 €"): a sentence that mentions one is not a figure. What shows counts,
    // whoever it is hidden from: the large amounts are drawn for the eye and read out from a twin.
    if (!el || !money.test(text(el)) || text(el).length > 20 || el.closest('[inert], .sr-only')) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.bottom <= 0 || r.top >= innerHeight || getComputedStyle(el).visibility === 'hidden') continue;
    found.add(el);
  }
  // An amount inside another counted element is the same amount.
  return [...found].filter(el => ![...found].some(o => o !== el && el.contains(o))).map(text);
};

const server = await preview({ root, logLevel: 'error', preview: { port: PORT, strictPort: true, host: '127.0.0.1' } });
const browser = await chromium.launch();
try {
  /** A fresh install each time: no storage, German (the buttons below are found by position, not by label). */
  const fresh = async () => {
    const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'de-DE', serviceWorkers: 'block', reducedMotion: 'reduce' });
    await ctx.addInitScript(() => { try { if (localStorage.getItem('spartopf-lang') == null) localStorage.setItem('spartopf-lang', 'de'); } catch { /* no storage */ } });
    const page = await ctx.newPage();
    page.on('pageerror', e => report(false, `page error: ${e.message}`));
    await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-start="go"]', { timeout: 15000 });
    await page.waitForTimeout(400);
    return { ctx, page };
  };
  const wait = (page, ms = 450) => page.waitForTimeout(ms);
  const tab = async (page, n) => { await page.locator('nav button:not(.hero)').nth(n).click(); await wait(page); };
  /** The start, put off: the month page of a book with nothing in it. */
  const putOff = async page => {
    await page.locator('[data-start="go"]').click();
    for (let i = 0; i < 3; i++) { await wait(page, 350); await page.locator('[data-start="later"]').click(); }
    await page.waitForSelector('[data-tour="add"]');
    await wait(page, 600);
  };
  /** The start, answered: a balance, an income, the rent. */
  const answered = async page => {
    await page.locator('[data-start="go"]').click();
    await page.locator('[data-start="balance"]').fill('2450');
    await page.locator('[data-start="next"]').click();
    await page.locator('[data-start="income"]').fill('3200');
    await page.locator('[data-start="next"]').click();
    await page.locator('[data-start="fixed-0"]').fill('950');
    await page.locator('[data-start="next"]').click();
    await wait(page, 700);
    await page.locator('[data-start="finish"]').click();
    await page.waitForSelector('[data-tour="add"]');
    await wait(page, 600);
  };
  const check = async (page, state, rowsOf) => {
    const b = BUDGET[state];
    const t = await page.evaluate(taps);
    if (b.taps !== undefined) report(t.length <= b.taps, `${state}: ${t.length} to tap (budget ${b.taps})`);
    if (b.rows !== undefined) {
      const n = await page.locator(rowsOf).count();
      report(n <= b.rows, `${state}: ${n} rows (budget ${b.rows})`);
    }
    if (b.figures !== undefined) {
      const f = await page.evaluate(figures);
      report(f.length <= b.figures, `${state}: ${f.length} ${f.length === 1 ? 'amount' : 'amounts'} (budget ${b.figures})${list ? ` — ${f.join(' | ')}` : ''}`);
    }
    if (list) console.log(`      ${t.join(' | ')}`);
  };

  console.log('What a new book shows');
  {
    const { ctx, page } = await fresh();
    await check(page, 'the first screen after install');
    await putOff(page);
    await check(page, 'the month page, everything put off');
    await page.locator('[data-tour="add"]').click();
    await page.waitForSelector('[role="dialog"] input[inputmode="decimal"]');
    await wait(page, 700);
    await check(page, 'the entry sheet, a new entry');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), null, { timeout: 5000 });
    await wait(page);
    await page.locator('[data-tour="actions"]').click();
    await page.waitForSelector('[role="menu"]');
    await wait(page, 350);
    await check(page, 'the month’s “⋯”', '[role="menu"] [role="menuitem"]');
    await page.keyboard.press('Escape');
    await wait(page);
    await tab(page, 3);
    await check(page, 'Mehr', 'main button');
    await ctx.close();
  }
  {
    const { ctx, page } = await fresh();
    // With the start answered the month page holds the book's first entries, and grows with them: no budget there.
    await answered(page);
    await tab(page, 2);
    await check(page, 'Planen in the first month');
    await tab(page, 1);
    await check(page, 'Statistik in the first month');
    await ctx.close();
  }
} finally {
  await browser.close();
  await server.close();
}

if (failures.length) {
  console.error(`\nSimplicity check failed (${failures.length}).`);
  process.exit(1);
}
console.log('\nSimplicity check passed.');
