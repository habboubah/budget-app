import { Capacitor } from '@capacitor/core';

/** In the iPhone or the Android app (not the web or PWA). */
export const isNative = () => Capacitor.isNativePlatform();
/** In the Android app (plan 23) — or, in development, a browser told to look like it (`spartopf-dev-platform`). */
export const isAndroid = () => Capacitor.getPlatform() === 'android' || devPlatform() === 'android';
/** In the iPhone app: Siri, Shortcuts and the App Group exist only there. */
export const isIos = () => Capacitor.getPlatform() === 'ios';

/**
 * Development only: localStorage `spartopf-dev-native` = "1" shows the
 * native-only settings in the browser, so their screens can be built and
 * captured. Nothing is scheduled or locked there; production builds drop it.
 */
export function devNative(): boolean {
  if (!import.meta.env.DEV) return false;
  try { return localStorage.getItem('spartopf-dev-native') === '1'; } catch { return false; }
}

/**
 * Development only: localStorage `spartopf-dev-platform` = "android" gives
 * the browser Android's wording and its rounded face, for ui-review's Pixel
 * captures. Nothing native runs there; production builds drop it.
 */
function devPlatform(): string | null {
  if (!import.meta.env.DEV) return null;
  try { return localStorage.getItem('spartopf-dev-platform'); } catch { return null; }
}
