#!/usr/bin/env node
// Step 1 of the app preview: films the app. Builds it, opens it at the
// video's own size, fills it (the storyboard's `prepare`) and then plays the
// storyboard's chapters by actually using the app — tapping, typing — while
// Chromium hands over every frame it draws. What comes out is footage, not a
// video: per language the frames of each chapter and footage.json, which says
// when each frame was drawn, where every tap landed and where the parts are
// that a chapter lights up. scripts/compose.mjs makes the video from it.
//
//   node .claude/skills/app-preview-video/scripts/film.mjs [--lang de]
//
// Nothing here is drawn or edited: every frame is the running app. Captions,
// the light on a part of the screen and the end card are added by compose.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { preview } from 'vite';
import { root, buildDir, rel, die, loadStoryboard, langsArg, launch, wait, round, jpegSize, shooter } from './lib/common.mjs';

const now = () => Date.now() / 1000;

/**
 * The camera: Chromium's screencast, which delivers a frame whenever the
 * screen changes (up to 60 a second), each with the time it was drawn. While
 * a chapter is open its frames are written to that chapter's folder.
 */
class Camera {
  constructor(page, cdp, dir, size) {
    Object.assign(this, { cdp, dir, size, mode: 'screencast', scene: null, lastAt: 0, pending: [], polling: false });
    /** A still of the screen as it stands, at the video's size. */
    this.still = shooter(page, cdp, size, 'jpeg');
  }

  async start() {
    this.cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
      this.cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
      if (this.mode === 'screencast') this.frame(Buffer.from(data, 'base64'), metadata.timestamp);
    });
    await this.cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: this.size.width, maxHeight: this.size.height, everyNthFrame: 1 });
  }

  /**
   * The screencast is only as large as the real screen: with
   * --force-device-scale-factor it is the video's size. Where a Chromium
   * ignores that flag the frames come out at half size — then the camera
   * takes screenshots in a loop instead (right size, fewer frames a second).
   */
  async check(page) {
    this.probe = null;
    // Something has to change on the screen for a frame to be delivered.
    await page.evaluate(() => new Promise(done => {
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;background:#000;opacity:.02;z-index:2147483647;pointer-events:none';
      document.body.appendChild(d);
      requestAnimationFrame(() => requestAnimationFrame(() => { d.remove(); requestAnimationFrame(() => done()); }));
    }));
    await wait(350);
    const got = this.probe ? jpegSize(this.probe) : null;
    const forced = process.env.APP_PREVIEW_CAMERA === 'screenshots';
    if (!forced && got && got.width === this.size.width && got.height === this.size.height) return;
    console.log(forced
      ? '  APP_PREVIEW_CAMERA=screenshots: filming with screenshots (fewer frames a second).'
      : `  ! the screencast delivers ${got ? `${got.width} × ${got.height}` : 'no frames'}, not ${this.size.width} × ${this.size.height}: filming with screenshots instead (fewer frames a second).`);
    await this.cdp.send('Page.stopScreencast').catch(() => {});
    this.mode = 'screenshots';
    this.polling = true;
    (async () => {
      while (this.polling) {
        const before = now();
        try {
          const buf = await this.still();
          // Like the screencast: a frame only when the screen has changed.
          if (!this.probe || !buf.equals(this.probe)) this.frame(buf, (before + now()) / 2);
        } catch { break; }
      }
    })();
  }

  frame(buf, ts) {
    this.lastAt = Date.now();
    this.probe = buf;
    // A frame drawn before the chapter opened belongs to what came before it.
    if (!this.scene || ts <= this.scene.t0) return;
    this.write(buf, ts - this.scene.t0);
  }

  write(buf, t) {
    const s = this.scene;
    const file = `${s.id}/${String(s.frames.length).padStart(5, '0')}.jpg`;
    s.frames.push({ t: round(t, 4), file });
    this.pending.push(fs.promises.writeFile(path.join(this.dir, file), buf));
  }

  /** Wait until the screen has stopped changing (an animation has run out). */
  async settle(quiet = 0.3, max = 2.5) {
    const end = Date.now() + max * 1000;
    while (Date.now() < end && Date.now() - this.lastAt < quiet * 1000) await wait(40);
  }

  /** Open a chapter. Its first frame is the screen as it stands, taken here. */
  async begin(id, theme) {
    fs.mkdirSync(path.join(this.dir, id), { recursive: true });
    const first = await this.still();
    this.scene = { id, theme, t0: now(), frames: [], events: [] };
    this.write(first, 0);
  }

  end() {
    const s = this.scene;
    this.scene = null;
    return { id: s.id, theme: s.theme, seconds: round(now() - s.t0), frames: s.frames, events: s.events };
  }

  local() { return this.scene ? now() - this.scene.t0 : null; }
  log(event) { if (this.scene) this.scene.events.push(event); }

  async stop() {
    this.polling = false;
    await this.cdp.send('Page.stopScreencast').catch(() => {});
    await Promise.all(this.pending);
  }
}

