// The privacy promise, checked: Spartopf talks to nobody.
//
// 1. Builds the app, serves dist/ with `vite preview`, and drives Chromium
//    through what people do — the first run, an entry added and ticked off,
//    every tab, a bank CSV imported, a screenshot read by the on-device OCR, a
//    backup exported — recording every request. Any request to another origin
//    fails the check (it is aborted, so nothing leaves this machine either).
// 2. Every http(s) URL written into dist/ has to be on the allowlist below,
//    with the reason it is harmless — so a new one gets looked at.
//
// Usage: node scripts/privacy-check.mjs [--no-build]
// Once per machine: npx playwright install chromium --only-shell
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { build, preview } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const PORT = 4340;
const origin = `http://127.0.0.1:${PORT}`;

/** URLs that may appear in the bundle, and why they are not requests. */
const ALLOWED_URLS = [
  [/^http:\/\/www\.w3\.org\//, 'XML namespaces (SVG icons) — never fetched'],
  [/^https:\/\/react\.dev\/errors\//, "React's production error text"],
  [/^https:\/\/capacitorjs\.com\//, "a Capacitor console warning's text"],
  [/^https:\/\/tailwindcss\.com/, "Tailwind's banner comment in the CSS"],
  [/^https:\/\/bit\.ly\/wb-precache/, "a Workbox console warning's text"],
  [/^https:\/\/cdn\.jsdelivr\.net\/npm\/(tesseract\.js|tesseract\.js-core|@tesseract\.js-data)\b/,
    "tesseract.js's default download paths; src/ocr.ts passes local ones (ocr/) — the OCR step below proves none is used"],
  [/^https:\/\/apps\.apple\.com\/app\/id\d+\?action=write-review$/,
    'Optionen › Spartopf bewerten (src/links.ts): handed to the App Store when tapped, never fetched'],
  [/^https:\/\/habboubah\.github\.io\/privacy-policy\/spartopf\/(de\/)?$/,
    'Optionen › Datenschutz (src/links.ts): opened in Safari when tapped, never fetched'],
];

const failures = [];
const fail = msg => { failures.push(msg); console.error(`  ✗ ${msg}`); };
const ok = msg => console.log(`  ✓ ${msg}`);

if (!process.argv.includes('--no-build')) {
  console.log('Building…');
  await build({ root, logLevel: 'error' });
}

// ---- 2. What the bundle mentions -------------------------------------------
console.log('Bundle URLs');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
const unknown = new Map();
for (const file of walk(dist)) {
  if (!/\.(js|mjs|html|css|json|webmanifest|svg)$/.test(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const [url] of text.matchAll(/https?:\/\/[^\s"'`)<>\\]+/g)) {
    if (ALLOWED_URLS.some(([re]) => re.test(url))) continue;
    unknown.set(url, path.relative(root, file));
  }
}
if (unknown.size) for (const [url, file] of unknown) fail(`unknown URL in the bundle: ${url} (${file})`);
else ok('every URL in dist/ is on the allowlist');

// ---- 1. What the app requests ------------------------------------------------
const server = await preview({ root, logLevel: 'error', preview: { port: PORT, strictPort: true, host: '127.0.0.1' } });
const browser = await chromium.launch();
const offenders = new Set();
try {
  const ctx = await browser.newContext({
    viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    locale: 'de-DE', serviceWorkers: 'block', acceptDownloads: true,
  });
  await ctx.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(origin) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    offenders.add(url);
    return route.abort();
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => fail(`page error: ${e.message}`));
  const step = async (name, fn) => {
    try { await fn(); ok(name); } catch (e) { fail(`${name}: ${e.message.split('\n')[0]}`); }
  };
  const tab = async i => { await page.locator('nav button:not(.hero)').nth(i).click(); await page.waitForTimeout(400); };

  console.log('Requests while using the app');
  await step('first run', async () => {
    await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
    await page.locator('main section input[inputmode="decimal"]').first().fill('1234,56');
    await page.locator('main section form button[type="submit"]').first().click();
    await page.waitForTimeout(300);
  });
  await step('an entry added and ticked off', async () => {
    await page.locator('nav button.hero').click();
    await page.waitForSelector('[role="dialog"]');
    // Fill the field itself: the sheet focuses it a frame after it appears, and typing earlier would go nowhere.
    await page.locator('[role="dialog"] input[inputmode="decimal"]').first().fill('12,34');
    await page.locator('[role="dialog"] button[type="submit"]').first().click();
    await page.waitForTimeout(400);
    await page.locator('[data-entry-row] [role="checkbox"]').first().click();
    await page.waitForTimeout(300);
  });
  await step('every tab', async () => { for (const i of [1, 2, 3, 0]) await tab(i); });
  await step('a bank CSV imported', async () => {
    const header = '"Auftragskonto";"Buchungstag";"Valutadatum";"Buchungstext";"Verwendungszweck";"Glaeubiger ID";"Mandatsreferenz";"Kundenreferenz (End-to-End)";"Sammlerreferenz";"Lastschrift Ursprungsbetrag";"Auslagenersatz Ruecklastschrift";"Beguenstigter/Zahlungspflichtiger";"Kontonummer/IBAN";"BIC (SWIFT-Code)";"Betrag";"Waehrung";"Info";"Kategorie"';
    const d = new Date();
    const day = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(2)}`;
    const row = `"DE00123";"${day}";"${day}";"KARTENZAHLUNG";"Einkauf";"";"";"";"";"";"";"Testmarkt";"";"";"-23,45";"EUR";"Umsatz gebucht";""`;
    await page.locator('input[accept*="csv"]').setInputFiles({ name: 'umsaetze.csv', mimeType: 'text/csv', buffer: Buffer.from(`${header}\n${row}\n`, 'utf8') });
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await page.locator('[role="dialog"] button[type="submit"], [role="dialog"] button.hero').last().click();
    await page.waitForTimeout(500);
  });
  await step('a screenshot read on the device (OCR)', async () => {
    // A picture of a transaction line, drawn here — never a real one.
    const png = await page.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 1200; c.height = 300;
      const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = '#000'; g.font = '48px sans-serif';
      g.fillText('Testmarkt    -23,45 €', 40, 120);
      g.fillText('Bäckerei      -4,10 €', 40, 220);
      return c.toDataURL('image/png').split(',')[1];
    });
    await page.locator('input[accept="image/*"]').setInputFiles({ name: 'screenshot.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
    // Reading takes a while in headless Chromium. Wait for the sheet's "reading…" panel to come and go:
    // the review sheet or a "nothing found" toast follows. (Any status counted before — and the CSV step's
    // toast is one — let the sheet be closed mid-read, and its review then opened over the next step.)
    await page.waitForSelector('[role="dialog"] [role="status"]', { timeout: 10000 });
    await page.waitForFunction(() => !document.querySelector('[role="dialog"] [role="status"]'), null, { timeout: 120000 });
    await page.waitForTimeout(500);
    // Close the review sheet without importing, and wait until it has gone.
    // Headless OCR is flaky: retry Escape / the ✕ until no dialog is left, so
    // a lingering sheet can't block the next step.
    for (let i = 0; i < 10 && await page.locator('[role="dialog"]').count(); i++) {
      await page.keyboard.press('Escape').catch(() => {});
      const close = page.locator('[role="dialog"] button[aria-label]').first();
      if (await close.count()) await close.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(300);
    }
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), null, { timeout: 10000 });
  });
  await step('a backup exported', async () => {
    // Guard against a lingering sheet from the flaky headless-OCR step: start
    // from a clean slate so nothing can intercept the taps below.
    if (await page.locator('[role="dialog"]').count()) {
      await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
    }
    await tab(3);
    await page.locator('main button', { hasText: 'Sichern und übertragen' }).click();
    await page.waitForTimeout(400);
    // Opens the export sheet (plan 04); export without a password so no key
    // derivation or password entry is needed in the check. The row is the
    // first "Sicherung exportieren" button on the screen.
    const exportRow = page.locator('main button', { hasText: 'Sicherung exportieren' }).first();
    await exportRow.scrollIntoViewIfNeeded();
    await exportRow.click();
    await page.waitForSelector('[role="dialog"]');
    await page.locator('[role="dialog"] [role="switch"][aria-label="Ohne Passwort exportieren"]').click();
    const download = page.waitForEvent('download', { timeout: 15000 });
    await page.locator('[role="dialog"] button[type="submit"]').click();
    await download;
  });
  await ctx.close();
} finally {
  await browser.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}

if (offenders.size) for (const url of offenders) fail(`request to another origin: ${url}`);
else ok('no request left the app’s own origin');

if (failures.length) {
  console.error(`\nPrivacy check failed (${failures.length}).`);
  process.exit(1);
}
console.log('\nPrivacy check passed.');
