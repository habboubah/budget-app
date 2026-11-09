// Performance guardrails (plan 01). Headless Chromium on a desktop stands in
// for the iPhone, so these are budgets that catch a regression, not promises:
//   - typing an amount: no long task (≥ 50 ms) while a key is handled
//   - switching month: the new month painted within 150 ms
//   - switching to Statistik and to Planen: painted within 200 ms (plan 06a)
//   - the main bundle: at most 10 % over the recorded gzip size
// With a year of data (src/fixtures/demo-year.json). Runs on the production
// build, served by `vite preview`.
//
// Usage: node scripts/perf-check.mjs [--no-build]
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4341;
const origin = `http://127.0.0.1:${PORT}`;

/**
 * The main chunk's gzip size (level 9) when this was recorded. Raise it only
 * with a note in the plan whose change made it grow.
 *   - plan 01, November 2026: 221 kB; month switch 23–33 ms, no long task while typing.
 *   - plans 06a + 13, November 2026: 254 kB (+32 kB: the insights engine, eight new
 *     cards and screens, their strings in three languages); month switch 20–43 ms,
 *     Statistik 17–50 ms, Planen 22–32 ms, no long task.
 *   - plans 03–29, November 2026: 280 kB (+26 kB over eleven plans: automatic +
 *     encrypted backups, security, currency, the amount calculator, favourites,
 *     bank-match, the yearly reserve, savings pots, import rules, split payments,
 *     tags and the year comparison — each with its screens, sheets and three-language
 *     strings); month switch 28–68 ms, Statistik 21–52 ms, Planen 24–32 ms, no long task.
 *   - plans 06 + 14, November 2026: 310 kB (+30 kB: smarter entering, the test data
 *     and the language loader had brought it to 305 kB; plan 06 added 2 kB — hidden
 *     amounts, the backup switch — and plan 14 3 kB — the widget snapshot, the inbox,
 *     deep links and their strings); month switch 51–121 ms, Statistik 32–50 ms,
 *     Planen 42–59 ms, no long task.
 */
const BUNDLE_GZIP_BASELINE = 310_000;
const BUNDLE_GROWTH = 1.10;
const MONTH_SWITCH_MS = 150;
const LONG_TASK_MS = 50;
/**
 * Switching to Statistik or Planen, painted (plan 06a; the iPhone SE's own
 * check — no long task over 50 ms — is done in Web Inspector on the device).
 */
const TAB_SWITCH_MS = 200;

const failures = [];
const report = (good, msg) => { if (!good) failures.push(msg); console.log(`  ${good ? '✓' : '✗'} ${msg}`); };

if (!process.argv.includes('--no-build')) {
  console.log('Building…');
  await build({ root, logLevel: 'error' });
}

// ---- Bundle size --------------------------------------------------------------
const assets = path.join(root, 'dist', 'assets');
const main = fs.readdirSync(assets).filter(f => /^index-.*\.js$/.test(f))
  .map(f => ({ f, size: fs.statSync(path.join(assets, f)).size }))
  .sort((a, b) => b.size - a.size)[0];
const gzip = zlib.gzipSync(fs.readFileSync(path.join(assets, main.f)), { level: 9 }).length;
report(gzip <= BUNDLE_GZIP_BASELINE * BUNDLE_GROWTH,
  `main bundle ${(gzip / 1000).toFixed(1)} kB gzip (recorded ${(BUNDLE_GZIP_BASELINE / 1000).toFixed(0)} kB, allowed +${Math.round((BUNDLE_GROWTH - 1) * 100)} %)`);

