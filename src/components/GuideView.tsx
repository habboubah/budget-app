import { CSSProperties, ComponentType, useEffect, useId, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight, BarChart3, Bell, CalendarClock, CalendarDays, CalendarRange, Check, ChevronDown, CircleCheck, Compass, Download, EyeOff,
  FileSpreadsheet, FileText, FlaskConical, HandCoins, Landmark, Luggage, Palette, Paperclip, PiggyBank, Play, Plus, QrCode, Repeat,
  Scale, ScrollText, Search, ShieldCheck, Split, Star, Tags, Target, TrendingUp, Wallet, WalletCards, Zap,
} from 'lucide-react';
import { Hue } from '../types';
import { Strings, fmt } from '../translations';
import { CHAPTER_TITLES, GuideAction, GuideTopic, GuideTopicId, GuideWords, byChapter, guideText, guideTopics, searchGuide } from '../guide';
import type { GuidePages } from '../guidePages';
import { Empty, Group, IconTile, Screen } from '../ui/Screen';
import { SearchField } from '../ui/SearchField';
import { Button } from '../ui/Button';
import { tapLight } from '../ui/haptics';

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

/** Each topic's symbol and colour — the ones its row in Optionen or its card wears, where it has one. */
const LOOK: Record<GuideTopicId, [Icon, Hue]> = {
  balances: [WalletCards, 'sky'],
  paid: [CircleCheck, 'leaf'],
  months: [CalendarDays, 'blue'],
  categories: [Tags, 'lavender'],
  search: [Search, 'stone'],
  due: [CalendarClock, 'tomato'],
  add: [Plus, 'mint'],
  repeats: [Repeat, 'blue'],
  favorites: [Star, 'lemon'],
  split: [Split, 'plum'],
  receipts: [Paperclip, 'sand'],
  capture: [Zap, 'lemon'],
  budgets: [Target, 'carrot'],
  goals: [PiggyBank, 'berry'],
  outlook: [TrendingUp, 'sky'],
  contracts: [ScrollText, 'lavender'],
  debts: [HandCoins, 'sand'],
  stats: [BarChart3, 'blue'],
  reports: [FileText, 'leaf'],
  bank: [Landmark, 'sky'],
  invoice: [QrCode, 'stone'],
  excel: [FileSpreadsheet, 'leaf'],
  reconcile: [Scale, 'plum'],
  accounts: [Wallet, 'leaf'],
  projects: [Luggage, 'sand'],
  tax: [Landmark, 'sand'],
  monthStart: [CalendarRange, 'sky'],
  private: [ShieldCheck, 'leaf'],
  backup: [Download, 'sky'],
  lock: [EyeOff, 'berry'],
  reminders: [Bell, 'tomato'],
  look: [Palette, 'plum'],
};

interface Props {
  t: Strings;
  /** The guide's own words in the app's language (src/i18n/guide/). */
  pages: GuidePages;
  /** The iPhone app (Shortcuts) / an installed app (reminders): which topics apply here. */
  ios: boolean;
  app: boolean;
  /** The topics opened before: a tick beside each. */
  seen: GuideTopicId[];
  /** The topic left open when *Zeigen* led away — the guide comes back to it. */
  open: GuideTopicId | null;
  onOpen: (id: GuideTopicId | null) => void;
  onBack: () => void;
  onTour: () => void;
  /** Adds the test data (Optionen › Ausprobieren); absent once the book has it. */
  onDemo?: () => void;
  onShow: (action: GuideAction) => void;
}

/**
 * Optionen › Anleitung: the place to look things up. The short tour on top,
 * then every feature by chapter — a row opens to two or three sentences and
 * *Zeigen*, which goes to the real screen. A search over it all, since a
 * list this long is only read by those who are not looking for something.
 */
