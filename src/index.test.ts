import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('index.css', () => {
  it('declares every colour token again on the printed report (plan 28), so it prints light in a dark app', () => {
    const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');
    const tokens = (block: string) => [...block.matchAll(/(--color-[a-z0-9-]+):\s*(var\(--t-[a-z0-9-]+\));/g)].map(m => `${m[1]}:${m[2]}`).sort();
    const theme = css.slice(css.indexOf('@theme {'), css.indexOf('@theme inline {'));
    const print = css.slice(css.indexOf('.print-root {\n'), css.indexOf('}', css.indexOf('.print-root {\n')));
    expect(tokens(theme).length).toBeGreaterThan(20);
    expect(tokens(print)).toEqual(tokens(theme));
  });
});
