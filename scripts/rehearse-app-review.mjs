// Rehearses the App Review screen recording against the web app, before the
// iPhone plays it: every step of ios/AppReviewRecorder/scenes.json, found the
// same way the iPhone UI test finds it (by accessibility label: exact, then
// "starts with", then "contains"). A label that changed in the app fails
// here in a minute instead of halfway through the recording.
//
//   npm run rehearse:app-review              all scenes, from an empty app
//   npm run rehearse:app-review -- 5 8       scenes 5 to 8 (5 > 1 continues from the last run)
//   SNAP=1 npm run rehearse:app-review       also print what is on screen at the end
//
// It starts a Vite dev server (the native-only settings show there with
// spartopf-dev-native). Native steps — Control Center, the home screen, Face
// ID, system alerts — are skipped; file pickers get the files in
// ios/AppReviewRecorder/demo-files. A tap with "saveDownloadAs" keeps what it
// downloads there under that name (for a scene that imports it again later).
// After every step the page must still scroll once no sheet is open.
// Screenshots of each scene end up in build/rehearsal/.
import { createRequire } from 'node:module';
import { readFileSync, rmSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.REHEARSAL_PLAYWRIGHT ?? 'playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const recorder = join(root, 'ios/AppReviewRecorder');
const spec = JSON.parse(readFileSync(join(recorder, 'scenes.json'), 'utf8'));
const filesDir = join(recorder, 'demo-files');
const [fromArg, toArg] = process.argv.slice(2);
const from = Number(fromArg ?? 1), to = Number(toArg ?? spec.scenes.length);
const out = join(root, 'build/rehearsal');
const profile = join(root, 'build/rehearsal-profile');
mkdirSync(out, { recursive: true });
if (from === 1) rmSync(profile, { recursive: true, force: true });

const server = await createServer({ root, logLevel: 'silent', server: { host: '127.0.0.1', port: 3102, strictPort: false } });
await server.listen();
const url = server.resolvedUrls.local[0];

const ctx = await chromium.launchPersistentContext(profile, {
  viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true,
  locale: spec.rehearsal?.locale ?? 'de-DE', timezoneId: 'Europe/Berlin', acceptDownloads: true,
});
const page = ctx.pages()[0] ?? await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
page.on('dialog', d => d.accept());
for (const [k, v] of Object.entries(spec.rehearsal?.localStorage ?? {})) {
  await page.addInitScript(([k, v]) => { try { if (localStorage.getItem(k) == null) localStorage.setItem(k, v); } catch { /* private mode */ } }, [k, v]);
}
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const ROLES = ['button', 'link', 'textbox', 'searchbox', 'checkbox', 'switch', 'tab', 'menuitem',
  'menuitemradio', 'menuitemcheckbox', 'option', 'radio', 'combobox', 'spinbutton', 'slider'];
const FIELDS = ['textbox', 'searchbox'];
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Like iOS with aria-modal: while a sheet is open only it, and a menu opened
// from it, can be reached.
async function scopes() {
  const list = [];
  const menu = page.locator('[role="menu"]:visible');
  if (await menu.count()) list.push(menu.last());
  const dialog = page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible');
  list.push(await dialog.count() ? dialog.last() : page);
  return list;
}

async function find(labels, nth = 0, timeout = 8000, roles = ROLES) {
  const end = Date.now() + timeout;
  do {
    for (const label of [].concat(labels)) {
      for (const mode of ['exact', 'prefix', 'contains']) {
        const name = mode === 'exact' ? label : new RegExp(mode === 'prefix' ? `^${esc(label)}` : esc(label));
        for (const scope of await scopes()) {
          let loc = null;
          for (const r of roles) {
            const l = scope.getByRole(r, { name, exact: mode === 'exact' });
            loc = loc ? loc.or(l) : l;
          }
          const vis = loc.filter({ visible: true });
          if (await vis.count() > nth) return vis.nth(nth);
          // <summary> has no role in Chromium; on the iPhone it is a button.
          const sum = scope.locator('summary').filter({ hasText: name }).filter({ visible: true });
          if (roles === ROLES && mode !== 'exact' && await sum.count() > nth) return sum.nth(nth);
        }
      }
    }
    await page.waitForTimeout(250);
  } while (Date.now() < end);
  return null;
}

async function must(labels, nth, timeout, roles) {
  const el = await find(labels, nth, timeout, roles);
  if (!el) throw new Error(`not found: ${JSON.stringify(labels)}${nth ? ` #${nth}` : ''}`);
  return el;
}

const rolesFor = role => role === 'textbox' ? FIELDS : role === 'switch' ? ['switch', 'checkbox'] : role ? [role] : ROLES;

// Chromium's emulated touches don't reach the row's pointer handlers, so a
// swipe is played as touch pointer events, across the screen at the row's
// height like the iPhone runner (85 % → 10 % of the width).
async function swipe(el, dir) {
  await el.evaluate(async (node, dir) => {
    const b = node.getBoundingClientRect();
    const y = b.top + b.height / 2, w = window.innerWidth;
    const [x0, x1] = dir === 'left' ? [w * 0.85, w * 0.1] : [w * 0.15, w * 0.9];
    const ev = (type, x, target) => target.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, composed: true, pointerId: 7, pointerType: 'touch', isPrimary: true,
      clientX: x, clientY: y, buttons: type === 'pointerup' ? 0 : 1,
    }));
    // Like a touch on the iPhone, every event goes to what was touched first
    // (it bubbles on to the document for handlers listening there).
    const start = document.elementFromPoint(x0, y) ?? document;
    ev('pointerdown', x0, start);
    for (let i = 1; i <= 12; i++) { await new Promise(r => setTimeout(r, 16)); ev('pointermove', x0 + (x1 - x0) * i / 12, start); }
    ev('pointerup', x1, start);
  }, dir);
}