// ---- In the browser -------------------------------------------------------------
const year = JSON.parse(fs.readFileSync(path.join(root, 'src/fixtures/demo-year.json'), 'utf8'));
const server = await preview({ root, logLevel: 'error', preview: { port: PORT, strictPort: true, host: '127.0.0.1' } });
const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'de-DE', serviceWorkers: 'block', reducedMotion: 'reduce' });
  await ctx.addInitScript(y => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    localStorage.setItem('spartopf-lang', 'de');
    localStorage.setItem('spartopf-categories', JSON.stringify(y.categories));
    localStorage.setItem('spartopf-entries', JSON.stringify(y.entries));
    localStorage.setItem('spartopf-months', JSON.stringify(y.months));
    localStorage.setItem('spartopf-contracts', JSON.stringify(y.contracts));
    localStorage.setItem('spartopf-meta', JSON.stringify({ schemaVersion: 10, seeded: true }));
    localStorage.setItem('spartopf-intro-done', '1');
    // Long tasks, from the first moment on.
    window.__long = [];
    new PerformanceObserver(list => { for (const e of list.getEntries()) window.__long.push(e.duration); }).observe({ type: 'longtask', buffered: true });
  }, year);
  const page = await ctx.newPage();
  // The year ends in November 2026; open it there however late it is now.
  await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Month switch: from the click to the frame that shows the other month.
  const switches = [];
  for (let i = 0; i < 5; i++) {
    const ms = await page.evaluate(() => new Promise(resolve => {
      const title = () => document.querySelector('h1')?.textContent ?? '';
      const before = title();
      const t0 = performance.now();
      const done = () => requestAnimationFrame(() => resolve(performance.now() - t0));
      const mo = new MutationObserver(() => { if (title() !== before) { mo.disconnect(); done(); } });
      mo.observe(document.body, { subtree: true, childList: true, characterData: true });
      document.querySelector('header button[aria-label="Vorheriger Monat"]')?.click();
    }));
    switches.push(ms);
    await page.waitForTimeout(400);
  }
  const worst = Math.max(...switches);
  report(worst <= MONTH_SWITCH_MS, `month switch ${Math.round(Math.min(...switches))}–${Math.round(worst)} ms (budget ${MONTH_SWITCH_MS} ms)`);

  // Switching to Statistik and to Planen (plan 06a): from the tap to the frame that shows the tab.
  for (const [index, title] of [[1, 'Statistik'], [2, 'Planen']]) {
    const times = [];
    let longest = 0;
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => { document.querySelectorAll('nav button:not(.hero)')[0]?.click(); });
      await page.waitForTimeout(500);
      await page.evaluate(() => { window.__long = []; });
      times.push(await page.evaluate(({ index, title }) => new Promise(resolve => {
        const t0 = performance.now();
        const done = () => requestAnimationFrame(() => resolve(performance.now() - t0));
        const shown = () => document.querySelector('h1')?.textContent === title;
        const mo = new MutationObserver(() => { if (shown()) { mo.disconnect(); done(); } });
        mo.observe(document.body, { subtree: true, childList: true, characterData: true });
        document.querySelectorAll('nav button:not(.hero)')[index]?.click();
      }), { index, title }));
      await page.waitForTimeout(400);
      longest = Math.max(longest, ...(await page.evaluate(() => window.__long)), 0);
    }
    const slowest = Math.max(...times);
    report(slowest <= TAB_SWITCH_MS, `switch to ${title} ${Math.round(Math.min(...times))}–${Math.round(slowest)} ms, longest task ${Math.round(longest)} ms (budget ${TAB_SWITCH_MS} ms)`);
  }
  await page.evaluate(() => { document.querySelectorAll('nav button:not(.hero)')[0]?.click(); });
  await page.waitForTimeout(500);

  // Typing an amount into a new entry.
  await page.locator('nav button.hero').click();
  await page.waitForSelector('[role="dialog"]');
  await page.waitForTimeout(500);
  await page.evaluate(() => { window.__long = []; });
  for (const ch of '1234,56') { await page.keyboard.type(ch); await page.waitForTimeout(120); }
  await page.waitForTimeout(300);
  const long = await page.evaluate(() => window.__long);
  report(long.length === 0, long.length
    ? `typing an amount: ${long.length} long task(s), up to ${Math.round(Math.max(...long))} ms (budget: none over ${LONG_TASK_MS} ms)`
    : `typing an amount: no long task (budget: none over ${LONG_TASK_MS} ms)`);
  await ctx.close();
} finally {
  await browser.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}

if (failures.length) {
  console.error(`\nPerformance check failed (${failures.length}).`);
  process.exit(1);
}
console.log('\nPerformance check passed.');
