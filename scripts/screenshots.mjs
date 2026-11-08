// App Store screenshots for Spartopf, in German and English.
//
// Builds the web app, serves it, fills it with six realistic months (salary,
// rent, insurances, groceries …, generated relative to today so the current
// month is always "Dieser Monat"), and captures five screens per language at
// the 6.9" iPhone size App Store Connect requires: 1290 x 2796 (430 x 932
// points @3x). Run it on the Mac so the emoji are Apple's own.
//
// Usage:  npm run screenshots
// Once per machine:  npx playwright install chromium
// Output: screenshots/<de|en>/01-month.png …
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { preview } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'screenshots');
const PORT = 4319;
const VIEWPORT = { width: 430, height: 932 }; // x3 = 1290 x 2796

// Names per language, and the app's own labels the script clicks.
const L = {
  de: {
    locale: 'de-DE',
    names: {
      salary: 'Gehalt', child: 'Kindergeld', rent: 'Miete', power: 'Strom', net: 'Internet', phone: 'Handy',
      ins: 'Haftpflicht', gym: 'Fitnessstudio', fuel: 'Tanken', carIns: 'Kfz-Versicherung', carTax: 'Kfz-Steuer',
      shops: ['Lidl', 'Rewe', 'dm', 'Aldi', 'Edeka'], extras: ['Amazon', 'Apotheke', 'Restaurant', 'Kleidung'], kita: 'Kita',
    },
    addTo: /^Zu .+ hinzufügen$/,
    next: 'Nächster Monat',
    stats: 'Statistik',
    chip: 'Lidl',
  },
  en: {
    locale: 'en-GB',
    names: {
      salary: 'Salary', child: 'Child benefit', rent: 'Rent', power: 'Electricity', net: 'Internet', phone: 'Mobile phone',
      ins: 'Liability insurance', gym: 'Gym', fuel: 'Fuel', carIns: 'Car insurance', carTax: 'Car tax',
      shops: ['Lidl', 'Tesco', 'Boots', 'Aldi', 'Sainsbury’s'], extras: ['Amazon', 'Pharmacy', 'Restaurant', 'Clothes'], kita: 'Daycare',
    },
    addTo: /^Add to /,
    next: 'Next month',
    stats: 'Statistics',
    chip: 'Lidl',
  },
};

