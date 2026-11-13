// The guide's pictures (Mehr › Anleitung): a real screenshot of each
// topic's screen, from the app's own test data.
//
// Starts Vite's dev server in-process, opens a fresh app at iPhone size
// (393 × 852, its safe areas, 2×), skips the start, taps *Testdaten
// hinzufügen* in Mehr › Einstellungen — the same year of a household anyone
// can add — and then, topic by topic, goes where the topic is, outlines the
// control it is about and crops that part of the screen. The month page and
// the entry sheet are shown as a new book has them (plan 39), with what a
// topic is about opened the way its steps say; Planen shows its cards whole. German, English and Arabic,
// light and dark; the other languages show the English pictures
// (src/guideShots.ts says which exist and how large they are).
//
// Run it again after a change to a screen the guide shows:
//
//   npm run guide-shots                              all six sets
//   npm run guide-shots -- --sets de-light,ar-dark   some sets
//   npm run guide-shots -- --only balances,bank      some topics (the others are kept)
//
// Writes public/guide/<lang>-<theme>/<topic>.webp and src/guideShots.ts.
// Once per machine:  npx playwright install chromium --only-shell
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(`--${name}`); return i === -1 ? fallback : args[i + 1]; };
const list = (name, fallback) => opt(name, fallback).split(',').map(s => s.trim()).filter(Boolean);

const ALL_SETS = ['de-light', 'de-dark', 'en-light', 'en-dark', 'ar-light', 'ar-dark'];
const sets = list('sets', ALL_SETS.join(','));
const only = opt('only', '') ? list('only', '') : null;
const PORT = Number(opt('port', '4331'));
const outDir = path.join(root, 'public', 'guide');
const manifestFile = path.join(root, 'src', 'guideShots.ts');

/** iPhone 16: points, safe areas. */
const D = { width: 393, height: 852, top: 59, bottom: 34 };
/** The picture is cut from the main column, the same width every time. */
const X0 = 8, X1 = D.width - 8;

const server = await createServer({ root, logLevel: 'error', server: { port: PORT, strictPort: true, host: '127.0.0.1' } });
await server.listen();
const { default: translations } = await server.ssrLoadModule('/src/translations.ts');
const { TIP_IDS } = await server.ssrLoadModule('/src/tips.ts');
const { GUIDE_TOPICS } = await server.ssrLoadModule('/src/guide.ts');

const wait = (page, ms = 450) => page.waitForTimeout(ms);
const tab = async (page, n) => { await page.locator('nav button:not(.hero)').nth(n).click(); await wait(page); };
/** A row or a card of Mehr (or any screen) by its label. */
const open = async (page, label) => { await page.locator('main button', { hasText: label }).first().click(); await wait(page, 550); };
const addSheet = async page => { await page.locator('[data-tour="add"]').click(); await page.waitForSelector('[data-tour="entry-amount"]'); await wait(page, 500); };
const actionsMenu = async page => { await page.locator('[data-tour="actions"]').click(); await page.waitForSelector('[role="menu"]'); await wait(page, 350); };
const menuItem = (t, label) => `[role="menu"] [role="menuitem"]:has-text("${label.replace(/"/g, '\\"')}")`;
/** Mehr › Einstellungen: what is set once (plan 39). */
const prefs = async (page, t) => { await tab(page, 3); await open(page, t.prefsTitle); };
/** The month's "⋯" › Importieren: the sheet with every way to bring entries in. */
const importSheet = async (page, t) => { await actionsMenu(page); await page.locator(menuItem(t, t.importMenu)).first().click(); await page.waitForSelector('[role="dialog"]'); await wait(page, 600); };
const sheetRow = label => `[role="dialog"] button:has-text("${label.replace(/"/g, '\\"')}")`;

/**
 * Each topic: where it is (`go`), what is cut out (`crop`: selectors whose
 * boxes together make the picture, or `top`: the screen from under the status
 * bar), how tall it may be, and what is outlined (`ring`).
 */
