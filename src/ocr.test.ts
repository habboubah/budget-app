import { describe, expect, it } from 'vitest';
import { stretchWindow } from './ocr';

/** A picture's histogram from "grey level: share of its pixels" (of a million). */
function histogram(shares: Record<number, number>): [Uint32Array, number] {
  const hist = new Uint32Array(256);
  let count = 0;
  for (const [level, share] of Object.entries(shares)) {
    hist[+level] = Math.round(share * 1_000_000);
    count += hist[+level];
  }
  return [hist, count];
}

describe('the contrast stretch before reading a picture', () => {
  it('cuts 2 % off both ends when the writing is plenty', () => {
    // A cropped list at night: the card, and 5 % of it white letters.
    expect(stretchWindow(...histogram({ 21: 0.01, 28: 0.03, 37: 0.91, 205: 0.03, 255: 0.02 }))).toEqual([28, 255]);
    expect(stretchWindow(...histogram({ 10: 0.01, 30: 0.04, 120: 0.05, 230: 0.89, 250: 0.01 }))).toEqual([30, 230]);
  });
  it('keeps the writing when it is rarer than the cut — a short list on a whole screen', () => {
    // At night: page 28, card 37, 1 % letters. A 2 % cut would stretch page against card.
    const [lo, hi] = stretchWindow(...histogram({ 28: 0.6, 37: 0.39, 223: 0.006, 255: 0.004 }));
    expect([lo, hi]).toEqual([28, 223]);
    // By day: page 255, card 245, 1 % letters.
    expect(stretchWindow(...histogram({ 0: 0.004, 40: 0.006, 245: 0.39, 255: 0.6 }))).toEqual([40, 255]);
    // A single line on a tall screenshot: a twentieth of a percent.
    expect(stretchWindow(...histogram({ 28: 0.9995, 240: 0.0005 }))).toEqual([28, 240]);
  });
  it('never returns an empty window for a blank picture', () => {
    const [lo, hi] = stretchWindow(...histogram({ 128: 1 }));
    expect(lo).toBe(128);
    expect(hi).toBe(128);
  });
});
