/*
 * Encrypted backup files (plan 04). A backup leaves the device as a locked
 * file by default: anyone who gets it from iCloud Drive, a mail attachment or
 * a shared folder sees nothing without the password. Everything here is
 * WebCrypto (crypto.subtle, crypto.getRandomValues) — no third-party crypto.
 *
 * Format (UTF-8 JSON, base64 fields):
 *   { app: 'spartopf', format: 'spartopf-encrypted', v: 1,
 *     kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt },
 *     cipher: { name: 'AES-GCM', iv }, data }
 * The whole header (everything but `data`) is authenticated as GCM additional
 * data, so it can't be swapped. A wrong password and a tampered file fail the
 * same way (GCM authentication), with one message.
 */

/** OWASP's current guidance for PBKDF2-HMAC-SHA-256. Stored in the file, so a later version can raise it. */
export const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
export const ENCRYPTED_FORMAT = 'spartopf-encrypted';

interface EncryptedBackup {
  app: 'spartopf';
  format: typeof ENCRYPTED_FORMAT;
  v: 1;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string };
  cipher: { name: 'AES-GCM'; iv: string };
  data: string;
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** The header bytes (everything but `data`), authenticated as GCM additional data. */
function headerAad(env: Omit<EncryptedBackup, 'data'>): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(env));
}

/** Whether a file is one of our encrypted backups (cheap, no decryption). */
export function isEncryptedBackup(text: string): boolean {
  try {
    const raw = JSON.parse(text) as Partial<EncryptedBackup>;
    return raw?.app === 'spartopf' && raw.format === ENCRYPTED_FORMAT;
  } catch {
    return false;
  }
}

/** Lock a backup's JSON with a password. Returns the file's text (base64 JSON). */
export async function encryptBackup(json: string, password: string, iterations = PBKDF2_ITERATIONS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const header: Omit<EncryptedBackup, 'data'> = {
    app: 'spartopf',
    format: ENCRYPTED_FORMAT,
    v: 1,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: toBase64(salt) },
    cipher: { name: 'AES-GCM', iv: toBase64(iv) },
  };
  const key = await deriveKey(password, salt, iterations);
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource, additionalData: headerAad(header) as BufferSource },
    key,
    new TextEncoder().encode(json),
  );
  const env: EncryptedBackup = { ...header, data: toBase64(new Uint8Array(cipher)) };
  return JSON.stringify(env);
}

/** The error a wrong password or a tampered file raises — one message for both. */
export class BackupLockedError extends Error {
  constructor() { super('The backup could not be unlocked.'); }
}

/** Unlock an encrypted backup. Throws BackupLockedError on a wrong password or a tampered file. */
export async function decryptBackup(text: string, password: string): Promise<string> {
  let env: EncryptedBackup;
  try {
    env = JSON.parse(text) as EncryptedBackup;
  } catch {
    throw new BackupLockedError();
  }
  if (env?.app !== 'spartopf' || env.format !== ENCRYPTED_FORMAT || !env.kdf || !env.cipher || typeof env.data !== 'string') {
    throw new BackupLockedError();
  }
  const iterations = Number(env.kdf.iterations);
  if (!Number.isFinite(iterations) || iterations < 1) throw new BackupLockedError();
  const { data, ...header } = env;
  try {
    const key = await deriveKey(password, fromBase64(env.kdf.salt), iterations);
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(env.cipher.iv) as BufferSource, additionalData: headerAad(header) as BufferSource },
      key,
      fromBase64(data) as BufferSource,
    );
    return new TextDecoder().decode(plain);
  } catch {
    throw new BackupLockedError();
  }
}