const SHOTS = {
  balances: { crop: ['[data-tour="balance"]'] },
  paid: { crop: ['[data-drop-category]:has([data-entry-row])'], ring: ['[data-drop-category]:has([data-entry-row]) [data-entry-row] [role="checkbox"]'], max: 330 },
  months: { go: async p => { await p.locator('[data-tour="month"]').click(); await wait(p, 700); }, crop: ['[role="dialog"]'], max: 440 },
  categories: { crop: ['[data-drop-category]:has([data-entry-row])', '[data-drop-category] >> nth=1'], max: 420 },
  search: {
    go: async (p, t, lang) => { await p.locator('[data-tour="search"] input').click(); await p.keyboard.type(`#${lang === 'de' ? 'urlaub' : 'holiday'}`); await wait(p, 700); },
    top: true, max: 430,
  },
  due: { crop: ['[data-tour="due"]'] },
  add: {
    go: async (p, t, lang) => { await addSheet(p); await p.locator('[data-tour="entry-amount"] input').fill(lang === 'de' ? '12,5+4,8' : '12.5+4.8'); await wait(p, 300); },
    crop: ['[data-tour="entry-amount"]', '[data-tour="entry-name"]'], ring: ['[data-tour="entry-amount"]'], max: 300,
  },
  repeats: {
    go: async p => { await addSheet(p); await p.locator('[data-tour="entry-repeat"]').click(); await p.waitForSelector('[role="menu"]'); await wait(p, 350); },
    crop: ['[data-tour="entry-details"]', '[role="menu"]'], ring: ['[data-tour="entry-repeat"]'], max: 440, stay: true,
  },
  favorites: {
    go: addSheet,
    crop: t => [`[role="dialog"] [role="group"][aria-label="${t.favorites}"]`, '[data-tour="entry-amount"]'], ring: t => [`[role="dialog"] [role="group"][aria-label="${t.favorites}"]`], max: 300,
  },
  split: {
    go: async (p, t) => {
      // An expense of the month, opened: its editor ends on *Aufteilen* (not a part of a split already, nor a refund).
      const button = `[role="dialog"] button:has-text("${t.splitPayAction}")`;
      for (const cat of ['restaurants', 'car', 'extra', 'groceries', 'housing']) {
        const entries = p.locator(`[data-drop-category="${cat}"] [data-entry-body]`);
        for (let i = 0; i < Math.min(3, await entries.count()); i++) {
          await entries.nth(i).scrollIntoViewIfNeeded();
          await entries.nth(i).click();
          await wait(p, 600);
          if (await p.locator(button).count()) {
            await p.locator(button).scrollIntoViewIfNeeded();
            await wait(p, 400);
            return;
          }
          await p.keyboard.press('Escape');
          await wait(p, 400);
        }
      }
      throw new Error('no entry to split');
    },
    crop: t => [`[role="dialog"] button:has-text("${t.splitPayAction}")`],
    ring: t => [`[role="dialog"] button:has-text("${t.splitPayAction}")`], pad: 70, stay: true,
  },
  receipts: {
    // The receipt and the tag wait behind the sheet's "⋯" on a new book.
    go: async p => { await addSheet(p); await p.locator('[data-tour="entry-more"]').click(); await wait(p, 400); },
    crop: ['[data-tour="entry-details"]'], ring: t => ['[data-tour="entry-receipt"]', `[data-tour="entry-details"] button:has-text("${t.tag}")`], pad: 24,
  },
  capture: { go: async (p, t) => { await tab(p, 3); await open(p, t.captureRow); }, top: true, max: 420 },
  budgets: { go: p => tab(p, 2), crop: ['[data-tour="plan-budgets"]'], max: 420 },
  goals: { go: p => tab(p, 2), crop: ['[data-tour="plan-goals"]'], max: 420 },
  outlook: { go: p => tab(p, 2), crop: ['[data-tour="plan-outlook"]'], max: 440 },
  contracts: { go: p => tab(p, 2), crop: ['[data-tour="plan-contracts"]'], max: 420 },
  debts: { go: async (p, t) => { await tab(p, 3); await open(p, t.debtsTitle); }, top: true, max: 380 },
  stats: { go: p => tab(p, 1), crop: ['[data-tour="stats-hero"]'], max: 440 },
  reports: { go: async (p, t) => { await actionsMenu(p); await p.locator(menuItem(t, t.reportTitle)).first().click(); await wait(p, 800); }, top: true, max: 430 },
  bank: { go: importSheet, crop: t => [sheetRow(t.importPhoto), sheetRow(t.importCsv), sheetRow(t.importPdf)], ring: t => [sheetRow(t.importPhoto), sheetRow(t.importCsv), sheetRow(t.importPdf)], pad: 50, max: 520, stay: true },
  invoice: { go: importSheet, crop: t => [sheetRow(t.scanInvoice)], ring: t => [sheetRow(t.scanInvoice)], pad: 110, stay: true },
  excel: { go: async (p, t) => { await tab(p, 3); await open(p, t.transferTitle); }, crop: t => [`main section:has(button:has-text("${t.importExcel}"))`], ring: t => [`main button:has-text("${t.importExcel}")`], max: 300 },
  reconcile: { go: actionsMenu, crop: t => [menuItem(t, t.balanceCheck)], ring: t => [menuItem(t, t.balanceCheck)], pad: 110 },
  accounts: { go: async (p, t) => { await tab(p, 3); await open(p, t.accountsTitle); }, top: true, max: 380 },
  projects: { go: async (p, t) => { await tab(p, 3); await open(p, t.projectsTitle); }, top: true, max: 380 },
  tax: { go: async (p, t) => { await tab(p, 3); await open(p, t.taxTitle); }, top: true, max: 400 },
  monthStart: { go: async (p, t) => { await prefs(p, t); await open(p, t.monthStartRow); await wait(p, 300); }, crop: ['[role="dialog"]'], max: 440 },
  private: { go: prefs, crop: ['main section.hero'], max: 360 },
  backup: { go: async (p, t) => { await tab(p, 3); await open(p, t.transferTitle); }, top: true, max: 420 },
  lock: { go: prefs, crop: ['[data-tour="set-security"]'], max: 440 },
  reminders: { go: async (p, t) => { await prefs(p, t); await open(p, t.remindersRow); }, top: true, max: 420 },
  look: { go: prefs, crop: ['[data-tour="set-display"]'], max: 420 },
};

