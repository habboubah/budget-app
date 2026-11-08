/*
 * The Jahresrückblick as a picture to share (D7): drawn on a canvas here, on
 * the device, only when the user taps share — in the accent's gradient (the
 * hero's tokens, read from the page) with white ink, as the hero is. What
 * goes on it is decided by the caller: no amounts unless switched on.
 */

export interface ShareImage {
  title: string;
  /** One line each, top to bottom; the first is the headline. */
  lines: string[];
  footer: string;
}

const W = 1080;
const H = 1350;

/** Words wrapped to a width, for the canvas (which doesn't wrap). */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) { out.push(line); line = word; } else line = next;
  }
  if (line) out.push(line);
  return out;
}

export async function renderShareImage(img: ShareImage, rtl = false): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas');
  const css = getComputedStyle(document.documentElement);
  const stop = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  const ink = stop('--color-on-hero', 'white');
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, stop('--hero-1', 'black'));
  g.addColorStop(0.55, stop('--hero-2', 'black'));
  g.addColorStop(1, stop('--hero-3', 'black'));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.direction = rtl ? 'rtl' : 'ltr';
  ctx.textAlign = rtl ? 'right' : 'left';
  const x = rtl ? W - 96 : 96;
  const font = 'system-ui, -apple-system, "Segoe UI", sans-serif';
  ctx.fillStyle = ink;
  ctx.font = `700 92px ${font}`;
  let y = 220;
  for (const l of wrap(ctx, img.title, W - 192)) { ctx.fillText(l, x, y); y += 104; }
  y += 40;
  img.lines.forEach((text, i) => {
    ctx.font = i === 0 ? `700 64px ${font}` : `500 50px ${font}`;
    ctx.globalAlpha = i === 0 ? 1 : 0.9;
    for (const l of wrap(ctx, text, W - 192)) { ctx.fillText(l, x, y); y += i === 0 ? 78 : 64; }
    y += i === 0 ? 40 : 24;
  });
  ctx.globalAlpha = 0.8;
  ctx.font = `600 40px ${font}`;
  ctx.fillText(img.footer, x, H - 110);
  ctx.globalAlpha = 1;
  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('no image'))), 'image/png'));
}
