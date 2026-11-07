#!/usr/bin/env node
/**
 * Contrast audit for the colour tokens in src/index.css.
 *
 * For every accent (data-accent) in both themes it checks where the accent and
 * the gradient hero meet text: the accent as text on the page, on cards, on
 * its own tint and on the accent-lit page top; the ink on accent fills; white
 * and the softer whites on the hero gradient (with its sheen) and on its
 * frosted panel, together with the panel's money colours; the words a search
 * marks. It also checks the
 * paid ticks (chart-label ink on each category's chart hue).
 *
 * Text needs 4.5:1, icons and chart marks 3:1 (WCAG 2.2 AA). Values are read
 * from the CSS itself, so the audit follows every change; exit code 1 if
 * anything fails.
 *
 *   node scripts/contrast-audit.mjs          table of the worst case per row
 *   node scripts/contrast-audit.mjs --all    every check
 */
import { readFileSync } from 'node:fs';

const TEXT = 4.5;
const ICON = 3;
const verbose = process.argv.includes('--all');

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

// Every innermost `selector { declarations }`; the selector is what follows
// the previous `;`, `{` or `}`.
const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => ({
  sel: sel.split(';').pop().trim().replace(/\s+/g, ' '),
  vars: Object.fromEntries([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(m => [m[1], m[2].trim()])),
}));
const block = test => {
  const b = blocks.find(x => test(x.sel));
  if (!b) throw new Error(`index.css: no block matching ${test}`);
  return b.vars;
};

const tokens = block(s => s === '@theme');
const hero = block(s => s === ':root');
const themes = {
  light: block(s => s.includes('[data-theme="light"]')),
  dark: block(s => s.includes('[data-theme="dark"]')),
};
const accents = blocks.flatMap(b => {
  const m = /\[data-accent="([\w-]+)"\]/.exec(b.sel);
  return m ? [[m[1], b.vars]] : [];
});
if (!accents.length) throw new Error('index.css: no [data-accent] blocks');
const hues = Object.keys(themes.light).flatMap(k => /^--t-([\w]+)-chart$/.exec(k)?.slice(1) ?? []);

/* --------------------------------------------------------------- colour */

function resolve(value, scope, depth = 0) {
  if (depth > 10) throw new Error(`Circular var() in ${value}`);
  return value.replace(/var\((--[\w-]+)\)/g, (_, name) => {
    if (!(name in scope)) throw new Error(`Undefined ${name} (in ${value})`);
    return resolve(scope[name], scope, depth + 1);
  });
}

/** `#RRGGBB`, `rgb(r g b / a)` or `rgba(r, g, b, a)` → [r, g, b, a], channels 0–1. */
function parse(value) {
  const v = value.trim();
  let m = /^#([0-9a-f]{6})$/i.exec(v);
  if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255).concat(1);
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+%?))?\s*\)$/i.exec(v);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return [+m[1] / 255, +m[2] / 255, +m[3] / 255, a];
  }
  throw new Error(`Cannot parse colour "${value}"`);
}

