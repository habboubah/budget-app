import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { DrawerRow, DrawerValue } from '../ui/DrawerRow';
import { BarChart3, ChevronRight, Compass, Download, Filter, HandCoins, Info, Landmark, Luggage, PiggyBank, Repeat, Settings, Star, Tags, Wallet, X, Zap } from 'lucide-react';
import { Strings, fmt } from '../translations';
import { foldForSearch, searchTerms } from '../logic';
import { SearchField } from '../ui/SearchField';
import { tapLight } from '../ui/haptics';

/** The settings' groups a search can lead to (the menu scrolls there). */
export type PrefsSection = 'general' | 'display' | 'security' | 'notify' | 'demo' | 'reset';

/** The two pages the menu goes to besides its rows (the month page is home: ✕ leads there). */
export type MenuPage = 'stats' | 'insights';

/** A topic of the guide a search found: its title and its one sentence. */
export interface GuideHit { id: string; title: string; sum: string }

interface Props {
  t: Strings;
  onPage: (page: MenuPage) => void;
  /** ✕: back to the month page, the app's home. */
  onClose: () => void;
  categoryCount: number;
  onCategories: () => void;
  /** How many accounts the book has (1 until another is added, plan 30). */
  accountCount: number;
  onAccounts: () => void;
  favoriteCount: number;
  onFavorites: () => void;
  /** The recurring entries still running, and their list. */
  recurringCount: number;
  onRecurring: () => void;
  /** The sheet that asks what to import: a photo, a statement, an invoice (plan 39). */
  onImport: () => void;
  debtCount: number;
  onDebts: () => void;
  projectCount: number;
  onProjects: () => void;
  onTax: () => void;
  ruleCount: number;
  onRules: () => void;
  /** Plan 19, iPhone only: the guide to the Shortcuts automations. */
  onCapture?: () => void;
  /** Pushes "Sichern und übertragen": backup and CSV. */
  onTransfer: () => void;
  /** Pushes the guide (src/guide.ts): every feature explained, and the short tours. */
  onGuide: () => void;
  /** Pushes *Über diese App*: the app's card, its promises, rating, feedback, the privacy policy. */
  onAbout: () => void;
  /** The settings' rows (PreferencesRows), under the pages and tools. */
  settings: ReactNode;
  /** The round icon buttons at the drawer's foot: look, language, currency, colour (PreferencesButtons). */
  footer: ReactNode;
  /** What the settings hold on this device, for the search: a label and the group it is in. */
  prefs: { label: string; sub?: string; section: PrefsSection }[];
  /** The search began: the guide's words are fetched (they are a chunk of their own). */
  onSearch: () => void;
  /** The guide's topics that match; null until its words are there. */
  findGuide: (query: string) => GuideHit[] | null;
  onGuideTopic: (id: string) => void;
}

/** A row's end when it pushes a screen: a value (a count) in a soft pill, then ›. */
export function Next({ value }: { value?: ReactNode }) {
  return (
    <span className="shrink-0 flex items-center gap-1.5 text-fg-mute">
      {value !== undefined && (
        <span className="min-w-[1.75rem] min-h-[1.5rem] px-2 rounded-full bg-surface-2 inline-flex items-center justify-center text-caption font-semibold tabular-nums">{value}</span>
      )}
      <ChevronRight className="w-5 h-5 text-fg-faint rtl:rotate-180" aria-hidden="true" />
    </span>
  );
}

/** A row of *Mehr*: what it is called, what a search also finds it by, and where it leads. */
interface Feature {
  id: string;
  label: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  hue: string;
  /** A count at the row's end, when there is one. */
  value?: number;
  onClick: () => void;
}

