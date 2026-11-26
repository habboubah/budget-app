import { describe, expect, it } from 'vitest';
import { CHECK_EVERY_MS, LATER_FOR_MS, dueForCheck, isNewer, readLater, shouldOffer } from './appUpdate';

describe('isNewer', () => {
  it('compares the parts as numbers', () => {
    expect(isNewer('1.2.10', '1.2.9')).toBe(true);
    expect(isNewer('1.3', '1.2.24')).toBe(true);
    expect(isNewer('2.0.0', '1.9.99')).toBe(true);
  });
  it('is not newer when equal or older', () => {
    expect(isNewer('1.2.24', '1.2.24')).toBe(false);
    expect(isNewer('1.2', '1.2.0')).toBe(false);
    expect(isNewer('1.2.23', '1.2.24')).toBe(false);
  });
  it('treats unreadable versions as not newer', () => {
    expect(isNewer('', '1.0')).toBe(false);
    expect(isNewer('1.3-beta', '1.2')).toBe(false);
    expect(isNewer('1.3', 'abc')).toBe(false);
  });
});

describe('dueForCheck', () => {
  it('asks the first time and then once an hour', () => {
    expect(dueForCheck(null, 1000)).toBe(true);
    expect(dueForCheck(1000, 1000 + CHECK_EVERY_MS - 1)).toBe(false);
    expect(dueForCheck(1000, 1000 + CHECK_EVERY_MS)).toBe(true);
  });
  it('asks again when the clock went backwards', () => {
    expect(dueForCheck(5000, 1000)).toBe(true);
  });
});

describe('shouldOffer', () => {
  const now = 10 * LATER_FOR_MS;
  it('offers when "Später" was never tapped, or for another version', () => {
    expect(shouldOffer('1.3.0', null, now)).toBe(true);
    expect(shouldOffer('1.3.0', { version: '1.2.9', at: now }, now)).toBe(true);
  });
  it('waits a day after "Später" for the same version', () => {
    expect(shouldOffer('1.3.0', { version: '1.3.0', at: now - LATER_FOR_MS + 1 }, now)).toBe(false);
    expect(shouldOffer('1.3.0', { version: '1.3.0', at: now - LATER_FOR_MS }, now)).toBe(true);
  });
});

describe('readLater', () => {
  it('reads what was kept and drops anything else', () => {
    expect(readLater(JSON.stringify({ version: '1.3.0', at: 5 }))).toEqual({ version: '1.3.0', at: 5 });
    expect(readLater(null)).toBeNull();
    expect(readLater('{')).toBeNull();
    expect(readLater(JSON.stringify({ version: 3, at: 5 }))).toBeNull();
  });
});
