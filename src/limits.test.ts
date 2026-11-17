import { describe, expect, it } from 'vitest';
import { FileTooLargeError, LIMITS, checkBytes, checkCount, withinBytes } from './limits';

describe('import limits', () => {
  it('accepts a size within the limit and rejects one over it', () => {
    expect(withinBytes(LIMITS.backupBytes, LIMITS.backupBytes)).toBe(true);
    expect(withinBytes(LIMITS.backupBytes + 1, LIMITS.backupBytes)).toBe(false);
    expect(() => checkBytes(LIMITS.csvBytes + 1, LIMITS.csvBytes)).toThrow(FileTooLargeError);
    expect(() => checkBytes(10, LIMITS.csvBytes)).not.toThrow();
  });

  it('rejects too many rows or entries with the right key', () => {
    try {
      checkCount(LIMITS.csvRows + 1, LIMITS.csvRows);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(FileTooLargeError);
      expect((e as FileTooLargeError).key).toBe('importTooMany');
    }
    expect(() => checkCount(LIMITS.csvRows, LIMITS.csvRows)).not.toThrow();
  });
});