/** `top` painted over an opaque `bottom`. */
const over = (top, bottom) => [0, 1, 2].map(i => top[i] * top[3] + bottom[i] * (1 - top[3])).concat(1);
const white = a => [1, 1, 1, a];
const black = a => [0, 0, 0, a];
const lum = c => {
  const f = x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
/** Contrast of `fg` (may be translucent) on the opaque `bg`. */
const ratio = (fg, bg) => {
  const a = lum(over(fg, bg));
  const b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};
const hex = c => '#' + c.slice(0, 3).map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase();

/* --------------------------------------------------------------- checks */

const rows = [];
let failures = 0;

function audit(label, scope, list) {
  const color = name => parse(resolve(`var(${name})`, scope));
  const results = list(color).map(([what, fg, bg, need]) => ({ what, need, r: ratio(fg, bg) }));
  const bad = results.filter(x => x.r < x.need);
  failures += bad.length;
  const worst = results.reduce((a, b) => (b.r / b.need < a.r / a.need ? b : a));
  rows.push({ label, worst, bad, results });
}

const scopeOf = (theme, accent) => ({ ...tokens, ...hero, ...themes[theme], ...accent });

for (const [name, accent] of accents) {
  for (const theme of ['light', 'dark']) {
    audit(`${name} · ${theme}`, scopeOf(theme, accent), c => {
      const bg = c('--t-bg');
      const surface = c('--t-surface');
      const surface2 = c('--t-surface-2');
      const accentRgb = resolve('var(--t-accent-rgb)', scopeOf(theme, accent)).split(/\s+/).map(Number);
      const wash = over([...accentRgb.map(x => x / 255), parseFloat(resolve('var(--t-wash)', scopeOf(theme, accent)))], bg);
      return [
        ['accent text on page', c('--t-accent'), bg, TEXT],
        ['accent text on card', c('--t-accent'), surface, TEXT],
        ['accent text on fill', c('--t-accent'), surface2, TEXT],
        ['accent text on its tint (card)', c('--t-accent'), over(c('--t-accent-dim'), surface), TEXT],
        ['accent text on its tint (page)', c('--t-accent'), over(c('--t-accent-dim'), bg), TEXT],
        ['ink on accent fill', c('--t-accent-fill-ink'), c('--t-accent-fill'), TEXT],
        ['text on lit page top', c('--t-fg'), wash, TEXT],
        ['mute text on lit page top', c('--t-fg-mute'), wash, TEXT],
        ['accent text on lit page top', c('--t-accent'), wash, TEXT],
        ['balance line on card', c('--t-chart-line'), surface, ICON],
        ['marked word (always fg ink)', c('--t-fg'), over(c('--t-mark'), surface), TEXT],
      ];
    });
  }
  // The hero looks the same by day and at night.
  audit(`${name} · hero`, scopeOf('light', accent), c => {
    const sheen = parseFloat(resolve('var(--hero-sheen)', scopeOf('light', accent)));
    const panel = parseFloat(resolve('var(--hero-panel)', scopeOf('light', accent)));
    return ['--hero-1', '--hero-2', '--hero-3'].flatMap(stop => {
      const plain = c(stop);
      const lit = over(white(sheen), plain); // the corner with the sheen
      const frosted = over(black(panel), lit); // the panel, even under the sheen
      const at = `${stop.slice(2)} ${hex(plain)}`;
      return [
        [`white on ${at}`, c('--color-on-hero'), lit, TEXT],
        [`mute on ${at}`, c('--color-on-hero-mute'), lit, TEXT],
        [`white on panel ${at}`, c('--color-on-hero'), frosted, TEXT],
        [`soft on panel ${at}`, c('--color-on-hero-soft'), frosted, TEXT],
        [`pos on panel ${at}`, c('--color-on-hero-pos'), frosted, TEXT],
        [`warn on panel ${at}`, c('--color-on-hero-warn'), frosted, TEXT],
        [`neg on panel ${at}`, c('--color-on-hero-neg'), frosted, TEXT],
      ];
    });
  });
}

// Glass (CLAUDE.md: tab bar, bar buttons, sheet buttons, menus) over what
// can lie under it. The blur only averages that content, so the check takes
// it as a flat colour: the page, a card, the lit page top — and for menus,
// which open over the balance card, the hero's darkest and lightest stop.
for (const [name, accent] of accents) {
  for (const theme of ['light', 'dark']) {
    const scope = scopeOf(theme, accent);
    audit(`${name} · ${theme} glass`, scope, c => {
      const accentRgb = resolve('var(--t-accent-rgb)', scope).split(/\s+/).map(Number);
      const wash = over([...accentRgb.map(x => x / 255), parseFloat(resolve('var(--t-wash)', scope))], c('--t-bg'));
      const chrome = [['page', c('--t-bg')], ['card', c('--t-surface')], ['lit page top', wash]].flatMap(([where, under]) => {
        const glass = over(c('--t-glass'), under);
        return [
          [`tab label on glass over ${where}`, c('--t-fg'), glass, TEXT],
          [`active tab on glass over ${where}`, c('--t-accent'), over(c('--t-accent-dim'), glass), TEXT],
        ];
      });
      const menus = [['page', c('--t-bg')], ['card', c('--t-surface')], ['hero-1', c('--hero-1')], ['hero-3', c('--hero-3')]].flatMap(([where, under]) => {
        const menu = over(c('--t-glass-menu'), under);
        return [
          [`menu text over ${where}`, c('--t-fg'), menu, TEXT],
          [`menu caption over ${where}`, c('--t-fg-mute'), menu, TEXT],
          [`menu delete over ${where}`, c('--t-neg'), menu, TEXT],
        ];
      });
      return [...chrome, ...menus];
    });
  }
}

// Paid ticks: the check (chart-label ink) on the category's chart hue.
for (const theme of ['light', 'dark']) {
  audit(`ticks · ${theme}`, scopeOf(theme, accents[0][1]), c =>
    hues.map(h => [`tick on ${h}`, c('--t-chart-label'), c(`--t-${h}-chart`), ICON]));
}

/* --------------------------------------------------------------- report */

const pad = (s, n) => String(s).padEnd(n);
console.log(`${pad('', 20)}${pad('worst', 8)}need  where`);
for (const { label, worst, bad, results } of rows) {
  console.log(`${pad(label, 20)}${pad(worst.r.toFixed(2), 8)}${pad(worst.need, 6)}${worst.what}${bad.length ? `   ✗ ${bad.length} failing` : ''}`);
  for (const x of verbose ? results : bad) {
    console.log(`  ${x.r < x.need ? '✗' : ' '} ${pad(x.r.toFixed(2), 6)} ${x.what} (needs ${x.need})`);
  }
}
console.log(failures
  ? `\n${failures} check(s) below the minimum contrast.`
  : `\nAll ${rows.reduce((n, r) => n + r.results.length, 0)} checks pass (${accents.length} accents × 2 themes + hero, ${hues.length} hues).`);
process.exit(failures ? 1 : 0);
