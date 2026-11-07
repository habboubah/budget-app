import { Capacitor } from '@capacitor/core';

/** In the iPhone app (not the web or PWA). */
export const isNative = () => Capacitor.isNativePlatform();

/**
 * Development only: localStorage `spartopf-dev-native` = "1" shows the
 * native-only settings in the browser, so their screens can be built and
 * captured. Nothing is scheduled or locked there; production builds drop it.
 */
export function devNative(): boolean {
  if (!import.meta.env.DEV) return false;
  try { return localStorage.getItem('spartopf-dev-native') === '1'; } catch { return false; }
}