/**
 * The menu (☰; it was the tab *Mehr*, and *Optionen* before that): since
 * November 2026 a drawer from the start edge over the dimmed month page, the
 * way fuel-app has its menu (Ahmad). It is the tab `settings`: what it opens
 * is pushed on it, and back from there opens the drawer again; ✕, a tap on
 * the dimmed page, Escape and Android's back close it (to the month page).
 *
 *   - the app's name and ✕;
 *   - the search, "Was möchtest du tun?", over these rows, the settings and
 *     the guide's topics (a setting it finds scrolls into view);
 *   - the pages, the icon in the accent: Statistik, Planen, then what every
 *     book has — categories and budgets, accounts, recurring entries,
 *     favourites;
 *   - *Werkzeuge* — importing, debts, trips and projects, the tax list,
 *     import rules, automatic capture (iPhone);
 *   - *Einstellungen* (PreferencesRows): the day the month begins, hiding
 *     amounts, the lock, the phone's backup, reminders, the test data;
 *   - quieter, grey: the guide, backup and transfer, *Über diese App*, and
 *     resetting the app;
 *   - at the foot, round icon buttons without a label (PreferencesButtons):
 *     the look, the language, the currency and the colour — each opens the
 *     phone's own picker.
 *
 * A later feature joins its section; the drawer has a budget
 * (scripts/simplicity-check.mjs).
 */
