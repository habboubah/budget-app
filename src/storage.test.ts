import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  BACKUP_DIR, FILE, FsLike, PRE_RESTORE, PREV, StorageCorruptError, TMP,
  createSaver, hydrate, listSnapshots, readEnvelope, readSnapshot, restoreSnapshot, snapshotsToKeep, takeSnapshot, writeLocal,
} from './storage';
import { computeBalances } from './logic';
import { defaultCategories } from './data/defaults';
import { AppData } from './types';

/** A file system in memory. Like iOS's, it refuses to rename onto an existing file. */
function memFs(files: Record<string, string> = {}) {
  const m = new Map(Object.entries(files));
  const log: string[] = [];
  const fs: FsLike = {
    read: async p => m.get(p) ?? null,
    write: async (p, t) => { log.push(`write ${p}`); m.set(p, t); },
    rename: async (a, b) => {
      if (m.has(b)) throw new Error(`${b} exists`);
      const v = m.get(a);
      if (v === undefined) throw new Error(`${a} missing`);
      log.push(`rename ${a} ${b}`);
      m.delete(a);
      m.set(b, v);
    },
    remove: async p => { m.delete(p); },
    list: async dir => [...m.keys()].filter(p => p.startsWith(`${dir}/`)).map(p => p.slice(dir.length + 1)).filter(n => !n.includes('/')),
  };
  return { fs, files: m, log };
}

const book = (amount = 105000): AppData => ({
  categories: defaultCategories(),
  entries: [{ id: 'e1', month: '2026-11', categoryId: 'fixed', name: 'Miete', amount, paid: true, repeat: 'monthly', seriesId: 'e1', createdAt: 1, date: '2026-11-01' }],
  months: [{ key: '2026-11', startedAt: 1, opening: 200000 }],
});
const nothing = () => undefined;
const noMirror = () => {};
/** localStorage as a Map, for the mirror and the old versions' keys. */
function memLocal(seed: Record<string, unknown> = {}) {
  const m = new Map<string, string>(Object.entries(seed).map(([k, v]) => [k, JSON.stringify(v)]));
  return {
    read: (k: string) => { const v = m.get(k); return v === undefined ? undefined : JSON.parse(v); },
    write: (k: string, v: string) => { m.set(k, v); },
    map: m,
  };
}

afterEach(() => { vi.useRealTimers(); });

describe('the file', () => {
  it('round-trips: what is saved is what loads', async () => {
    const { fs } = memFs();
    const saver = createSaver(fs, noMirror);
    saver.save(book());
    await saver.flush();
    const back = await hydrate(fs, nothing);
    expect(back.source).toBe('file');
    expect(back.data).toEqual(book());
  });

  it('keeps the previous version as data.prev.json, and never renames onto a file', async () => {
    const { fs, files, log } = memFs();
    const saver = createSaver(fs, noMirror);
    saver.save(book(100000));
    await saver.flush();
    saver.save(book(105000));
    await saver.flush();
    expect((await readEnvelope(files.get(PREV)!))?.data.entries[0].amount).toBe(100000);
    expect((await readEnvelope(files.get(FILE)!))?.data.entries[0].amount).toBe(105000);
    expect(files.has(TMP)).toBe(false);
    expect(log.slice(-3)).toEqual([`write ${TMP}`, `rename ${FILE} ${PREV}`, `rename ${TMP} ${FILE}`]);
  });

  it('falls back to data.prev.json when data.json is broken', async () => {
    const { fs, files } = memFs();
    const saver = createSaver(fs, noMirror);
    saver.save(book(100000));
    await saver.flush();
    saver.save(book(105000));
    await saver.flush();
    files.set(FILE, '{"app":"spartopf","sch');
    const back = await hydrate(fs, nothing);
    expect(back.source).toBe('prev');
    expect(back.data.entries[0].amount).toBe(100000);
  });

  it('notices a changed number: the checksum no longer matches', async () => {
    const { fs, files } = memFs();
    const saver = createSaver(fs, noMirror);
    saver.save(book());
    await saver.flush();
    const tampered = files.get(FILE)!.replace('"amount":105000', '"amount":105001');
    expect(tampered).not.toBe(files.get(FILE));
    expect(await readEnvelope(tampered)).toBeNull();
    files.set(FILE, tampered);
    const local = memLocal();
    writeLocal(book(99000), local.write);
    expect((await hydrate(fs, local.read)).source).toBe('mirror');
  });

  it('takes the localStorage mirror when both files are broken', async () => {
    const { fs } = memFs({ [FILE]: 'nope', [PREV]: '{}' });
    const local = memLocal();
    writeLocal(book(77700), local.write);
    const back = await hydrate(fs, local.read);
    expect(back.source).toBe('mirror');
    expect(back.data.entries[0].amount).toBe(77700);
  });

  it('refuses to start an empty book over broken files with nothing to fall back on', async () => {
    const { fs } = memFs({ [FILE]: 'nope' });
    await expect(hydrate(fs, nothing)).rejects.toBeInstanceOf(StorageCorruptError);
  });

  it('a write cut short: a whole temp file is newer and wins; a half one is ignored', async () => {
    const { fs, files } = memFs();
    const saver = createSaver(fs, noMirror, { now: (() => { let t = 0; return () => new Date(2026, 10, 7, 12, 0, t++); })() });
    saver.save(book(100000));
    await saver.flush();
    saver.save(book(105000));
    await saver.flush();
    // As if the app died after data.json moved to data.prev.json, before the temp file took its place.
    const newest = files.get(FILE)!;
    files.delete(FILE);
    files.set(TMP, newest);
    expect((await hydrate(fs, nothing))).toMatchObject({ source: 'tmp' });
    files.set(TMP, newest.slice(0, newest.length / 2));
    const back = await hydrate(fs, nothing);
    expect(back.source).toBe('prev');
    expect(back.data.entries[0].amount).toBe(100000);
  });
});

