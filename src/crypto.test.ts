import { describe, expect, it } from 'vitest';
import { BackupLockedError, ENCRYPTED_FORMAT, MAX_PBKDF2_ITERATIONS, decryptBackup, encryptBackup, isEncryptedBackup } from './crypto';

// A low iteration count keeps the tests quick; the real default is 600,000.
const FAST = 1000;
const json = JSON.stringify({ app: 'spartopf', entries: [{ name: 'Miete', amount: 105000 }] });

describe('encrypted backups', () => {
  it('round-trips: what is locked unlocks with the same password', async () => {
    const file = await encryptBackup(json, 'correct horse battery staple', FAST);
    expect(isEncryptedBackup(file)).toBe(true);
    const back = await decryptBackup(file, 'correct horse battery staple');
    expect(back).toBe(json);
  });

  it('reveals nothing readable in the file', async () => {
    const file = await encryptBackup(json, 'pw', FAST);
    expect(file).not.toContain('Miete');
    expect(file).not.toContain('105000');
    const env = JSON.parse(file);
    expect(env.format).toBe(ENCRYPTED_FORMAT);
    expect(env.kdf.iterations).toBe(FAST); // the count travels with the file
  });

  it('fails on a wrong password', async () => {
    const file = await encryptBackup(json, 'right', FAST);
    await expect(decryptBackup(file, 'wrong')).rejects.toBeInstanceOf(BackupLockedError);
  });

  it('fails on a flipped byte in the data', async () => {
    const env = JSON.parse(await encryptBackup(json, 'pw', FAST));
    const bytes = atob(env.data).split('');
    bytes[0] = String.fromCharCode(bytes[0].charCodeAt(0) ^ 1);
    env.data = btoa(bytes.join(''));
    await expect(decryptBackup(JSON.stringify(env), 'pw')).rejects.toBeInstanceOf(BackupLockedError);
  });

  it('fails on a swapped IV', async () => {
    const env = JSON.parse(await encryptBackup(json, 'pw', FAST));
    const other = JSON.parse(await encryptBackup(json, 'pw', FAST));
    env.cipher.iv = other.cipher.iv; // a different IV than the one the data was sealed with
    await expect(decryptBackup(JSON.stringify(env), 'pw')).rejects.toBeInstanceOf(BackupLockedError);
  });

  it('fails when the authenticated header is changed', async () => {
    const env = JSON.parse(await encryptBackup(json, 'pw', FAST));
    env.kdf.iterations = env.kdf.iterations + 1; // the header is additional data
    await expect(decryptBackup(JSON.stringify(env), 'pw')).rejects.toBeInstanceOf(BackupLockedError);
  });

  it('treats a plain JSON backup as not encrypted', () => {
    expect(isEncryptedBackup(json)).toBe(false);
    expect(isEncryptedBackup('not json')).toBe(false);
  });

  it('fails cleanly on a garbled file', async () => {
    await expect(decryptBackup('not json', 'pw')).rejects.toBeInstanceOf(BackupLockedError);
    await expect(decryptBackup('{"app":"spartopf"}', 'pw')).rejects.toBeInstanceOf(BackupLockedError);
  });

  it('refuses a file that asks for an absurd iteration count instead of freezing', async () => {
    const file = JSON.parse(await encryptBackup(json, 'pw', FAST));
    for (const iterations of [MAX_PBKDF2_ITERATIONS + 1, 1e12, 1.5, -1, 'many']) {
      const forged = JSON.stringify({ ...file, kdf: { ...file.kdf, iterations } });
      await expect(decryptBackup(forged, 'pw')).rejects.toBeInstanceOf(BackupLockedError);
    }
  });
});
