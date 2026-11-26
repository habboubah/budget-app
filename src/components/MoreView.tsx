import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { BarChart3, ChevronRight, Compass, Download, Filter, HandCoins, Info, Landmark, Luggage, PiggyBank, Repeat, Settings, Star, Tags, Wallet, Zap } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Strings, fmt } from '../translations';
import { foldForSearch, searchTerms } from '../logic';
import { Empty, Screen, Group, IconTile, Row } from '../ui/Screen';
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
  /** The settings' groups (PreferencesGroups), shown under the rows. */
  children: ReactNode;
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

/**
 * One of the menu's two big tiles: Statistik and Planen — the pages besides
 * the month that are used most, so they are the first thing in it. Each comes
 * in a beat after the one before, a little from below.
 */
function NavTile({ icon: Icon, label, sub, page, index, onClick }: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  sub: string;
  page: MenuPage;
  index: number;
  onClick: () => void;
}) {
  const calm = useReducedMotion();
  return (
    <motion.button
      type="button"
      data-nav-tile={page}
      aria-label={label}
      onClick={() => { tapLight(); onClick(); }}
      initial={calm ? false : { opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', duration: 0.45, bounce: 0.25, delay: 0.04 + index * 0.05 }}
      whileTap={{ scale: 0.96 }}
      className="relative flex-1 basis-[8.5rem] min-w-0 rounded-md p-[14px] pt-[16px] flex items-center gap-3 text-start bg-surface card-edge text-fg focus-visible:ring-focus"
    >
      <span className="w-[42px] h-[42px] shrink-0 rounded-[12px] inline-flex items-center justify-center add-fab text-on-hero">
        <Icon className="w-[22px] h-[22px]" strokeWidth={2.2} />
      </span>
      <span className="min-w-0">
        <span className="block text-body font-bold wrap-compound">{label}</span>
        <span aria-hidden="true" className="block mt-0.5 text-caption text-fg-mute wrap-compound">{sub}</span>
      </span>
    </motion.button>
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
 * The menu (☰, November 2026; it was the tab *Mehr*, and *Optionen* before
 * that): every page of the app on about one screen, named for what is done
 * there. It opens over the month page, the app's home; ✕ goes back there.
 *
 *   1. a search, "Was möchtest du tun?", over these rows, what *Einstellungen*
 *      holds and the guide's topics;
 *   2. two big tiles: Statistik and Planen;
 *   3. *Haushaltsbuch* — what every book has: categories and budgets,
 *      accounts, recurring entries, favourites;
 *   4. *Werkzeuge* — what a book may use: importing, debts, trips and
 *      projects, the tax list, import rules, automatic capture (iPhone);
 *   5. *App* — the guide, backup and transfer, and *Über diese App* (AboutView);
 *   6. *Einstellungen* — every setting, grouped by topic (PreferencesGroups,
 *      which App passes as children): the search's settings scroll here.
 *
 * Every icon tile in a group has its own colour, so a row is found by it. A
 * later feature joins its group; a new group needs a reason — and the screen
 * has a budget (scripts/simplicity-check.mjs).
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
  const row = (f: Feature) => (
    <Row key={f.id} label={f.label} sub={f.sub} leading={<IconTile icon={f.icon} hue={f.hue} />} trailing={<Next value={f.value} />} onClick={f.onClick} />
  );

  // The search: every word in a row's label or the line under it, whatever its case or accents.
  const has = (...texts: (string | undefined)[]) => {
    const text = foldForSearch(texts.filter(Boolean).join(' '));
    return terms.every(w => text.includes(w));
  };
  const features = searching ? [guide, transfer, about, ...book, ...tools].filter(f => has(f.label, f.sub)) : [];
  const settings = searching ? p.prefs.filter(s => has(s.label, s.sub, t.prefsTitle)) : [];
  const topics = searching ? p.findGuide(query) ?? [] : [];

  return (
    <Screen
      title={t.tabSettings}
      tabbed
      onClose={p.onClose}
      closeLabel={t.menuClose}
      accessory={(
        <div data-tour="set-search">
          <SearchField value={query} onChange={setQuery} placeholder={t.moreSearch} clearLabel={t.searchClear} cancelLabel={t.cancel} />
        </div>
      )}
    >
      {searching ? (
        <>
          {features.length > 0 && <Group>{features.map(row)}</Group>}
          {settings.length > 0 && (
            <Group title={t.prefsTitle}>
              {settings.map(s => (
                <Row key={s.label} label={s.label} sub={s.sub} leading={<IconTile icon={Settings} hue="stone" />} trailing={<Next />} onClick={() => toSetting(s.section)} />
              ))}
            </Group>
          )}
          {topics.length > 0 && (
            <Group title={t.guideTitle}>
              {topics.map(g => (
                <Row key={g.id} label={g.title} sub={g.sum} leading={<IconTile icon={Compass} hue="blue" />} trailing={<Next />} onClick={() => p.onGuideTopic(g.id)} />
              ))}
            </Group>
          )}
          {features.length + settings.length + topics.length === 0 && <Empty emoji="🔎" title={fmt(t.searchNone, { q: query.trim() })} />}
        </>
      ) : (
        <>
          {/* The two pages besides the month: the largest, and first. */}
          <nav aria-label={t.tabSettings} className="flex flex-wrap gap-[10px]">
            <NavTile page="stats" index={0} icon={BarChart3} label={t.tabStats} sub={t.menuStatsSub} onClick={() => p.onPage('stats')} />
            <NavTile page="insights" index={1} icon={PiggyBank} label={t.tabInsights} sub={t.menuPlanSub} onClick={() => p.onPage('insights')} />
          </nav>
          <Group title={t.bookSection} tour="set-book">{book.map(row)}</Group>
          <Group title={t.moreSection} tour="set-more">{tools.map(row)}</Group>
          {/* The app itself: help, and keeping the book safe. */}
          <Group title={t.appSection}>
            {row(guide)}
            <Row label={transfer.label} sub={transfer.sub} leading={<IconTile icon={transfer.icon} hue={transfer.hue} />} trailing={<Next />} onClick={transfer.onClick} tour="set-transfer" />
            {row(about)}
          </Group>
          {/* Then every setting, right here (they had a screen of their own until November 2026). */}
          {p.children}
        </>
      )}
    </Screen>
  );
}