export function GuideView({ t, pages, ios, app, seen, open, onOpen, onBack, onTour, onDemo, onShow }: Props) {
  const tourId = useId();
  const [query, setQuery] = useState('');
  const searching = query.trim() !== '';
  const words = useMemo<GuideWords>(() => ({ ...t, ...pages }), [t, pages]);
  const topics = useMemo(() => guideTopics({ ios, app }), [ios, app]);
  const groups = useMemo(() => byChapter(searchGuide(topics, words, query)), [topics, words, query]);

  // Back from *Zeigen*: the topic that was open is where the eye was. (A frame
  // later than App's own scroll-to-top for a new screen.)
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => document.querySelector(`[data-guide-topic="${open}"]`)?.scrollIntoView({ block: 'center' }));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <Screen
      title={t.guideTitle}
      subtitle={pages.guideIntro}
      onBack={onBack}
      backLabel={t.back}
      accessory={<SearchField value={query} onChange={setQuery} placeholder={pages.guideSearch} clearLabel={t.searchClear} cancelLabel={t.cancel} />}
    >
      {!searching && (
        <section className="rounded-md bg-surface card-edge p-5" aria-labelledby={tourId}>
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-full hero text-on-hero inline-flex items-center justify-center shrink-0" aria-hidden="true">
              <Compass className="w-5 h-5" strokeWidth={2.2} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={tourId} className="display text-heading font-semibold text-fg wrap-compound">{t.guideTourTitle}</h2>
              <p className="text-label text-fg-mute mt-0.5 wrap-prose">{pages.guideTourBody}</p>
            </div>
          </div>
          <div className="mt-4 -mx-1 flex flex-wrap items-center gap-2">
            <Button icon={Play} onClick={onTour}>{t.guideTourStart}</Button>
            {onDemo && <Button variant="ghost" icon={FlaskConical} onClick={onDemo}>{t.demoAdd}</Button>}
          </div>
        </section>
      )}

      {groups.map(({ chapter, topics: list }) => (
        <Group key={chapter} title={words[CHAPTER_TITLES[chapter]]}>
          {list.map(topic => (
            <TopicRow
              key={topic.id}
              topic={topic}
              words={words}
              // A search shows what it found, text and all.
              open={searching || open === topic.id}
              foldable={!searching}
              seen={seen.includes(topic.id as GuideTopicId)}
              onToggle={() => onOpen(open === topic.id ? null : topic.id as GuideTopicId)}
              onShow={onShow}
            />
          ))}
        </Group>
      ))}

      {searching && groups.length === 0 && <Empty emoji="🔎" title={fmt(t.searchNone, { q: query.trim() })} />}
    </Screen>
  );
}

function TopicRow({ topic, words, open, foldable, seen, onToggle, onShow }: {
  topic: GuideTopic;
  words: GuideWords;
  open: boolean;
  /** Off while searching: every hit stays open. */
  foldable: boolean;
  seen: boolean;
  onToggle: () => void;
  onShow: (action: GuideAction) => void;
}) {
  const panelId = useId();
  const [icon, hue] = LOOK[topic.id as GuideTopicId];
  const title = guideText(words, topic.title);
  const action = topic.action;
  const head = (
    <>
      <IconTile icon={icon} hue={hue} />
      <span className="min-w-0 flex-1 text-body text-fg wrap-compound">
        {title}
        {seen && <span className="sr-only">, {words.guideRead}</span>}
      </span>
      {seen && <Check className="w-4 h-4 shrink-0 text-fg-mute" strokeWidth={2.6} aria-hidden="true" />}
      {foldable && <ChevronDown className={`w-5 h-5 shrink-0 text-fg-faint transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />}
    </>
  );
  const shell = 'relative w-full min-h-[56px] px-[16px] py-3 flex items-center gap-[12px] text-start';
  return (
    <div data-guide-topic={topic.id} style={{ '--sep': '60px' } as CSSProperties}>
      {foldable ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => { tapLight(); onToggle(); }}
          className={`${shell} transition-colors active:bg-surface-2 focus-visible:ring-focus`}
        >
          {head}
        </button>
      ) : (
        <h3 className={shell}>{head}</h3>
      )}
      {open && (
        <motion.div
          id={panelId}
          initial={foldable ? { opacity: 0, y: -4 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="ps-[60px] pe-[16px] pb-3 -mt-1.5"
        >
          <p className="text-label text-fg wrap-prose">{guideText(words, topic.body)}</p>
          {action && (
            <button
              type="button"
              onClick={() => { tapLight(); onShow(action); }}
              aria-label={`${words.guideShow} — ${title}`}
              className="mt-1 -mx-1 px-1 min-h-tap inline-flex items-center gap-1.5 text-body font-semibold text-accent rounded-sm active:opacity-60 focus-visible:ring-focus"
            >
              {words.guideShow}
              <ArrowRight className="w-[18px] h-[18px] rtl:rotate-180" strokeWidth={2.4} aria-hidden="true" />
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}