describe('saving', () => {
  it('merges quick changes into one write of the last', async () => {
    vi.useFakeTimers();
    const { fs, files, log } = memFs();
    const saver = createSaver(fs, noMirror);
    saver.save(book(1));
    saver.save(book(2));
    await vi.advanceTimersByTimeAsync(200);
    saver.save(book(3));
    await vi.advanceTimersByTimeAsync(299);
    expect(log.filter(l => l === `write ${TMP}`)).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    await saver.flush();
    expect(log.filter(l => l === `write ${TMP}`)).toHaveLength(1);
    expect((await readEnvelope(files.get(FILE)!))?.data.entries[0].amount).toBe(3);
  });

  it('flush() writes at once', async () => {
    vi.useFakeTimers();
    const { fs, files } = memFs();
    const saver = createSaver(fs, noMirror);
    saver.save(book(42));
    await saver.flush();
    expect((await readEnvelope(files.get(FILE)!))?.data.entries[0].amount).toBe(42);
  });

  it('in the app: a mirror that fails is fine, a file that fails is not', async () => {
    const { fs } = memFs();
    const status: boolean[] = [];
    const saver = createSaver(fs, () => { throw new Error('quota'); });
    saver.onStatus(ok => status.push(ok));
    saver.save(book());
    await saver.flush();
    const broken: FsLike = { ...fs, write: async () => { throw new Error('disk full'); } };
    const saver2 = createSaver(broken, noMirror);
    saver2.onStatus(ok => status.push(ok));
    saver2.save(book());
    await saver2.flush();
    expect(status).toEqual([true, false]);
  });

  it('on the web: localStorage is the store, and its failure is reported', async () => {
    const status: boolean[] = [];
    const local = memLocal();
    const saver = createSaver(null, data => writeLocal(data, local.write));
    saver.onStatus(ok => status.push(ok));
    saver.save(book(5));
    await saver.flush();
    expect(JSON.parse(local.map.get('spartopf-entries')!)[0].amount).toBe(5);
    const full = createSaver(null, () => { throw new Error('quota'); });
    full.onStatus(ok => status.push(ok));
    full.save(book());
    await full.flush();
    expect(status).toEqual([true, false]);
  });
});

describe('deleting everything', () => {
  it('leaves no copy of the old book behind, then saves the new one', async () => {
    const { fs, files } = memFs();
    let cleared = 0;
    const saver = createSaver(fs, noMirror, { clearMirror: () => { cleared++; } });
    saver.save(book(100000));
    await saver.flush();
    saver.save(book(105000));
    await saver.flush();
    expect(files.has(PREV)).toBe(true);
    saver.save(book(1)); // waiting, about to go out
    await saver.forget();
    expect([...files.keys()]).toEqual([]);
    expect(cleared).toBe(1);
    const fresh: AppData = { ...book(), entries: [] };
    saver.save(fresh);
    await saver.flush();
    expect([...files.keys()]).toEqual([FILE]);
    expect((await readEnvelope(files.get(FILE)!))?.data.entries).toEqual([]);
  });
});

describe('moving over from localStorage', () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/storage-v1.json', import.meta.url), 'utf8')) as Record<string, unknown>;

  it('reads what an old version stored, then writes the file, and loads from it with the same balances', async () => {
    const { fs, files } = memFs();
    const first = await hydrate(fs, k => fixture[k]);
    expect(first.source).toBe('migrated');
    const balances = (d: AppData) => computeBalances(d).map(b => [b.key, b.now, b.end]);
    expect(balances(first.data)).toEqual([['2025-09', 333580, 331080], ['2025-10', 515550, 513050]]);
    const saver = createSaver(fs, noMirror);
    saver.save(first.data);
    await saver.flush();
    expect(files.has(FILE)).toBe(true);
    // localStorage gone (iOS cleared it): the file has everything.
    const again = await hydrate(fs, nothing);
    expect(again.source).toBe('file');
    expect(balances(again.data)).toEqual(balances(first.data));
  });

  it('a first launch with nothing anywhere starts a fresh book', async () => {
    const { fs } = memFs();
    const fresh = await hydrate(fs, nothing);
    expect(fresh.source).toBe('migrated');
    expect(fresh.data.months).toHaveLength(1);
    expect(fresh.data.entries).toEqual([]);
  });
});

