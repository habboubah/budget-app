import type { Language } from './translations';
import type { GuidePages } from './i18n/guide/de';

export type { GuidePages };

/*
 * The guide's pages and the tour's sentences (src/i18n/guide/): one chunk a
 * language, loaded when the guide is opened or a tour begins and kept from
 * then on. They are prose for one screen — about 8 kB a language — so, unlike
 * the app's labels, not even German, English and Arabic ship in the main
 * bundle (the performance check's budget for it).
 */
const loaders: Record<Language, () => Promise<{ default: GuidePages }>> = {
  de: () => import('./i18n/guide/de'),
  en: () => import('./i18n/guide/en'),
  ar: () => import('./i18n/guide/ar'),
  tr: () => import('./i18n/guide/tr'),
  pl: () => import('./i18n/guide/pl'),
  cs: () => import('./i18n/guide/cs'),
  sv: () => import('./i18n/guide/sv'),
  nb: () => import('./i18n/guide/nb'),
  da: () => import('./i18n/guide/da'),
  fr: () => import('./i18n/guide/fr'),
  it: () => import('./i18n/guide/it'),
  es: () => import('./i18n/guide/es'),
  nl: () => import('./i18n/guide/nl'),
  pt: () => import('./i18n/guide/pt'),
};

const loaded: Partial<Record<Language, GuidePages>> = {};

/** A language's pages once loaded, else null. */
export const guidePages = (lang: Language): GuidePages | null => loaded[lang] ?? null;

export async function loadGuidePages(lang: Language): Promise<GuidePages> {
  return (loaded[lang] ??= (await loaders[lang]()).default);
}
