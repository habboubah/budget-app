// The stage's two entry points, called by scripts/compose.mjs:
//   stage.init(plan)   dress the stage (theme, captions, end card), load the type
//   stage.render(n)    draw frame n — a pure function of n and the plan
//
// The plan (built in compose.mjs › makePlan) is the whole video as data: the
// clips (which piece of footage plays when, or stands still under a caption),
// the captions, the lights, the zooms, the taps and the end card, all in
// seconds of the finished video. Every length on the stage is in the app's
// points; the canvas holds the footage at its full pixels.
(() => {
  const $ = s => document.querySelector(s);
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  // Short and soft, like the app's own motion (--ease-out-soft), and one
  // with the smallest overshoot for what lands (--ease-spring).
  const easeOut = p => 1 - (1 - p) ** 3;
  const easeInOut = p => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
  const settle = p => { const c = 1.25; return 1 + (c + 1) * (p - 1) ** 3 + c * (p - 1) ** 2; };
  /** 0 → 1 over `rise` after `start`, 1 → 0 over `fall` before `end`, 0 outside. */
  const envelope = (T, start, end, rise, fall) => {
    if (T < start || T >= end) return 0;
    return Math.min(rise ? clamp((T - start) / rise) : 1, fall ? clamp((end - T) / fall) : 1);
  };

  let plan, pen, W, H;
  const el = {};

  /* ---------------------------------------------------------------- footage */

  const images = new Map();
  function load(url) {
    let hit = images.get(url);
    if (!hit) {
      hit = new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`footage frame missing: ${url}`));
        img.src = url;
      });
      images.set(url, hit);
      // A handful is enough: a frame is needed for a few video frames at most.
      if (images.size > 12) images.delete(images.keys().next().value);
    }
    return hit;
  }

  /** The frame that was on the screen at `t` seconds into a chapter. */
  function frameAt(chapter, t) {
    const frames = plan.footage[chapter].frames;
    let lo = 0, hi = frames.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (frames[mid][0] <= t) lo = mid; else hi = mid - 1;
    }
    return frames[lo][1];
  }

  /** What a clip shows at T: the chapter and the moment in it. */
  function moment(clip, T) {
    if (clip.type === 'play') return { chapter: clip.chapter, t: clip.from + (T - clip.start) * clip.speed };
    if (clip.type === 'hold') return { chapter: clip.chapter, t: clip.at };
    return clip.under; // the end card stands on the last thing filmed
  }

  /* ------------------------------------------------------------------- init */

  /** A dash stays with the word before it: no line starts with one. */
  const tidy = text => String(text).replace(/ ([–—]) /g, '\u00A0$1 ');

  const TICK = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12"/><path d="M6.6 12.4l3.5 3.5 7.3-7.6"/></svg>';

  /** The largest size at which a caption fits its lines. */
  function fit(p) {
    const { max, min, maxLines } = plan.theme.caption;
    for (let size = max; size >= min; size -= 1) {
      p.style.fontSize = `${size}px`;
      const lines = Math.round(p.getBoundingClientRect().height / (size * 1.08));
      if (lines <= maxLines && p.scrollWidth <= p.clientWidth + 1) return { size, lines, fits: true };
    }
    return { size: min, lines: Math.round(p.getBoundingClientRect().height / (min * 1.08)), fits: false };
  }

  async function init(p) {
    plan = p;
    W = plan.width / plan.scale;
    H = plan.height / plan.scale;
    const th = plan.theme;
    const root = document.documentElement;
    const vars = {
      '--w': `${W}px`, '--h': `${H}px`, '--safe-top': `${plan.safeArea.top}px`,
      '--font-display': `"${th.font.display}"`, '--font-text': `"${th.font.text}"`,
      '--display-weight': th.font.displayWeight ?? 650, '--text-weight': th.font.textWeight ?? 800,
      '--veil-fill': th.veil.fill, '--veil-opacity': th.veil.opacity, '--veil-blur': `${th.veil.blur ?? 0}px`, '--veil-ink': th.veil.ink, '--caption-width': th.caption.width,
      '--light-fill': th.light.fill,
      '--touch': `${th.touch.size}px`, '--touch-fill': th.touch.fill, '--touch-ring': th.touch.ring,
      '--card-fill': th.card.fill, '--card-ink': th.card.ink, '--card-chip': th.card.chip, '--card-chip-ink': th.card.chipInk, '--card-tick': th.card.tick,
    };
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);

    for (const id of ['frame', 'screen', 'footage', 'statusbar', 'lights', 'dots', 'veil', 'captions', 'card']) el[id] = $(`#${id}`);
    // The words follow their language; the screen under them is the app's own business.
    el.captions.dir = el.card.dir = plan.dir || 'ltr';
    el.footage.width = plan.width;
    el.footage.height = plan.height;
    pen = el.footage.getContext('2d');
    el.lights.setAttribute('viewBox', `0 0 ${W} ${H}`);
    el.light = el.lights.querySelector('path');
    if (plan.statusBar) $('#statusbar .time').textContent = plan.statusBar.time;
    else el.frame.classList.add('no-statusbar');

    // The type first: a caption fitted in a fallback face would be fitted wrong.
    const faces = [`${th.font.displayWeight ?? 650} 40px "${th.font.display}"`, `${th.font.textWeight ?? 800} 18px "${th.font.text}"`];
    const sample = [...plan.captions.map(c => c.text), plan.card?.name ?? '', ...(plan.card?.points ?? [])].join(' ');
    await Promise.all(faces.map(f => document.fonts.load(f, sample)));
    await document.fonts.ready;
    const missing = faces.filter(f => !document.fonts.check(f, sample));

    const fitted = [];
    plan.captions.forEach((c, i) => {
      const box = document.createElement('div');
      box.className = 'caption';
      const text = document.createElement('p');
      text.textContent = tidy(c.text);
      box.appendChild(text);
      el.captions.appendChild(box);
      c.el = box;
      // Fitted while it can be measured; it is hidden again by the first render.
      fitted.push({ index: i, text: c.text, ...fit(text) });
    });

    if (plan.card) {
      const icon = $('#card .icon');
      icon.src = plan.card.icon;
      await icon.decode();
      $('#card .name').textContent = tidy(plan.card.name);
      $('#card .points').innerHTML = '';
      for (const point of plan.card.points) {
        const li = document.createElement('li');
        li.innerHTML = TICK;
        li.appendChild(document.createTextNode(tidy(point)));
        $('#card .points').appendChild(li);
      }
      const name = $('#card .name');
      // A long name steps down until it stands on two lines.
      for (let size = 40; size >= 28 && Math.round(name.getBoundingClientRect().height / (size * 1.08)) > 2; size -= 1) name.style.fontSize = `${size - 1}px`;
    }
    return { captions: fitted, missingFonts: missing };
  }

  /* ----------------------------------------------------------------- render */

  const rounded = b => {
    const x = b.x * W, y = b.y * H, w = b.w * W, h = b.h * H;
    const r = Math.min(b.radius * W, w / 2, h / 2);
    return `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`;
  };

  async function render(n) {
    const T = n / plan.fps;
    const clip = plan.clips.find(c => T < c.end) ?? plan.clips.at(-1);

    // 1. What was filmed. A change of place dissolves in from where the film was.
    const now = moment(clip, T);
    const fade = clip.dissolve && T - clip.start < clip.dissolve.dur ? easeInOut(clamp((T - clip.start) / clip.dissolve.dur)) : 1;
    const [under, over] = await Promise.all([
      fade < 1 ? load(frameAt(clip.dissolve.chapter, clip.dissolve.t)) : null,
      load(frameAt(now.chapter, now.t)),
    ]);
    pen.globalAlpha = 1;
    if (under) pen.drawImage(under, 0, 0, plan.width, plan.height);
    pen.globalAlpha = fade;
    pen.drawImage(over, 0, 0, plan.width, plan.height);
    el.statusbar.parentElement.style.setProperty('--status-ink', plan.theme.statusBar[plan.footage[now.chapter].theme] ?? plan.theme.statusBar.light);

    // 2. Moving in on a part of the screen, and back out.
    let transform = 'none';
    for (const z of plan.zooms) {
      const ramp = Math.min(0.5, (z.end - z.start) / 2);
      const k = easeInOut(envelope(T, z.start, z.end, ramp, ramp));
      if (k <= 0) continue;
      const s = 1 + (z.scale - 1) * k;
      const cx = (z.box.x + z.box.w / 2) * W, cy = (z.box.y + z.box.h / 2) * H;
      // The part drifts towards the middle, as far as the screen's edges allow.
      const tx = clamp(cx + (W / 2 - cx) * k * 0.7 - cx * s, W - W * s, 0);
      const ty = clamp(cy + (H / 2 - cy) * k * 0.7 - cy * s, H - H * s, 0);
      transform = `translate(${tx}px, ${ty}px) scale(${s})`;
    }
    el.screen.style.transform = transform;

    // 3. The light on a part of the screen.
    let light = 0, d = '';
    for (const l of plan.lights) {
      const k = easeInOut(envelope(T, l.start, l.end, 0.22, 0.22));
      if (k > light) { light = k; d = `M0 0H${W}V${H}H0Z${l.boxes.map(rounded).join('')}`; }
    }
    el.light.setAttribute('d', d);
    el.light.style.opacity = light * plan.theme.light.opacity;

    // 4. Where the taps land: the dot arrives, is pressed, lets go.
    el.dots.textContent = '';
    for (const tap of plan.taps) {
      const before = 0.24, press = 0.08, after = 0.32;
      if (T < tap.t - before || T > tap.t + press + after) continue;
      let scale, opacity;
      if (T < tap.t) { const p = easeOut((T - (tap.t - before)) / before); scale = 1.35 - 0.35 * p; opacity = p; }
      else if (T <= tap.t + press) { scale = 0.86; opacity = 1; }
      else { const q = (T - tap.t - press) / after; scale = 0.86 + 0.7 * easeOut(q); opacity = 1 - q; }
      const dot = document.createElement('div');
      dot.className = 'dot';
      dot.style.cssText = `left:${tap.x * W}px;top:${tap.y * H}px;transform:scale(${scale});opacity:${opacity}`;
      el.dots.appendChild(dot);
    }

    // 5. The caption on its veil.
    let veil = 0;
    for (const c of plan.captions) {
      const rise = c.in ? clamp((T - c.start) / c.in) : 1;
      const fall = c.out ? clamp((c.end - T) / c.out) : 1;
      const on = T >= c.start && T < c.end;
      const k = on ? Math.min(rise, fall) : 0;
      veil = Math.max(veil, easeInOut(k));
      c.el.style.opacity = on ? Math.min(easeOut(rise), easeOut(fall)) : 0;
      c.el.style.transform = on ? `translateY(${(1 - easeOut(rise)) * 16 - (1 - easeOut(fall)) * 10}px)` : 'none';
    }
    el.veil.style.opacity = veil;
    el.veil.style.visibility = veil > 0 ? 'visible' : 'hidden';

    // 6. The end card: the icon lands, the name and the points follow.
    if (clip.type === 'card') {
      const t = T - clip.start;
      el.card.style.opacity = easeInOut(clamp(t / clip.fade));
      const icon = clamp((t - 0.1) / 0.6);
      const iconEl = el.card.querySelector('.icon');
      iconEl.style.transform = `scale(${0.78 + 0.22 * settle(icon)})`;
      iconEl.style.opacity = clamp(icon * 3);
      const rise = (node, at, len = 0.45) => {
        const p = easeOut(clamp((t - at) / len));
        node.style.opacity = p;
        node.style.transform = `translateY(${(1 - p) * 16}px)`;
      };
      rise(el.card.querySelector('.name'), 0.32);
      el.card.querySelectorAll('.points li').forEach((li, i) => rise(li, 0.55 + i * 0.12, 0.4));
    } else {
      el.card.style.opacity = 0;
    }
  }

  window.stage = { init, render };
})();
