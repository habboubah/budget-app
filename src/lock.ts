import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';
import { devNative, isNative } from './platform';

/*
 * The Face ID lock's device side, through @aparajita/capacitor-biometric-auth
 * (chosen in the first redesign): LocalAuthentication only, with the
 * device passcode to fall back on. It locks the interface; the data itself
 * is protected by iOS file protection (plan 06 goes further).
 */

export type LockKind = 'faceId' | 'touchId' | 'code';

/** What can unlock the app here — Face ID, Touch ID, or just the passcode; null when nothing can. */
export async function lockKind(): Promise<LockKind | null> {
  if (!isNative()) return devNative() ? 'faceId' : null;
  try {
    const info = await BiometricAuth.checkBiometry();
    if (info.isAvailable && info.biometryType === BiometryType.faceId) return 'faceId';
    if (info.isAvailable && info.biometryType === BiometryType.touchId) return 'touchId';
    // Android (plan 23): fingerprint, or face / iris unlock — worded the Android way (i18n/android.ts).
    if (info.isAvailable && info.biometryType === BiometryType.fingerprintAuthentication) return 'touchId';
    if (info.isAvailable && (info.biometryType === BiometryType.faceAuthentication || info.biometryType === BiometryType.irisAuthentication)) return 'faceId';
    return info.deviceIsSecure ? 'code' : null;
  } catch {
    return null;
  }
}

/**
 * True only when the device answered that it has no biometrics and no
 * passcode: then nothing can ever unlock the app, and a lock left on would
 * shut the owner out of their own book for good (reinstalling deletes it).
 * False on any error, so a hiccup never opens the lock.
 */
export async function deviceUnsecured(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const info = await BiometricAuth.checkBiometry();
    return !info.isAvailable && info.deviceIsSecure === false;
  } catch {
    return false;
  }
}

/** Face ID / Touch ID, falling back to the passcode. True once it went through; false when cancelled or failed. */
export async function authenticate(reason: string, cancelTitle: string): Promise<boolean> {
  if (!isNative()) return devNative();
  try {
    await BiometricAuth.authenticate({ reason, cancelTitle, allowDeviceCredential: true });
    return true;
  } catch {
    return false;
  }
}