/**
 * The actor: what a chapter's `run` gets as `a`. Its verbs use the app the
 * way a finger does and note, for compose, what the video should show of it
 * — where the tap landed, which part to light up, where to move in.
 *
 * A target is a mark's name (config/storyboard.mjs › marks), a selector, or a
 * Playwright locator.
 */
class Actor {
  constructor({ page, cdp, camera, marks, viewport, safeArea }) {
    Object.assign(this, { page, cdp, camera, marks, viewport, safeArea });
  }

  loc(target) {
    if (typeof target !== 'string') return target;
    return this.page.locator(this.marks[target] ?? target).first();
  }

  /** Let the film run: nothing is tapped for this long. */
  pause(seconds) { return wait(seconds * 1000); }

  /** Wait (without a fixed length) until something is on the screen. */
  async see(target, timeout = 8) {
    await this.loc(target).waitFor({ state: 'visible', timeout: timeout * 1000 });
  }

  /** Where a target is: its box in fractions of the screen, and its corner. */
  async measure(target) {
    const loc = this.loc(target);
    await loc.waitFor({ state: 'visible', timeout: 8000 });
    return loc.evaluate((node, { vw, vh }) => {
      const r = node.getBoundingClientRect();
      // The corner is the element's own, or that of the first thing in it (a
      // card drawn by its rows).
      let radius = 0;
      for (let n = node, depth = 0; n && depth < 3 && !radius; n = n.firstElementChild, depth += 1) {
        radius = parseFloat(getComputedStyle(n).borderTopLeftRadius) || 0;
      }
      radius = Math.min(radius, r.width / 2, r.height / 2);
      const f = v => Math.round(v * 1e5) / 1e5;
      return { x: f(r.left / vw), y: f(r.top / vh), w: f(r.width / vw), h: f(r.height / vh), radius: f(radius / vw) };
    }, { vw: this.viewport.width, vh: this.viewport.height });
  }

  /** A box that is to be shown has to be on the screen. */
  async shown(target, what) {
    const b = await this.measure(target);
    if (b.w <= 0 || b.h <= 0 || b.x + b.w < 0.02 || b.y + b.h < 0.02 || b.x > 0.98 || b.y > 0.98) {
      throw new Error(`${what} "${target}" is not on the screen — scroll to it first (a.scrollTo).`);
    }
    return b;
  }

  /**
   * Scroll like a thumb: eased, so the film shows where the page goes.
   * `block` is where the target ends up: 'center', 'start' (under the status
   * bar) or 'end'.
   */
  async scrollTo(target, { seconds = 0.6, block = 'center' } = {}) {
    const box = await this.loc(target).boundingBox();
    if (!box) throw new Error(`scrollTo: "${target}" is not on the page.`);
    const { height } = this.viewport;
    const top = this.safeArea.top + 12, bottom = height - this.safeArea.bottom - 12;
    const dy = block === 'start' ? box.y - top
      : block === 'end' ? box.y + box.height - bottom
        : box.y + box.height / 2 - (top + bottom) / 2;
    await this.scrollBy(dy, seconds);
  }

  async scrollBy(dy, seconds = 0.6) {
    await this.page.evaluate(({ dy, ms }) => new Promise(done => {
      const from = window.scrollY;
      const to = Math.max(0, Math.min(from + dy, document.documentElement.scrollHeight - window.innerHeight));
      if (Math.abs(to - from) < 1) { done(); return; }
      const ease = p => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
      const t0 = performance.now();
      const step = t => {
        const p = Math.min(1, (t - t0) / ms);
        window.scrollTo(0, from + (to - from) * ease(p));
        if (p < 1) requestAnimationFrame(step); else done();
      };
      requestAnimationFrame(step);
    }), { dy, ms: seconds * 1000 });
  }

