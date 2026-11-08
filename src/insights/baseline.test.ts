import { describe, expect, it } from 'vitest';
import { materiality, median, quantile, usual } from './baseline';

describe('quantiles', () => {
  it('interpolates between the sorted values', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(quantile([10, 20, 30, 40, 50], 0.25)).toBe(20);
    expect(quantile([10, 20, 30, 40], 0.75)).toBe(32.5);
    expect(quantile([], 0.5)).toBe(0);
    expect(quantile([7], 0.9)).toBe(7);
  });
});

describe('usual', () => {
  it('takes the median when there was money in at least four months, so one spike does not move it', () => {
    expect(usual([10000, 10000, 10000, 70000, 10000, 10000])).toEqual({ value: 10000, method: 'median', months: 6 });
    // Four of six with money: still the median.
    expect(usual([0, 20000, 0, 20000, 21000, 19000])?.method).toBe('median');
  });
  it('takes the mean for a lumpy category, so it is not "usually 0"', () => {
    expect(usual([0, 0, 30000, 0, 30000, 0])).toEqual({ value: 10000, method: 'mean', months: 6 });
  });
  it('takes the mean of two or three months, and has nothing to say on one', () => {
    expect(usual([10000, 20000])).toEqual({ value: 15000, method: 'mean', months: 2 });
    expect(usual([10000, 20000, 60000])?.value).toBe(30000);
    expect(usual([10000])).toBeNull();
    expect(usual([])).toBeNull();
  });
  it('looks at the last six months only', () => {
    expect(usual([99999, 99999, 100, 100, 100, 100, 100, 100])).toEqual({ value: 100, method: 'median', months: 6 });
  });
});

describe('materiality', () => {
  it('is 25 € a month or 1.5 % of usual spending, whichever is more', () => {
    expect(materiality(250000)).toBe(3750);
    expect(materiality(500000)).toBe(7500);
    expect(materiality(80000)).toBe(2500);
    expect(materiality(0)).toBe(2500);
    expect(materiality(250000, 3)).toBe(11250);
  });
});
