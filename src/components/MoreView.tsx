import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, ChevronRight, Compass, Download, Filter, HandCoins, Landmark, Luggage, PiggyBank, Repeat, Settings, Star, Tags, Wallet, Zap } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Strings, fmt } from '../translations';
import { foldForSearch, searchTerms } from '../logic';
import { Empty, Screen, Group, IconTile, Row } from '../ui/Screen';
import { SearchField } from '../ui/SearchField';
import { tapLight } from '../ui/haptics';

/** The groups of *Einstellungen* a search can lead to (PreferencesView scrolls there). */
export type PrefsSection = 'display' | 'security' | 'book' | 'demo' | 'about' | 'reset';

/** The three pages the menu goes to (the tab bar's first three until November 2026). */
export type MenuPage = 'month' | 'stats' | 'insights';

/** A topic of the guide a search found: its title and its one sentence. */
export interface GuideHit { id: string; title: string; sum: string }

interface Props {
  t: Strings;
  /** The page the menu was opened from: its tile is marked. */
  current: MenuPage;
  /** The month the month page shows ("November 2026"), under its tile. */
  monthLabel: string;
  onPage: (page: MenuPage) => void;
  /** ✕: back to the page the menu was opened from. */
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
  /** Pushes *Einstellungen*, at one of its groups when a search led there. */
  onPrefs: (section?: PrefsSection) => void;
  /** What *Einstellungen* holds on this device, for the search: a label and the group it is in. */
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
 * One of the two cards on top — the guide, and backup and transfer: where
 * help and safety are looked for, so they are large and first. A card that is
 * one button (it gives a little under the finger); the two sit side by side
 * and stack when large text no longer fits them abreast.
 */
function QuickTile({ icon, hue, label, sub, onClick, tour }: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  hue: string;
  label: string;
  sub: string;
  onClick: () => void;
  /** What a tour points at (src/guide.ts). */
  tour?: string;
}) {
  return (
    <button
      type="button"
      data-tour={tour}
      onClick={() => { tapLight(); onClick(); }}
      // A column from the top: a button would centre its content, and the taller card's icon would sit lower than its neighbour's.
      className="flex-1 basis-[9.5rem] min-w-0 rounded-md bg-surface card-edge press p-[14px] flex flex-col items-stretch justify-start text-start focus-visible:ring-focus"
    >
      <span className="flex items-center justify-between gap-2">
        <IconTile icon={icon} hue={hue} />
        <ChevronRight className="w-5 h-5 text-fg-faint rtl:rotate-180" aria-hidden="true" />
      </span>
      <span className="block mt-2.5 text-body font-semibold text-fg wrap-compound">{label}</span>
      <span className="block mt-0.5 text-caption text-fg-mute wrap-compound">{sub}</span>
    </button>
  );
}

/**
 * One of the menu's three big tiles: the month, Statistik, Planen — where the
 * app is used every day, so they are the first and largest thing in it. The
 * page the menu came from wears the accent and a dot. Each comes in a beat
 * after the one before, a little from below.
 */
