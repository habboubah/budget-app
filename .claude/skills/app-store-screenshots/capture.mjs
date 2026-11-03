#!/usr/bin/env node
// Store screenshots: build -> serve dist -> seed localStorage -> walk every
// screen -> shoot at each store resolution. Run via `npm run screenshots`.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, rmSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
// Default config is the store set. Pass another one to sweep a different matrix
// (see config.redesign.json, which sweeps themes, text scale and phone sizes).
const cfgPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(here, 'config.json');
const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));

// Axes a config may leave out. A scalar `theme` is the store config's spelling.
const themes = cfg.themes ?? [cfg.theme];
const fontScales = cfg.fontScales ?? [1];
const fixture = JSON.parse(readFileSync(path.join(root, cfg.fixture), 'utf8'));
// CAPTURE_OUT overrides the config's outDir, so the same matrix can be shot into
// before/, prototype/ and after/ without editing the config between runs.
// resolve, not join: CAPTURE_OUT may be absolute (capturing the base
// revision from a git worktree into this repo's screenshots/).
const outDir = path.resolve(root, process.env.CAPTURE_OUT || cfg.outDir);

const die = msg => { console.error(`\n✗ ${msg}\n`); process.exit(1); };

// The Today tab only says "Today" when the newest logged day is the frozen
// date. Silently shifting by a day would quietly change every screenshot.
const newestDay = fixture.workDays.map(d => d.id).sort().pop();
if (!cfg.freezeAt.startsWith(newestDay)) {
  die(`freezeAt (${cfg.freezeAt}) is not on the fixture's newest day (${newestDay}). `
    + `Fix config.json or the fixture.`);
}

// Everything the app reads at boot. localStorage.clear() first, so a rerun
// always starts from the same state no matter what the previous run left.
function seed([data, locale, theme, accent, now]) {
  // sessionStorage survives a reload but not the context, and the init script
  // re-runs on every navigation — which is exactly why the first attempt at
  // capturing first-use states failed. Clearing localStorage after load then
  // reloading just re-seeded the fixture, so every "empty" shot came out full.
  const empty = sessionStorage.getItem('cap-empty') === '1';
  localStorage.clear();
  localStorage.setItem('pizza-driver-days', JSON.stringify(empty ? [] : data.workDays));
  localStorage.setItem('pizza-driver-fuel', JSON.stringify(empty ? [] : data.fuelEntries));
  localStorage.setItem('pizza-driver-settings', JSON.stringify(data.settings));
  localStorage.setItem('pizza-driver-lang', locale);
  localStorage.setItem('pizza-driver-theme-mode', theme);
  localStorage.setItem('pizza-driver-theme-accent', accent);
  // Suppresses the "time to back up" banner on Today — it is a nag, not a feature.
  localStorage.setItem('pizza-driver-last-backup', String(now));
}

// A click that swaps screens leaves the outgoing screen mounted while it fades,
// so the next step's selector can match the screen we just left — that silently
// shot the Odometer and filed it as Settings. Wait out the swap between steps.
// The swap also leaves the new screen at opacity 0 well after the click
// resolves, so a flat wait shot blank pages, and `document.getAnimations()`
// reports a permanent runner on the trip list. Compare frames instead: two
// identical ones mean the screen has stopped moving, which is the real question.
async function waitStable(page, label) {
  await page.waitForTimeout(150);
  let prev = null;
  for (let i = 0; i < 20; i++) {
    const buf = await page.screenshot({ animations: 'disabled' });
    if (prev && buf.equals(prev)) return buf;
    prev = buf;
    await page.waitForTimeout(200);
  }
  die(`${label}: never stopped moving after 4s — the shot would be mid-transition.`);
}

async function serve() {
  const proc = spawn('npx', ['vite', 'preview', '--port', String(cfg.port), '--strictPort'],
    { cwd: root, stdio: 'ignore', detached: true });
  const url = `http://localhost:${cfg.port}/`;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(url)).ok) return { proc, url }; } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 500));
  }
  try { process.kill(-proc.pid); } catch { /* already gone */ }
  die(`preview server never answered on ${url} — did \`vite build\` run?`);
}

mkdirSync(outDir, { recursive: true });
// Only generated files. Anything hand-made in screenshots/ is left alone.
for (const f of readdirSync(outDir)) {
  if (/^\d+-.+\.png$/.test(f)) rmSync(path.join(outDir, f));
}

