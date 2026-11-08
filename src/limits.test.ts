import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { FileTooLargeError, LIMITS, checkBytes, checkCount, withinBytes } from './limits';
import { readXlsx } from './xlsx';

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

describe('xlsx zip bomb', () => {
  it('rejects a workbook whose unzipped size blows past the total limit', () => {
    // Several highly compressible worksheet entries, each under the per-entry
    // cap but together past the total. Zeros compress to almost nothing, so
    // the zip stays tiny on disk and the test is instant.
    const each = 40 * 1024 * 1024; // 40 MB, under xlsxEntryBytes (50 MB)
    const files: Record<string, Uint8Array> = {
      'xl/workbook.xml': strToU8('<?xml version="1.0"?><workbook><sheets/></workbook>'),
    };
    for (let i = 1; i <= 3; i++) files[`xl/worksheets/sheet${i}.xml`] = new Uint8Array(each); // 120 MB unzipped
    const bytes = zipSync(files);
    expect(bytes.length).toBeLessThan(LIMITS.xlsxBytes); // the bomb is small on disk
    expect(() => readXlsx(bytes)).toThrow(FileTooLargeError);
  });

  it('rejects a workbook file that is itself too large', () => {
    const bytes = new Uint8Array(LIMITS.xlsxBytes + 1);
    expect(() => readXlsx(bytes)).toThrow(FileTooLargeError);
  });
});