async function drag(el, target, hold) {
  const a = await el.boundingBox(), b = await target.boundingBox();
  const p0 = { x: a.x + a.width / 2, y: a.y + a.height / 2 }, p1 = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p0] });
  await page.waitForTimeout(hold * 1000);
  for (let i = 1; i <= 20; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p0.x + (p1.x - p0.x) * i / 20, y: p0.y + (p1.y - p0.y) * i / 20 }] });
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(300);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

const dayInMonth = day => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

async function typeInto(el, text) {
  await el.scrollIntoViewIfNeeded();
  await el.tap();
  await el.fill('');
  await page.keyboard.type(text, { delay: 15 });
}

// Steps that happen outside the app: the iPhone runner does them, the rehearsal skips them.
const NATIVE = ['systemTap', 'startRecording', 'stopRecording', 'systemAlert', 'faceID', 'home', 'appSwitcher', 'note', 'launch'];

async function run(step) {
  if (step.optional) {
    try { await run({ ...step.optional[0], timeout: step.optional[0].timeout ?? 2 }); }
    catch (e) { console.log(`  ~ optional steps skipped: ${e.message.split('\n')[0]}`); return; }
    for (const s of step.optional.slice(1)) await run(s);
    return;
  }
  if ('pause' in step) return page.waitForTimeout(Math.min(step.pause, 1) * 1000);
  if (step.terminate) return page.reload({ waitUntil: 'networkidle' });
  if (NATIVE.some(k => k in step)) return;
  if ('tap' in step) {
    const el = await must(step.tap, step.nth, (step.timeout ?? 8) * 1000, rolesFor(step.role));
    await el.scrollIntoViewIfNeeded();
    if (step.pickFile) {
      const chooser = page.waitForEvent('filechooser', { timeout: 8000 });
      await el.tap();
      await (await chooser).setFiles(join(filesDir, step.pickFile));
    } else if (step.saveDownloadAs) {
      // Kept in build/ until the dev server is closed: a file changing under
      // Vite's watcher during the run can reload the page.
      const dl = page.waitForEvent('download', { timeout: 15000 });
      await el.tap();
      await (await dl).saveAs(join(out, step.saveDownloadAs));
      downloads.push(step.saveDownloadAs);
    } else {
      await el.tap();
    }
    return page.waitForTimeout(350);
  }
  if ('fill' in step) { await typeInto(await must(step.fill, step.nth, 8000, FIELDS), step.text); return page.waitForTimeout(200); }
  if ('amount' in step) {
    if (step.into) await typeInto(await must(step.into, step.nth, 8000, FIELDS), step.amount);
    else await page.keyboard.type(step.amount, { delay: 15 });
    return page.waitForTimeout(200);
  }
  if ('type' in step) { await page.keyboard.type(step.type, { delay: 15 }); return page.waitForTimeout(200); }
  if ('placeholderMinus' in step) {
    const el = await must(step.into, step.nth, 8000, FIELDS);
    const figure = Number((await el.getAttribute('placeholder')).replace(/[^0-9.,-]/g, '').replace(',', '.'));
    await typeInto(el, (figure - step.placeholderMinus).toFixed(2));
    return page.waitForTimeout(200);
  }
  if ('key' in step) { await page.keyboard.press(step.key); return page.waitForTimeout(200); }
  if ('see' in step) {
    const end = Date.now() + (step.timeout ?? 10) * 1000;
    do {
      if (await find(step.see, 0, 0)) return;
      for (const label of [].concat(step.see)) {
        const scope = (await scopes()).at(-1);
        if (await scope.getByText(new RegExp(esc(label))).filter({ visible: true }).count()) return;
      }
      await page.waitForTimeout(250);
    } while (Date.now() < end);
    throw new Error(`not seen: ${JSON.stringify(step.see)}`);
  }
  if ('scrollTo' in step) { (await must(step.scrollTo, step.nth, 4000, rolesFor(step.role))).scrollIntoViewIfNeeded(); return; }
  if ('swipe' in step) {
    const el = await must(step.on, step.nth);
    await el.scrollIntoViewIfNeeded();
    await swipe(el, step.swipe);
    return page.waitForTimeout(500);
  }
  if ('drag' in step) {
    await drag(await must(step.drag, step.nth), await must(step.to, step.toNth), step.hold ?? 0.8);
    return page.waitForTimeout(500);
  }
  if ('select' in step) {
    let box = null;
    for (const l of [].concat(step.in)) {
      const c = (await scopes()).at(-1).getByRole('combobox', { name: l, exact: true }).filter({ visible: true });
      if (await c.count() > (step.nth ?? 0)) { box = c.nth(step.nth ?? 0); break; }
    }
    if (!box) throw new Error(`no select named ${JSON.stringify(step.in)}`);
    await box.scrollIntoViewIfNeeded();
    await box.selectOption({ label: step.select });
    return page.waitForTimeout(400);
  }
  if ('pickDay' in step) {
    // The date field named by "on" (as on the iPhone), else the first one.
    let field = page.locator('input[type="date"]:visible').first();
    for (const l of [].concat(step.on ?? [])) {
      const named = (await scopes()).at(-1).getByRole('textbox', { name: new RegExp(`^${esc(l)}`) }).and(page.locator('input[type="date"]')).filter({ visible: true });
      if (await named.count()) { field = named.first(); break; }
    }
    await field.fill(dayInMonth(step.pickDay));
    return page.waitForTimeout(200);
  }
  if ('pickYearAhead' in step) {
    // <input type=month>: the iPhone turns the year wheel; here the same month n years on.
    const d = new Date();
    await page.locator('input[type="month"]:visible').first().fill(`${d.getFullYear() + step.pickYearAhead}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    return page.waitForTimeout(200);
  }
  if ('scroll' in step) { await page.mouse.wheel(0, step.scroll === 'up' ? -600 : 600); return page.waitForTimeout(300); }
  throw new Error(`unknown step ${JSON.stringify(step)}`);
}

// A sheet or menu that closed must give the page its scroll back. The iPhone
// scrolls with a finger and can't reach a row below the fold of a locked page;
// Chromium's scrollIntoView still can, so without this check the rehearsal
// passed where the iPhone stopped ("can't reach … on screen").
const OPEN = '[role="dialog"]:visible, [role="alertdialog"]:visible, [role="menu"]:visible';
async function scrollLocked() {
  for (let i = 0; i < 3; i++) {
    if (await page.locator(OPEN).count()) return false;
    if (!(await page.evaluate(() => getComputedStyle(document.body).overflowY === 'hidden'))) return false;
    await page.waitForTimeout(400); // a sheet on its way out
  }
  return true;
}

let failed = false;
const started = Date.now();
const downloads = [];
for (let s = from; s <= to; s++) {
  const scene = spec.scenes[s - 1];
  console.log(`Scene ${s}: ${scene.name}`);
  for (const [i, step] of scene.steps.entries()) {
    try {
      await run(step);
      if (await scrollLocked()) throw new Error('the page no longer scrolls: its scroll lock stayed on after a sheet or menu closed (src/ui/useDialog.ts)');
    } catch (e) {
      if (step.soft) { console.log(`  ~ step ${i + 1} skipped (soft): ${e.message.split('\n')[0]}`); continue; }
      console.log(`  ✗ step ${i + 1} ${JSON.stringify(step)}\n    ${e.message.split('\n')[0]}`);
      await page.screenshot({ path: join(out, `fail-scene${s}-step${i + 1}.png`) });
      const open = page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible, [role="menu"]:visible').last();
      const snap = await (await open.count() ? open : page.locator('body')).ariaSnapshot();
      writeFileSync(join(out, 'fail-snapshot.txt'), snap);
      console.log('    What is on screen (build/rehearsal/fail-snapshot.txt):\n' + snap.split('\n').slice(0, 60).map(l => '    ' + l).join('\n'));
      failed = true;
      break;
    }
  }
  if (failed) break;
  await page.screenshot({ path: join(out, `scene${String(s).padStart(2, '0')}.png`) });
  console.log(`  ✓ ${scene.steps.length} steps`);
}
if (process.env.SNAP && !failed) {
  const open = page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible, [role="menu"]:visible').last();
  console.log(await (process.env.SNAP === 'body' || !(await open.count()) ? page.locator('body') : open).ariaSnapshot());
}
await ctx.close();
await server.close();
for (const name of failed ? [] : downloads) {
  copyFileSync(join(out, name), join(filesDir, name));
  console.log(`Saved demo-files/${name} – AirDrop it to the iPhone again.`);
}
console.log(failed ? '\nRehearsal failed – fix scenes.json (or the app) before recording.' : `\nRehearsal passed in ${Math.round((Date.now() - started) / 1000)} s.`);
process.exit(failed ? 1 : 0);