/** Six months of believable data ending in the current month (partly paid). */
function sampleData(n) {
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const now = new Date();
  const key = off => { const d = new Date(now.getFullYear(), now.getMonth() + off, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const today = now.getDate();
  let id = 0;
  const entries = [];
  const add = (month, categoryId, name, euros, paid, extra = {}) => entries.push({
    id: `s${++id}`, month, categoryId, name, amount: Math.round(euros * 100), paid, repeat: 'none',
    seriesId: extra.seriesId ?? `s${id}`, createdAt: id, ...extra,
  });
  const monthly = (name, due) => ({ repeat: 'monthly', seriesId: name, ...(due ? { dueDay: due } : {}) });
  const months = [];
  for (let off = -5; off <= 0; off++) {
    const m = key(off);
    months.push(off === -5 ? { key: m, opening: 820000, startedAt: id } : { key: m, startedAt: id });
    const cur = off === 0;
    const paidBy = due => !cur || due <= today;
    add(m, 'income', n.salary, 3480 + Math.round(rnd() * 120), paidBy(28), monthly(n.salary, 28));
    add(m, 'income', n.child, 255, paidBy(17), monthly(n.child, 17));
    add(m, 'fixed', n.rent, 1050, paidBy(1), monthly(n.rent, 1));
    add(m, 'fixed', n.power, 83, paidBy(3), monthly(n.power, 3));
    add(m, 'fixed', n.net, 39.99, paidBy(18), monthly(n.net, 18));
    add(m, 'fixed', n.phone, 19.99, paidBy(22), monthly(n.phone, 22));
    add(m, 'fixed', n.ins, 6.5, paidBy(1), monthly(n.ins, 1));
    add(m, 'fixed', n.gym, 24.9, paidBy(15), monthly(n.gym, 15));
    add(m, 'car', n.carIns, 54.26, paidBy(14), monthly(n.carIns, 14));
    if (off === -2) add(m, 'car', n.carTax, 140, true, { repeat: 'yearly', seriesId: n.carTax });
    const trips = cur ? 2 : 3 + Math.round(rnd() * 2);
    for (let i = 0; i < trips; i++) add(m, 'car', n.fuel, 55 + Math.round(rnd() * 3000) / 100, true);
    const shopping = cur ? 5 : 9 + Math.round(rnd() * 4);
    for (let i = 0; i < shopping; i++) add(m, 'groceries', n.shops[Math.floor(rnd() * n.shops.length)], 12 + Math.round(rnd() * 8500) / 100, true);
    for (const x of n.extras) if (rnd() > 0.35) add(m, 'extra', x, 9 + Math.round(rnd() * 9000) / 100, true);
    add(m, 'family', n.kita, 180, paidBy(5), monthly(n.kita, 5));
  }
  return { entries, months };
}

// Vite's own preview server, in-process, so it closes cleanly at the end.
const serve = () => preview({ root, logLevel: 'silent', preview: { port: PORT, strictPort: true, host: '127.0.0.1' } });

async function shoot(browser, lang) {
  const l = L[lang];
  const dir = path.join(outDir, lang);
  fs.mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 3, locale: l.locale, colorScheme: 'light', hasTouch: true, isMobile: true });
  const data = sampleData(l.names);
  await ctx.addInitScript(([d, lng]) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    localStorage.setItem('spartopf-entries', JSON.stringify(d.entries));
    localStorage.setItem('spartopf-months', JSON.stringify(d.months));
    localStorage.setItem('spartopf-lang', lng);
    localStorage.setItem('spartopf-intro-done', '1');
  }, [data, lang]);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.error(`[${lang}] page error:`, e.message));
  await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const pause = (ms = 350) => page.waitForTimeout(ms);
  const snap = async name => { await pause(700); await page.screenshot({ path: path.join(dir, `${name}.png`) }); console.log(`  ${lang}/${name}.png`); };

  await snap('01-month');

  // The groceries card's add button, found by the category's id: its name changes
  // ("Einkaufen" became "Lebensmittel und Drogerie") and broke a by-name lookup.
  await page.locator('main section[data-drop-category="groceries"]').getByRole('button', { name: l.addTo }).last().click(); await pause(600);
  await page.keyboard.type(lang === 'de' ? '47,85' : '47.85');
  await page.click(`button:text-is("${l.chip}")`);
  await snap('02-entry');
  await page.keyboard.press('Escape'); await pause(400);

  await page.click(`button[aria-label="${l.next}"]`); await pause(500);
  await snap('03-next-month');

  // Statistik shows a period up to the running month now, not one month with ‹ ›.
  await page.click(`nav button:has-text("${l.stats}")`); await pause(800);
  await snap('04-stats');

  // "Verlauf" / "Over time" — by id, and failing loudly if it is gone, not shooting the wrong screen.
  await page.locator('#history-title').evaluate(h => {
    h.scrollIntoView({ block: 'start' });
    window.scrollBy(0, -70);
  });
  await snap('05-history');

  await ctx.close();
}

console.log('Building …');
execSync('npx vite build', { cwd: root, stdio: 'ignore' });
const server = await serve();
const browser = await chromium.launch();
try {
  for (const lang of Object.keys(L)) await shoot(browser, lang);
  console.log(`\nDone → ${path.relative(root, outDir)}/  (1290 × 2796, the 6.9" iPhone slot)`);
} finally {
  await browser.close();
  await new Promise(r => server.httpServer.close(() => r()));
}