export function MoreView(p: Props) {
  const { t } = p;
  const [query, setQuery] = useState('');
  // A setting the search found: the search clears, and its group comes into view in the menu.
  const [goTo, setGoTo] = useState<PrefsSection | null>(null);
  useEffect(() => {
    if (!goTo) return;
    const id = requestAnimationFrame(() => document.querySelector(`[data-prefs="${goTo}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    setGoTo(null);
    return () => cancelAnimationFrame(id);
  }, [goTo]);
  const toSetting = (section: PrefsSection) => { setQuery(''); setGoTo(section); };
  const terms = useMemo(() => searchTerms(query), [query]);
  const searching = terms.length > 0;
  useEffect(() => { if (searching) p.onSearch(); }, [searching]);

  const guide: Feature = { id: 'guide', label: t.guideTitle, sub: t.guideRowSub, icon: Compass, hue: 'blue', onClick: p.onGuide };
  const about: Feature = { id: 'about', label: t.aboutPageTitle, sub: t.aboutPageRowSub, icon: Info, hue: 'mint', onClick: p.onAbout };
  const transfer: Feature = { id: 'transfer', label: t.transferTitle, sub: t.transferRowSub, icon: Download, hue: 'sky', onClick: p.onTransfer };
  const book: Feature[] = [
    { id: 'categories', label: t.categoriesTitle, icon: Tags, hue: 'lavender', value: p.categoryCount, onClick: p.onCategories },
    { id: 'accounts', label: t.accountsTitle, sub: t.accountsRowSub, icon: Wallet, hue: 'leaf', value: p.accountCount > 1 ? p.accountCount : undefined, onClick: p.onAccounts },
    { id: 'favorites', label: t.favorites, sub: t.favoritesSub, icon: Star, hue: 'lemon', value: p.favoriteCount || undefined, onClick: p.onFavorites },
    { id: 'recurring', label: t.recurringTitle, sub: t.recurringRowSub, icon: Repeat, hue: 'sky', value: p.recurringCount || undefined, onClick: p.onRecurring },
  ];
  const tools: Feature[] = [
    { id: 'import', label: t.importMenu, sub: t.importMenuSub, icon: Download, hue: 'blue', onClick: p.onImport },
    { id: 'debts', label: t.debtsTitle, sub: t.debtsRowSub, icon: HandCoins, hue: 'carrot', value: p.debtCount || undefined, onClick: p.onDebts },
    { id: 'projects', label: t.projectsTitle, sub: t.projectsRowSub, icon: Luggage, hue: 'mint', value: p.projectCount || undefined, onClick: p.onProjects },
    { id: 'tax', label: t.taxTitle, sub: t.taxRowSub, icon: Landmark, hue: 'stone', onClick: p.onTax },
    { id: 'rules', label: t.rulesRow, sub: t.rulesRowSub, icon: Filter, hue: 'plum', value: p.ruleCount || undefined, onClick: p.onRules },
    ...(p.onCapture ? [{ id: 'capture', label: t.captureRow, sub: t.captureRowSub, icon: Zap, hue: 'lemon', onClick: p.onCapture }] : []),
  ];
  const row = (f: Feature, main = true, tour?: string) => (
    <DrawerRow key={f.id} icon={f.icon} label={f.label} main={main} onClick={f.onClick} tour={tour}
      end={f.value !== undefined ? <DrawerValue>{f.value}</DrawerValue> : undefined} />
  );

  // The search: every word in a row's label or the line under it, whatever its case or accents.
  const has = (...texts: (string | undefined)[]) => {
    const text = foldForSearch(texts.filter(Boolean).join(' '));
    return terms.every(w => text.includes(w));
  };
  const features = searching ? [guide, transfer, about, ...book, ...tools].filter(f => has(f.label, f.sub)) : [];
  const settings = searching ? p.prefs.filter(s => has(s.label, s.sub, t.prefsTitle)) : [];
  const topics = searching ? p.findGuide(query) ?? [] : [];

  // Escape closes it — unless a sheet or a menu opened from it is on top, which Escape closes first.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]')) p.onClose();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [p.onClose]);

  const section = 'flex flex-col gap-0.5 border-t border-hairline pt-2';
  return createPortal(
    <div className="fixed inset-0 z-40 flex drawer-backdrop touch-none" dir={t.dir} onClick={p.onClose}>
      <nav
        data-menu
        aria-label={t.tabSettings}
        onClick={e => e.stopPropagation()}
        className="drawer touch-auto flex h-full w-[19.5rem] max-w-[86vw] flex-col gap-2 overflow-y-auto overscroll-contain bg-surface px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+1rem)] text-fg"
      >
        <div className="flex items-center justify-between gap-2 ps-3 pe-1">
          <p className="display text-heading font-bold wrap-compound">{t.appName}</p>
          <button
            type="button"
            onClick={() => { tapLight(); p.onClose(); }}
            aria-label={t.menuClose}
            title={t.menuClose}
            data-nav="close"
            className="h-tap w-tap inline-flex items-center justify-center rounded-full text-fg-mute active:bg-surface-2 focus-visible:ring-focus"
          >
            <X className="w-[22px] h-[22px]" strokeWidth={2.25} />
          </button>
        </div>
        <div data-tour="set-search" className="px-1 pb-1">
          <SearchField value={query} onChange={setQuery} placeholder={t.moreSearch} clearLabel={t.searchClear} cancelLabel={t.cancel} />
        </div>

        {searching ? (
          <div className={section}>
            {features.map(f => row(f, false))}
            {settings.map(x => (
              <DrawerRow key={x.label} icon={Settings} label={x.label} onClick={() => toSetting(x.section)} />
            ))}
            {topics.map(g => (
              <DrawerRow key={g.id} icon={Compass} label={g.title} sub={g.sum} onClick={() => p.onGuideTopic(g.id)} />
            ))}
            {features.length + settings.length + topics.length === 0 && (
              <p className="px-3 py-4 text-label text-fg-mute wrap-prose">{fmt(t.searchNone, { q: query.trim() })}</p>
            )}
          </div>
        ) : (
          <>
            <div className={section} data-tour="set-book">
              <DrawerRow icon={BarChart3} label={t.tabStats} main nav="stats" onClick={() => p.onPage('stats')} />
              <DrawerRow icon={PiggyBank} label={t.tabInsights} main nav="insights" onClick={() => p.onPage('insights')} />
              {book.map(f => row(f))}
            </div>
            <div className={section} data-tour="set-more">
              <p className="px-3 pt-1 eyebrow text-fg-mute">{t.moreSection}</p>
              {tools.map(f => row(f))}
            </div>
            {/* Every setting, right here (they had a screen of their own until November 2026). */}
            {p.settings}
            <div className={section}>
              {row(guide, false)}
              {row(transfer, false, 'set-transfer')}
              {row(about, false)}
            </div>
          </>
        )}

        <div className="mt-auto pt-3">{p.footer}</div>
      </nav>
    </div>,
    document.body,
  );
}