describe('snapshotsToKeep', () => {
  it('keeps the last 14 days in full', () => {
    const dates = Array.from({ length: 20 }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`);
    const kept = snapshotsToKeep(dates, '2026-11-20');
    // 2026-11-07 … 2026-11-20 is fourteen days.
    expect(kept).toContain('2026-11-20');
    expect(kept).toContain('2026-11-07');
    expect(kept).not.toContain('2026-11-06');
  });

  it('then keeps the newest snapshot of each of the last twelve months (older than 14 days)', () => {
    const dates = [
      '2025-12-05', '2025-12-20', // older month, keep only the newest
      '2026-01-10', '2026-02-10', '2026-03-10', '2026-04-10', '2026-05-10',
      '2026-06-10', '2026-07-10', '2026-08-10', '2026-09-10', '2026-10-10',
    ];
    const kept = snapshotsToKeep(dates, '2026-11-20');
    expect(kept).toContain('2025-12-20'); // newest of December 2025
    expect(kept).not.toContain('2025-12-05'); // the older December one is dropped
    expect(kept).toContain('2026-10-10');
    // Twelve months back from November 2026 is December 2025; November 2025 falls out.
    expect(snapshotsToKeep(['2025-11-30', ...dates], '2026-11-20')).not.toContain('2025-11-30');
  });

  it('handles month ends and a leap day beyond the 14-day window', () => {
    // Pick a today far enough that February falls outside the last 14 days.
    const dates = ['2024-02-29', '2024-02-01', '2024-01-31'];
    const kept = snapshotsToKeep(dates, '2024-03-20');
    expect(kept).toContain('2024-02-29'); // newest of February
    expect(kept).not.toContain('2024-02-01'); // older February snapshot dropped
    expect(kept).toContain('2024-01-31');
  });
});

describe('automatic snapshots', () => {
  const march = (day: number) => new Date(2026, 2, day, 9, 0, 0);

  it('writes one snapshot a day and prunes to the keep set', async () => {
    const { fs } = memFs();
    // One save on each of three days; the second save of a day writes nothing new.
    await takeSnapshot(book(1), fs, march(1));
    await takeSnapshot(book(2), fs, march(1)); // same day — no new file
    await takeSnapshot(book(3), fs, march(2));
    const names = await fs.list(BACKUP_DIR);
    expect(names.sort()).toEqual(['2026-03-01.json', '2026-03-02.json']);
    // The first file still holds the first save: a day's snapshot isn't overwritten.
    expect((await readSnapshot('2026-03-01.json', fs))?.entries[0].amount).toBe(1);
  });

  it('through the saver: the first save of a day leaves a snapshot', async () => {
    const { fs } = memFs();
    const saver = createSaver(fs, noMirror, { now: () => march(5), snapshots: true });
    saver.save(book(500));
    await saver.flush();
    const snaps = await listSnapshots(fs);
    expect(snaps).toHaveLength(1);
    expect(snaps[0]).toMatchObject({ date: '2026-03-05', ok: true, entries: 1, preRestore: false });
  });

  it('restore keeps a pre-restore snapshot for undo, then loads the chosen one', async () => {
    const { fs } = memFs();
    await takeSnapshot(book(100000), fs, march(1));
    const current = book(999);
    const restored = await restoreSnapshot('2026-03-01.json', current, fs, march(3));
    expect(restored?.entries[0].amount).toBe(100000);
    // The book as it was before the restore is kept, pinned to the top of the list.
    const snaps = await listSnapshots(fs);
    expect(snaps[0].preRestore).toBe(true);
    expect((await readSnapshot(PRE_RESTORE, fs))?.entries[0].amount).toBe(999);
  });

  it('shows a torn snapshot as not ok without breaking the list', async () => {
    const { fs, files } = memFs();
    await takeSnapshot(book(1), fs, march(1));
    files.set(`${BACKUP_DIR}/2026-03-02.json`, '{"app":"spartopf","sch');
    const snaps = await listSnapshots(fs);
    expect(snaps.find(s => s.name === '2026-03-02.json')?.ok).toBe(false);
    expect(snaps.find(s => s.name === '2026-03-01.json')?.ok).toBe(true);
  });

  it('forget() removes the snapshots too', async () => {
    const { fs, files } = memFs();
    const saver = createSaver(fs, noMirror, { now: () => march(1), snapshots: true });
    saver.save(book());
    await saver.flush();
    expect((await fs.list(BACKUP_DIR)).length).toBe(1);
    await saver.forget();
    expect([...files.keys()]).toEqual([]);
  });
});
