import { Strings, fmt } from './translations';

/*
 * Where Mehr › Einstellungen › Über Spartopf leads (plan 15). Each opens outside the app
 * — the App Store, Mail, Safari — and only when tapped; nothing is fetched.
 * Every URL here is on the privacy check's allowlist.
 */

/** The app's Apple ID on the App Store (App Store Connect → the app's address). */
export const APP_STORE_ID = '6829541731';
/**
 * Opens the App Store's "write a review" page (works once the app is live).
 * Written out whole, like the policy's addresses: the privacy check reads the
 * bundle's URLs as text.
 */
export const REVIEW_URL = 'https://apps.apple.com/app/id6829541731?action=write-review';
/** The app's page on Google Play (plan 23): where Android users rate it. */
export const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.habboubah.spartopf';
const PRIVACY_URL = 'https://habboubah.github.io/privacy-policy/spartopf/';
const PRIVACY_URL_DE = 'https://habboubah.github.io/privacy-policy/spartopf/de/';
/** The published privacy policy: German, and English for every other language. */
export const privacyUrl = (language: string) => (language === 'de' ? PRIVACY_URL_DE : PRIVACY_URL);
/** Where feedback goes: the support address the privacy policy gives. */
export const FEEDBACK_TO = 'ahmad.habboubah@gmail.com';

/** "iOS 18.1" from a WebKit user agent — the web's fallback; the iPhone app asks iOS itself. */
export function systemFromAgent(userAgent: string): string {
  const ios = /\bOS (\d+)_(\d+)(?:_(\d+))?\b/.exec(userAgent);
  if (ios && /iPhone|iPad|iPod/.test(userAgent)) return `iOS ${ios[1]}.${ios[2]}${ios[3] ? `.${ios[3]}` : ''}`;
  const android = /Android (\d+(?:\.\d+)*)/.exec(userAgent);
  if (android) return `Android ${android[1]}`;
  return /Mac OS X/.test(userAgent) ? 'macOS' : /Windows/.test(userAgent) ? 'Windows' : 'Web';
}

/**
 * The mail *Feedback senden* opens in the user's own mail app: a subject,
 * room to write, and the app's and the system's version — nothing else.
 * The app sends nothing; the user writes and sends it.
 */
export function feedbackMail(t: Strings, appVersion: string, system: string): string {
  const body = `\n\n\n— ${fmt(t.feedbackInfo, { version: appVersion, system })}`;
  return `mailto:${FEEDBACK_TO}?subject=${encodeURIComponent(t.feedbackSubject)}&body=${encodeURIComponent(body)}`;
}
