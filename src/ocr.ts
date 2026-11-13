/**
 * Text off a photo or screenshot — on the device, never over the network.
 * tesseract.js (WebAssembly) with the German model, both shipped in the app
 * under ocr/ (scripts/copy-ocr.mjs), loaded only when a picture is read.
 *
 * The picture is prepared first: scaled so small screenshot text is large
 * enough and huge photos don't run out of memory, made grey, light text on a
 * dark background (a banking app at night) turned dark on light, and the
 * contrast stretched — the recogniser reads black on white best.
 *
 * The stretch must never cut the writing away: on a whole screen with a short
 * list in it the letters are a hundredth of the picture, and a fixed 2 % cut
 * left only the card's grey against the page's — the reader then saw a blank
 * card ("Keine Umsätze erkannt"). `stretchWindow` narrows the cut until the
 * writing is inside.
 */

import { isAndroid, isNative } from './platform';

const MAX_SIDE = 4000;
const MIN_WIDTH = 2800;

/**
 * The grey levels the contrast is stretched between, from the picture's
 * histogram: the 2nd and 98th percentile — unless that window holds less than
 * half of the picture's whole range (measured without its 0.01 % outliers).
 * Then all it caught is background, the writing being rarer than the cut, and
 * the cut is narrowed (0.5 %, 0.1 %, the whole range) until the writing is in.
 */
export function stretchWindow(hist: ArrayLike<number>, count: number): [number, number] {
  const at = (share: number): [number, number] => {
    const cut = count * share;
    let lo = 0;
    let hi = 255;
    for (let acc = 0; lo < 255 && (acc += hist[lo]) < cut; lo++);
    for (let acc = 0; hi > 0 && (acc += hist[hi]) < cut; hi--);
    return [lo, hi];
  };
  const whole = at(0.0001);
  for (const share of [0.02, 0.005, 0.001]) {
    const window = at(share);
    if (window[1] - window[0] >= (whole[1] - whole[0]) / 2) return window;
  }
  return whole;
}

async function prepare(file: Blob, minWidth = MIN_WIDTH): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (bitmap.width * scale < minWidth) scale = Math.min(minWidth / bitmap.width, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = img.data;
  const grey = new Uint8ClampedArray(px.length / 4);
  let sum = 0;
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    grey[j] = g;
    sum += g;
  }
  const dark = sum / grey.length < 128;
  const hist = new Uint32Array(256);
  for (const g of grey) hist[g]++;
  const [lo, hi] = stretchWindow(hist, grey.length);
  const span = Math.max(1, hi - lo);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    let v = ((grey[j] - lo) / span) * 255;
    if (dark) v = 255 - v;
    px[i] = px[i + 1] = px[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Recognise the text of a picture. `onProgress` gets 0–1 while it reads. */
export async function readImageText(file: Blob, onProgress?: (p: number) => void, tune: { psm?: string; minWidth?: number } = {}): Promise<string> {
  const canvas = await prepare(file, tune.minWidth);
  const { createWorker, OEM, PSM } = await import('tesseract.js');
  const base = new URL('ocr/', document.baseURI).href;
  const worker = await createWorker('deu', OEM.LSTM_ONLY, {
    workerPath: `${base}worker.min.js`,
    corePath: `${base}tesseract-core-simd-lstm.wasm.js`,
    langPath: base.replace(/\/$/, ''),
    // Same-origin worker file: a blob: worker can't load scripts from the app's own scheme in a WebView.
    workerBlobURL: false,
    // Android's packaging unpacks .gz assets and drops the ending: the model is ocr/deu.traineddata there (plan 23).
    gzip: !(isNative() && isAndroid()),
    cacheMethod: 'none',
    logger: m => { if (m.status === 'recognizing text') onProgress?.(m.progress); },
  });
  try {
    // Fully automatic layout: it keeps a payee and its right-aligned amount on
    // one line (single-column mode split them apart).
    await worker.setParameters({ tessedit_pageseg_mode: (tune.psm as typeof PSM.AUTO) ?? PSM.AUTO, preserve_interword_spaces: '1', user_defined_dpi: '300' });
    const { data } = await worker.recognize(canvas);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

/** A bank export as text: UTF-8 if it is, else Windows-1252 (Sparkasse and most German banks). */
export async function readTextFile(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}