const missing = GUIDE_TOPICS.map(t => t.id).filter(id => !SHOTS[id]);
if (missing.length) throw new Error(`No shot for: ${missing.join(', ')}`);

/** What is known so far: kept for the sets and topics not taken this time. */
const manifest = (() => {
  try {
    const m = fs.readFileSync(manifestFile, 'utf8').match(/=\s*(\{[\s\S]*\});/);
    return m ? JSON.parse(m[1]) : {};
  } catch { return {}; }
})();

const browser = await chromium.launch();
for (const set of sets) {
  const [lang, theme] = set.split('-');
  const t = translations[lang];
  const ctx = await browser.newContext({
    viewport: { width: D.width, height: D.height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    locale: t.locale, colorScheme: theme, reducedMotion: 'reduce', serviceWorkers: 'block',
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error(`  [${set}] page error: ${e.message}`));
  // A fresh book, once (sessionStorage survives the reloads between topics):
  // the start skipped and its *Erste Schritte* put away, every tip met, the
  // phone app's rows on, and Planen's cards whole (a new book has headlines).
  await page.addInitScript(([lang, tips]) => {
    if (sessionStorage.getItem('guide-shots')) return;
    sessionStorage.setItem('guide-shots', '1');
    localStorage.clear();
    localStorage.setItem('spartopf-lang', lang);
    localStorage.setItem('spartopf-intro-done', '1');
    localStorage.setItem('spartopf-tips-done', '1');
    localStorage.setItem('spartopf-steps-done', '1');
    localStorage.setItem('spartopf-plan-open', '"all"');
    localStorage.setItem('spartopf-tip-state', JSON.stringify({ done: tips }));
    localStorage.setItem('spartopf-last-export', new Date().toISOString().slice(0, 10));
    localStorage.setItem('spartopf-dev-native', '1');
    // Euros in every set: the English pictures stand in for eleven more languages, most of them in the euro area.
    localStorage.setItem('spartopf-currency', JSON.stringify('EUR'));
  }, [lang, TIP_IDS]);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: D.top, topMax: D.top, bottom: D.bottom, bottomMax: D.bottom, left: 0, leftMax: 0, right: 0, rightMax: 0 } }).catch(() => {});
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // The test data, the way anyone adds it.
  await prefs(page, t);
  await page.locator('main button', { hasText: t.demoAdd }).first().click();
  await wait(page, 1200);

  fs.mkdirSync(path.join(outDir, set), { recursive: true });
  manifest[set] ??= {};
  const ids = GUIDE_TOPICS.map(x => x.id).filter(id => !only || only.includes(id));
  for (const id of ids) {
    const s = SHOTS[id];
    try {
      await page.reload({ waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await wait(page, 350);
      if (s.go) await s.go(page, t, lang);
      const crop = typeof s.crop === 'function' ? s.crop(t) : s.crop;
      const ring = typeof s.ring === 'function' ? s.ring(t) : s.ring;
      // The first thing cut out is brought into view — unless `stay`: the entry sheet's repeat menu, the editor's last button.
      if (crop && !s.stay) {
        await page.locator(crop[0]).first().evaluate(el => {
          // In a sheet or a menu: the middle of its own scroll. On the page: under the header.
          if (el.closest('[role="dialog"], [role="menu"]')) el.scrollIntoView({ block: 'center' });
          else window.scrollBy(0, el.getBoundingClientRect().top - 130);
        });
        await wait(page, 300);
      }
      if (ring) {
        for (const sel of ring) {
          await page.locator(sel).first().evaluate(el => {
            el.style.outline = '3px solid var(--color-accent)';
            el.style.outlineOffset = '-3px';
          });
        }
      }
      await wait(page, 200);
      let box;
      if (s.top) {
        box = { y0: D.top, y1: D.top + (s.max ?? 420) };
      } else {
        const boxes = [];
        for (const sel of crop) {
          const b = await page.locator(sel).first().boundingBox();
          if (b) boxes.push(b);
        }
        if (!boxes.length) throw new Error(`nothing at ${crop.join(' + ')}`);
        const pad = s.pad ?? 10;
        const y0 = Math.max(D.top, Math.min(...boxes.map(b => b.y)) - pad);
        const y1 = Math.min(D.height - D.bottom, Math.max(...boxes.map(b => b.y + b.height)) + pad, y0 + (s.max ?? 440));
        box = { y0, y1 };
      }
      const clip = { x: X0, y: Math.round(box.y0), width: X1 - X0, height: Math.round(box.y1 - box.y0) };
      const png = await page.screenshot({ clip });
      // To WebP in the page itself (Chromium's encoder): no image library needed.
      const webp = await page.evaluate(async b64 => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        return c.toDataURL('image/webp', 0.74).split(',')[1];
      }, png.toString('base64'));
      const file = path.join(outDir, set, `${id}.webp`);
      fs.writeFileSync(file, Buffer.from(webp, 'base64'));
      manifest[set][id] = [clip.width, clip.height];
      console.log(`  ${set}/${id}: ${clip.width}×${clip.height}, ${Math.round(fs.statSync(file).size / 1024)} kB`);
    } catch (e) {
      console.error(`  ${set}/${id}: failed — ${e.message.split('\n')[0]}`);
    }
  }
  await ctx.close();
}
await browser.close();
await server.close();

// The sizes, so the guide keeps its place while a picture loads.
const ordered = Object.fromEntries(ALL_SETS.filter(s => manifest[s]).map(s => [s, Object.fromEntries(Object.entries(manifest[s]).sort())]));
fs.writeFileSync(manifestFile, `/*
 * The guide's pictures (public/guide/<set>/<topic>.webp) and their size in
 * points — written by scripts/guide-shots.mjs, don't edit by hand. German,
 * English and Arabic have their own, light and dark; every other language
 * shows the English ones. A topic without a picture here shows its drawing
 * (GuideScenes.tsx).
 */
export const GUIDE_SHOT_LANGS = ['de', 'en', 'ar'] as const;

export const GUIDE_SHOTS: Record<string, Record<string, [number, number]>> = ${JSON.stringify(ordered, null, 2)};
`);
console.log('Done.');