  /**
   * A tap. The video shows a touch dot where it lands, `lead` seconds before
   * the finger comes down, so the eye is there first. A target outside the
   * screen is scrolled to first. `at` is the spot in the target ([0.5, 0.5]
   * is its centre).
   */
  async tap(target, { at = [0.5, 0.5], lead = 0.24, hold = 0.08, dot = true } = {}) {
    const loc = this.loc(target);
    try {
      await loc.waitFor({ state: 'visible', timeout: 8000 });
    } catch {
      throw new Error(`tap: "${target}" is not on the screen.`);
    }
    let box = await loc.boundingBox();
    const { width, height } = this.viewport;
    const middle = box.y + box.height / 2;
    if (middle < this.safeArea.top + 8 || middle > height - this.safeArea.bottom - 8) {
      await this.scrollTo(loc);
      await this.pause(0.15);
      box = await loc.boundingBox();
    }
    const x = box.x + box.width * at[0], y = box.y + box.height * at[1];
    if (dot && this.camera.scene) this.camera.log({ type: 'tap', t: round(this.camera.local() + lead), x: round(x / width, 5), y: round(y / height, 5) });
    await wait(lead * 1000);
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: Math.round(x), y: Math.round(y) }] });
    await wait(hold * 1000);
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }

  /** Tap a field and type into it, letter by letter. */
  async type(target, text, { perLetter = 0.085 } = {}) {
    await this.tap(target);
    await this.pause(0.3);
    await this.page.keyboard.type(text, { delay: perLetter * 1000 });
  }

  /** Put the keyboard away (take the focus off the field). */
  async blur() { await this.page.evaluate(() => document.activeElement?.blur()); }

  /**
   * Light up one or more parts of the screen: everything else is dimmed for
   * as long as `during` lasts — a number of seconds, or a function (then the
   * light stays on while its taps run). `pad` grows the lit box, in screen
   * widths.
   */
  async spotlight(targets, during = 1.2, { pad = 0.012 } = {}) {
    const boxes = [];
    for (const t of [].concat(targets)) {
      const b = await this.shown(t, 'spotlight:');
      boxes.push({ x: round(b.x - pad, 5), y: round(b.y - pad * this.viewport.width / this.viewport.height, 5), w: round(b.w + 2 * pad, 5), h: round(b.h + 2 * pad * this.viewport.width / this.viewport.height, 5), radius: round(b.radius ? b.radius + pad : 0, 5) });
    }
    await this.span({ type: 'light', boxes }, during);
  }

  /**
   * Move in on a part of the screen: the picture grows to `scale` around it
   * and comes back afterwards. Keep it small (1.1–1.25): Apple asks for the
   * app at its own resolution, and a picture blown up further goes soft.
   */
  async zoom(target, scale = 1.15, during = 1.2) {
    const box = await this.shown(target, 'zoom:');
    await this.span({ type: 'zoom', box, scale }, during);
  }

  async span(event, during) {
    const t0 = round(this.camera.local() ?? 0);
    if (typeof during === 'function') await during(); else await this.pause(during);
    this.camera.log({ ...event, t0, t1: round(this.camera.local() ?? 0) });
  }

  /** This moment is the poster frame: the still the App Store shows before the video plays. */
  poster() { if (this.camera.scene) this.camera.log({ type: 'poster', t: round(this.camera.local()) }); }
}

/** How smooth the footage is: the time between frames while something moves. */
function smoothness(chapters) {
  const gaps = chapters.flatMap(c => c.frames.slice(1).map((f, i) => (f.t - c.frames[i].t) * 1000)).filter(g => g < 120).sort((a, b) => a - b);
  if (!gaps.length) return null;
  const at = p => gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * p))];
  return { frames: chapters.reduce((n, c) => n + c.frames.length, 0), medianMs: round(at(0.5), 1), p95Ms: round(at(0.95), 1), fps: Math.round(1000 / at(0.5)) };
}