function NavTile({ icon: Icon, label, sub, on, page, index, onClick }: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  sub: string;
  on: boolean;
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
      aria-current={on ? 'page' : undefined}
      onClick={() => { tapLight(); onClick(); }}
      initial={calm ? false : { opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', duration: 0.45, bounce: 0.25, delay: 0.04 + index * 0.05 }}
      whileTap={{ scale: 0.96 }}
      className={`relative flex-1 basis-[6.75rem] min-w-0 rounded-md p-[14px] pt-[16px] flex flex-col items-start text-start focus-visible:ring-focus ${
        on ? 'add-fab text-on-hero' : 'bg-surface card-edge text-fg'}`}
    >
      {on && <span aria-hidden="true" className="absolute top-[14px] end-[14px] w-2 h-2 rounded-full bg-on-hero/90" />}
      <span className={`w-[40px] h-[40px] rounded-[12px] inline-flex items-center justify-center ${on ? 'bg-white/20' : 'bg-accent-dim text-accent'}`}>
        <Icon className="w-[22px] h-[22px]" strokeWidth={2.2} />
      </span>
      <span className="block mt-3 text-body font-bold wrap-compound">{label}</span>
      <span aria-hidden="true" className={`block mt-0.5 text-caption wrap-compound ${on ? 'opacity-85' : 'text-fg-mute'}`}>{sub}</span>
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
 * there. It covers the page it was opened from; ✕ goes back there.
 *
 *   0. three big tiles: the month, Statistik, Planen — what the tab bar held;
 *   1. a search, "Was möchtest du tun?", over these rows, what *Einstellungen*
 *      holds and the guide's topics;
 *   2. two large cards: the guide, and backup and transfer;
 *   3. *Haushaltsbuch* — what every book has: categories and budgets,
 *      accounts, favourites;
 *   4. *Werkzeuge* — what a book may use: importing, debts, trips and
 *      projects, the tax list, import rules, automatic capture (iPhone);
 *   5. *Einstellungen* — one row to the screen with what is set once: the
 *      look, security and notifications, the day the month begins, the test
 *      data, about the app and resetting it (PreferencesView).
 *
 * Every icon tile in a group has its own colour, so a row is found by it. A
 * later feature joins its group; a new group needs a reason — and the screen
 * has a budget (scripts/simplicity-check.mjs).
 */
export function MoreView(p: Props) {
  const { t } = p;
  const [query, setQuery] = useState('');
  const terms = useMemo(() => searchTerms(query), [query]);
  const searching = terms.length > 0;
  useEffect(() => { if (searching) p.onSearch(); }, [searching]);

  const guide: Feature = { id: 'guide', label: t.guideTitle, sub: t.guideRowSub, icon: Compass, hue: 'blue', onClick: p.onGuide };
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
  const features = searching ? [guide, transfer, ...book, ...tools].filter(f => has(f.label, f.sub)) : [];
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
                <Row key={s.label} label={s.label} sub={s.sub} leading={<IconTile icon={Settings} hue="stone" />} trailing={<Next />} onClick={() => p.onPrefs(s.section)} />
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
          {/* Where the app is used every day: the largest, and first. */}
          <nav aria-label={t.tabSettings} className="flex flex-wrap gap-[10px]">
            <NavTile page="month" index={0} icon={CalendarDays} label={t.tabMonth} sub={p.monthLabel} on={p.current === 'month'} onClick={() => p.onPage('month')} />
            <NavTile page="stats" index={1} icon={BarChart3} label={t.tabStats} sub={t.menuStatsSub} on={p.current === 'stats'} onClick={() => p.onPage('stats')} />
            <NavTile page="insights" index={2} icon={PiggyBank} label={t.tabInsights} sub={t.menuPlanSub} on={p.current === 'insights'} onClick={() => p.onPage('insights')} />
          </nav>
          {/* Where help and safety are looked for: large, and next. */}
          <div className="flex flex-wrap gap-[12px]">
            <QuickTile icon={guide.icon} hue={guide.hue} label={guide.label} sub={guide.sub!} onClick={guide.onClick} />
            <QuickTile icon={transfer.icon} hue={transfer.hue} label={transfer.label} sub={transfer.sub!} onClick={transfer.onClick} tour="set-transfer" />
          </div>
          <Group title={t.bookSection} tour="set-book">{book.map(row)}</Group>
          <Group title={t.moreSection} tour="set-more">{tools.map(row)}</Group>
          <Group tour="set-prefs">
            <Row label={t.prefsTitle} sub={t.prefsRowSub} leading={<IconTile icon={Settings} hue="stone" />} trailing={<Next />} onClick={() => p.onPrefs()} />
          </Group>
        </>
      )}
    </Screen>
  );
}