// Browser first: if it fails to launch, no server is left orphaned behind it.
// The flags pin text rasterisation so a rerun on another Mac matches this one.
const browser = await chromium.launch({
  args: ['--force-color-profile=srgb', '--font-render-hinting=none', '--disable-lcd-text'],
});
const { proc, url } = await serve();
let shots = 0;

try {
  for (const device of cfg.devices) {
   for (const theme of themes) {
    for (const fontScale of fontScales) {
     for (const locale of cfg.locales) {
      const ctx = await browser.newContext({
        viewport: { width: device.width, height: device.height },
        deviceScaleFactor: device.scale,
        isMobile: true,
        hasTouch: true,
        locale: locale === 'de' ? 'de-DE' : 'en-US',
        timezoneId: cfg.timezone,
        colorScheme: theme,
        // MotionConfig picks this up and drops the transform animations. The
        // opacity fades survive it, which is what waitStable() is there for.
        reducedMotion: 'reduce',
        // A cached SW would serve a stale build on the second run.
        serviceWorkers: 'block',
      });
      await ctx.clock.setFixedTime(new Date(cfg.freezeAt));
      await ctx.addInitScript(seed,
        [fixture, locale, theme, cfg.accent, Date.parse(cfg.freezeAt)]);

      const variant = `${device.id}/${theme}/${fontScale}x/${locale}`;
      const page = await ctx.newPage();
      for (const [i, screen] of cfg.screens.entries()) {
        // Fresh load per screen: nav state lives in useState, so this is the
        // only way back to a known starting point.
        await page.goto(url, { waitUntil: 'load' });
        // First-use states the demo fixture can't show. The flag has to be set
        // before the seed runs, and the seed runs on navigation — hence set,
        // then reload so the init script sees it.
        if (screen.empty) {
          await page.evaluate(() => sessionStorage.setItem('cap-empty', '1'));
          await page.reload({ waitUntil: 'load' });
        }
        await page.waitForSelector('main', { timeout: 15000 });
        // Colour transitions (tab bar, row press states) were still in flight
        // when the frame went quiet, which changed pixels between runs.
        await page.addStyleTag({ content: '*,*::before,*::after{transition:none !important}' });

        // Stands in for the OS text-size setting: the root font size is what the
        // iOS Dynamic Type probe moves, and what Android's text zoom multiplies.
        // A stylesheet, not addInitScript — an init script runs before
        // <html> exists, so setting a style on documentElement there silently
        // does nothing and every scaled shot comes out identical to its 1x twin.
        if (fontScale !== 1) {
          await page.addStyleTag({ content: `html{font-size:${16 * fontScale}px}` });
        }

        const label = `screen "${screen.name}" [${variant}]`;
        for (const [s, selector] of screen.steps.entries()) {
          try {
            await page.click(selector, { timeout: 5000 });
          } catch {
            die(`${label}: step ${s + 1} "${selector}" was not clickable. `
              + `The screen was not captured — fix the selector in ${path.basename(cfgPath)}.`);
          }
          // A step must land on the new screen, not on the one fading out.
          await waitStable(page, label);
        }
        if (screen.scrollY) await page.evaluate(y => window.scrollTo(0, y), screen.scrollY);

        // An axis only enters the filename once there is more than one value on
        // it to tell apart.
        const suffix = (cfg.locales.length > 1 ? `-${locale}` : '')
          + (cfg.devices.length > 1 ? `-${device.id}` : '')
          + (themes.length > 1 ? `-${theme}` : '')
          + (fontScales.length > 1 ? `-fs${Math.round(fontScale * 100)}` : '');
        const name = `${String(i + 1).padStart(2, '0')}-${screen.name}${suffix}.png`;
        writeFileSync(path.join(outDir, name), await waitStable(page, label));
        shots++;
        // Cleared here, so the next screen's navigation seeds the full fixture.
        if (screen.empty) await page.evaluate(() => sessionStorage.removeItem('cap-empty'));
      }
      await ctx.close();
      console.log(`✓ ${variant} — ${cfg.screens.length} screens`);
     }
    }
   }
  }
} finally {
  await browser.close();
  try { process.kill(-proc.pid); } catch { /* already gone */ }
}

console.log(`\n${shots} screenshots in ${path.relative(root, outDir)}/`);