export async function film({ langs } = {}) {
  const sb = await loadStoryboard();
  const { video } = sb;
  langs = langs ?? langsArg(sb.locales);
  const viewport = { width: video.width / video.scale, height: video.height / video.scale };
  if (!Number.isInteger(viewport.width) || !Number.isInteger(viewport.height)) die(`The video's size (${video.width} × ${video.height}) has to divide by its scale (${video.scale}).`);

  console.log('Building …');
  execSync('npx vite build', { cwd: root, stdio: 'ignore' });
  const src = await sb.loadSource();
  let server;
  try {
    server = await preview({ root, logLevel: 'silent', preview: { port: sb.server.port, strictPort: true, host: '127.0.0.1' } });
  } catch (e) {
    die(`The built app could not be served on port ${sb.server.port}: ${String(e.message).split('\n')[0]}\n  A screenshot run or another film may be going in this folder — wait for it.`);
  }
  // The real screen has to be as dense as the emulated one: the screencast is
  // taken from it.
  const browser = await launch([`--force-device-scale-factor=${video.scale}`]);
  let failed = false;
  try {
    for (const lang of langs) {
      const w = sb.words(src, lang);
      const dir = path.join(buildDir, lang);
      fs.rmSync(dir, { recursive: true, force: true });
      fs.mkdirSync(dir, { recursive: true });
      const ctx = await browser.newContext({
        viewport, deviceScaleFactor: video.scale, locale: sb.browserLocale?.[lang] ?? lang,
        colorScheme: 'light', reducedMotion: 'no-preference', hasTouch: true, isMobile: true,
      });
      // The app as a phone shows it: its settings as stored, and the room the
      // status bar and the home indicator take (the app reads these variables
      // before env(), which a desktop browser answers with 0).
      await ctx.addInitScript(({ prefs, safe }) => {
        try { for (const [k, v] of Object.entries(prefs)) if (localStorage.getItem(k) === null) localStorage.setItem(k, v); } catch { /* about:blank */ }
        const set = () => {
          const s = document.documentElement?.style;
          if (!s) return;
          s.setProperty('--safe-area-inset-top', `${safe.top}px`);
          s.setProperty('--safe-area-inset-bottom', `${safe.bottom}px`);
        };
        set();
        document.addEventListener('DOMContentLoaded', set);
      }, { prefs: sb.prefs(lang), safe: video.safeArea });
      const page = await ctx.newPage();
      page.on('pageerror', e => console.error(`[${lang}] page error:`, e.message));
      const cdp = await ctx.newCDPSession(page);
      const camera = new Camera(page, cdp, dir, { width: video.width, height: video.height });
      const a = new Actor({ page, cdp, camera, marks: sb.marks(w), viewport, safeArea: video.safeArea });

      console.log(`Filming ${lang} …`);
      const chapters = [];
      let at = 'prepare';
      try {
        await sb.prepare(page, w);
        await camera.start();
        await camera.check(page);
        for (const ch of sb.chapters) {
          if (ch.card) continue;
          at = `chapter "${ch.id}" (setup)`;
          if (ch.setup) await ch.setup(a, w);
          await camera.settle();
          at = `chapter "${ch.id}"`;
          await camera.begin(ch.id, await page.evaluate(() => document.documentElement.dataset.theme || 'light'));
          await ch.run(a, w);
          await camera.settle(0.25, 1.2);
          const done = camera.end();
          chapters.push(done);
          console.log(`  ${ch.id.padEnd(10)} ${done.seconds.toFixed(1).padStart(5)} s  ${String(done.frames.length).padStart(4)} frames`);
        }
      } catch (e) {
        failed = true;
        const shot = path.join(buildDir, `fail-${lang}.png`);
        await page.screenshot({ path: shot }).catch(() => {});
        console.error(`\n✗ ${lang}, ${at}: ${String(e.message).split('\n')[0]}\n  The screen at that moment: ${rel(shot)}`);
        const snap = await page.locator('body').ariaSnapshot().catch(() => '');
        if (snap) console.error('  What is on it:\n' + snap.split('\n').slice(0, 40).map(l => '    ' + l).join('\n'));
      }
      await camera.stop();
      await ctx.close();
      if (failed) break;

      const smooth = smoothness(chapters);
      fs.writeFileSync(path.join(dir, 'footage.json'), `${JSON.stringify({
        lang, filmed: new Date().toISOString(), video: { width: video.width, height: video.height, scale: video.scale },
        camera: { mode: camera.mode, ...smooth }, chapters,
      })}\n`);
      console.log(`  ${smooth.frames} frames by ${camera.mode}, ${smooth.fps} a second while something moves (the slowest 5 %: ${smooth.p95Ms} ms apart)`);
      if (camera.mode !== 'screencast' || smooth.p95Ms > 50) {
        console.log('  ! this machine films it choppily. Good enough to look at a proof; film the upload on the Mac, with nothing else running.');
      }
    }
  } finally {
    await browser.close();
    await new Promise(r => server.httpServer.close(() => r()));
  }
  if (failed) process.exit(1);
  console.log(`Footage → ${rel(buildDir)}/<${langs.join('|')}>/`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await film();
