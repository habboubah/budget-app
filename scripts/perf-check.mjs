// Performance guardrails (plan 01). Headless Chromium on a desktop stands in
// for the iPhone, so these are budgets that catch a regression, not promises:
//   - typing an amount: no long task (≥ 50 ms) while a key is handled
//   - switching month: the new month painted within 150 ms
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
 * The main chunk's gzip size (level 9) when this was recorded — plan 01,
 * November 2026. Raise it only with a note in the plan whose change made it
 * grow. Recorded at the same time: month switch 23–33 ms, no long task while typing.
 */
const BUNDLE_GZIP_BASELINE = 221_000;
const BUNDLE_GROWTH = 1.10;
const MONTH_SWITCH_MS = 150;
const LONG_TASK_MS = 50;

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
