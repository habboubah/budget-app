/*
 * A newer version in the store, on opening the app.
 *
 * - Android: Google Play's own in-app update (SpartopfSharedPlugin.checkUpdate)
 *   shows its full-screen update, installs the new version and restarts the
 *   app. Nothing to decide here but how often to ask Play.
 * - iPhone: iOS lets no app install itself. SpartopfShared.swift asks the App
 *   Store's lookup for the newest version number (only the app's bundle id is
 *   sent), and the app offers "Update", which opens its App Store page. Phones
 *   with App Store › App Updates on (the default) install it by themselves too.
 * - Web: vite-plugin-pwa already updates itself (registerType autoUpdate).
 *
 * Pure: the timing and the version comparison, tested in appUpdate.test.ts.
 */

/** Ask the store again after this long — on opening the app or coming back to it. */
export const CHECK_EVERY_MS = 60 * 60 * 1000;
/** "Später" on the iPhone: the same version isn't offered again for a day. */
export const LATER_FOR_MS = 24 * 60 * 60 * 1000;
/** Where the iPhone's "Später" is kept: `{ version, at }`. */
export const LATER_KEY = 'spartopf-update-later';

/** "1.2.10" > "1.2.9": numeric parts, a missing part is 0. Anything unreadable is not newer. */
export function isNewer(candidate: string, current: string): boolean {
  const parse = (v: string) => (/^\d+(\.\d+)*$/.test(v.trim()) ? v.trim().split('.').map(Number) : null);
  const a = parse(candidate);
  const b = parse(current);
  if (!a || !b) return false;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

/** Time to ask the store again? Never asked yet, or the last time is CHECK_EVERY_MS ago. */
export function dueForCheck(lastCheck: number | null, now: number): boolean {
  return lastCheck === null || now - lastCheck >= CHECK_EVERY_MS || now < lastCheck;
}

export interface Later { version: string; at: number }

/** The iPhone's "Update" offer for `version` — unless "Später" was tapped for it less than a day ago. */
export function shouldOffer(version: string, later: Later | null, now: number): boolean {
  if (!later || later.version !== version) return true;
  return now - later.at >= LATER_FOR_MS || now < later.at;
}

/** The kept "Später", or null when there is none or it is unreadable. */
export function readLater(raw: string | null): Later | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (value && typeof value === 'object') {
      const { version, at } = value as Record<string, unknown>;
      if (typeof version === 'string' && typeof at === 'number' && Number.isFinite(at)) return { version, at };
    }
  } catch { /* unreadable: as if never tapped */ }
  return null;
}
