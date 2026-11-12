import { CSSProperties, ComponentType, Fragment, useEffect, useId, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight, BarChart3, Bell, CalendarClock, CalendarDays, CalendarRange, Check, ChevronDown, ChevronLeft, ChevronRight, CircleCheck,
  Compass, Download, EyeOff, FileSpreadsheet, FileText, FlaskConical, HandCoins, Hash, Info, Landmark, Lightbulb, Luggage,
  MoreHorizontal, Palette, Paperclip, PenLine, PiggyBank, Play, Plus, QrCode, Repeat, Scale, ScrollText, Search, Settings, Share,
  ShieldCheck, Split, Star, Tags, Target, TrendingUp, Undo2, Wallet, WalletCards, Zap,
} from 'lucide-react';
import { Hue } from '../types';
import { Strings, fmt } from '../translations';
import { CHAPTER_TITLES, GuideTopic, GuideTopicId, GuideWords, byChapter, guideTopics, topicText } from '../guide';
import { GuidePart, TourId, guideParts, guideText, searchGuide, tourAbout, tourName } from '../guideKit';
import type { GuidePages } from '../guidePages';
import { Empty, Group, IconTile, Screen } from '../ui/Screen';
import { SearchField } from '../ui/SearchField';
import { Button } from '../ui/Button';
import { tapLight } from '../ui/haptics';
import { GuideScene } from './GuideScenes';
import { GUIDE_SHOTS, GUIDE_SHOT_LANGS } from '../guideShots';

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

/** Each tour's symbol and colour: its tab's, or the add button's. */
const TOUR_LOOK: Record<TourId, [Icon, Hue]> = {
  month: [CalendarDays, 'blue'],
  entry: [PenLine, 'mint'],
  stats: [BarChart3, 'sky'],
  plan: [PiggyBank, 'berry'],
  settings: [Settings, 'stone'],
};

/** The symbol a named button wears on screen, drawn beside its label in the text. */
const CHIP_ICON: Partial<Record<string, Icon>> = {
  month: CalendarDays, stats: BarChart3, plan: PiggyBank, settings: Settings,
  repeat: Repeat, split: Split, refund: Undo2, receipt: Paperclip, tag: Hash, favorite: Star, tax: Landmark, share: Share,
};

/**
 * A button the text names, drawn as it looks: +, ⋯, the tick that saves, ⓘ
 * and ‹ › as their symbols (read out by their names), every other one as its
 * label on a soft capsule, with its symbol where it has one. It wraps with the
 * line, so a long label never runs off a small screen.
 */
function Chip({ part, t }: { part: { label: string; key: string }; t: Strings }) {
  const round = 'inline-flex items-center justify-center rounded-full align-[-0.3em] mx-[0.1em]';
  switch (part.key) {
    case 'add':
      return <span role="img" aria-label={t.addEntry} className={`${round} w-[1.45em] h-[1.45em] hero text-on-hero`}><Plus className="w-[1em] h-[1em]" strokeWidth={2.6} /></span>;
    case 'save':
      return <span role="img" aria-label={t.save} className={`${round} w-[1.45em] h-[1.45em] bg-accent-fill text-accent-fill-ink`}><Check className="w-[0.9em] h-[0.9em]" strokeWidth={3} /></span>;
    case 'actions':
      return <span role="img" aria-label={t.monthActions} className={`${round} w-[1.45em] h-[1.45em] glass-chrome text-fg`}><MoreHorizontal className="w-[1em] h-[1em]" strokeWidth={2.4} /></span>;
    case 'info':
      return <span role="img" aria-label={t.explainTitle} className={`${round} w-[1.3em] h-[1.3em] text-accent`}><Info className="w-[1.05em] h-[1.05em]" strokeWidth={2.4} /></span>;
    case 'arrows':
      return (
        <span role="img" aria-label={`${t.prevMonth}, ${t.nextMonth}`} className={`${round} h-[1.45em] px-[0.2em] glass-chrome text-fg`}>
          <ChevronLeft className="w-[1em] h-[1em] rtl:rotate-180" strokeWidth={2.4} />
          <ChevronRight className="w-[1em] h-[1em] rtl:rotate-180" strokeWidth={2.4} />
        </span>
      );
  }
  const I = CHIP_ICON[part.key];
  return (
    <span className="rounded-[7px] bg-surface-2 shadow-[inset_0_0_0_1px_var(--t-hairline)] px-[0.35em] py-[0.05em] font-semibold text-fg box-decoration-clone">
      {I && <I className="inline w-[0.95em] h-[0.95em] me-[0.25em] align-[-0.12em] text-fg-mute" strokeWidth={2.4} />}
      {part.label}
    </span>
  );
}

/** A guide sentence with the buttons it names drawn in. */
function Rich({ parts, t }: { parts: GuidePart[]; t: Strings }) {
  return <>{parts.map((p, i) => (typeof p === 'string' ? <Fragment key={i}>{p}</Fragment> : <Chip key={i} part={p} t={t} />))}</>;
}

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
  /** The tours this book can take (the entry sheet's needs a started month, Statistik's entries). */
  tours: TourId[];
  onTour: (id: TourId) => void;
  /** Adds the test data (Optionen › Ausprobieren); absent once the book has it. */
  onDemo?: () => void;
  onShow: (topic: GuideTopic) => void;
}

/**
 * Optionen › Anleitung: the place to look things up. The tours on top, then
 * every feature by chapter — a row opens to a picture of its screen, one
 * sentence of what it is, numbered steps with the buttons drawn in, a tip,
 * *Zeigen* (which goes there and lights up the thing to tap) and its tour. A
 * search over it all, since a list this long is only read by those who are
 * not looking for something.
 */
export function GuideView({ t, pages, ios, app, seen, open, onOpen, onBack, tours, onTour, onDemo, onShow }: Props) {
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
    const id = requestAnimationFrame(() => document.querySelector(`[data-guide-topic="${open}"]`)?.scrollIntoView({ block: 'start' }));
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
        <section className="rounded-md bg-surface card-edge overflow-hidden" aria-labelledby={tourId}>
          <div className="p-5 pb-2 flex items-start gap-3">
            <span className="w-10 h-10 rounded-full hero text-on-hero inline-flex items-center justify-center shrink-0" aria-hidden="true">
              <Compass className="w-5 h-5" strokeWidth={2.2} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={tourId} className="display text-heading font-semibold text-fg wrap-compound">{pages.guideToursTitle}</h2>
              <p className="text-label text-fg-mute mt-0.5 wrap-prose">{pages.guideToursBody}</p>
            </div>
          </div>
          <ul className="divide-hairline-inset">
            {tours.map(id => {
              const [icon, hue] = TOUR_LOOK[id];
              return (
                <li key={id} style={{ '--sep': '60px' } as CSSProperties}>
                  <button
                    type="button"
                    data-guide-tour={id}
                    onClick={() => { tapLight(); onTour(id); }}
                    className="relative w-full min-h-[56px] px-[16px] py-3 flex items-center gap-[12px] text-start transition-colors active:bg-surface-2 focus-visible:ring-focus"
                  >
                    <IconTile icon={icon} hue={hue} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-body text-fg wrap-compound">{guideText(words, tourName(id))}</span>
                      <span className="block text-caption text-fg-mute mt-0.5 wrap-compound">{guideText(words, tourAbout(id))}</span>
                    </span>
                    <span className="w-8 h-8 rounded-full bg-accent-dim text-accent inline-flex items-center justify-center shrink-0" aria-hidden="true">
                      <Play className="w-4 h-4 ms-0.5 rtl:-scale-x-100" strokeWidth={2.4} fill="currentColor" />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {onDemo && (
            <div className="px-4 pb-4 pt-1 -mx-1">
              <Button variant="ghost" icon={FlaskConical} onClick={onDemo}>{t.demoAdd}</Button>
            </div>
          )}
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
              tour={topic.tour && tours.includes(topic.tour) ? topic.tour : undefined}
              onToggle={() => onOpen(open === topic.id ? null : topic.id as GuideTopicId)}
              onShow={onShow}
              onTour={onTour}
            />
          ))}
        </Group>
      ))}

      {searching && groups.length === 0 && <Empty emoji="🔎" title={fmt(t.searchNone, { q: query.trim() })} />}
    </Screen>
  );
}

function TopicRow({ topic, words, open, foldable, seen, tour, onToggle, onShow, onTour }: {
  topic: GuideTopic;
  words: GuideWords;
  open: boolean;
  /** Off while searching: every hit stays open. */
  foldable: boolean;
  seen: boolean;
  /** The tour that shows this part of the app, when the book can take it. */
  tour?: TourId;
  onToggle: () => void;
  onShow: (topic: GuideTopic) => void;
  onTour: (id: TourId) => void;
}) {
  const panelId = useId();
  const stepsId = useId();
  const [icon, hue] = LOOK[topic.id as GuideTopicId];
  const title = guideText(words, topic.title);
  const text = topicText(topic);
  const steps = words[text.steps].split('\n');
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
  const link = 'px-1 min-h-tap inline-flex items-center gap-1.5 text-body font-semibold text-accent rounded-sm active:opacity-60 focus-visible:ring-focus wrap-compound text-start';
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
          className="px-[16px] pb-4 -mt-1"
        >
          <GuidePicture id={topic.id as GuideTopicId} t={words} />
          <p className="text-body text-fg wrap-prose"><Rich parts={guideParts(words, text.sum)} t={words} /></p>

          <h4 id={stepsId} className="mt-3 mb-1.5 eyebrow text-fg-mute">{words.guideHowTo}</h4>
          <ol aria-labelledby={stepsId} className="space-y-2">
            {steps.map((_, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="w-[1.6em] h-[1.6em] mt-[-0.05em] rounded-full bg-accent-dim text-accent text-caption font-bold tabular-nums inline-flex items-center justify-center shrink-0" aria-hidden="true">{i + 1}</span>
                <span className="min-w-0 flex-1 text-label text-fg wrap-prose leading-relaxed">
                  <Rich parts={guidePartsOfLine(words, text.steps, i)} t={words} />
                </span>
              </li>
            ))}
          </ol>

          <p className="mt-3 rounded-[14px] bg-accent-dim/60 px-3 py-2.5 flex gap-2 text-label text-fg wrap-prose">
            <Lightbulb className="w-[18px] h-[18px] shrink-0 mt-[0.1em] text-accent" strokeWidth={2.2} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="sr-only">{words.guideTipLabel}: </span>
              <Rich parts={guideParts(words, text.tip)} t={words} />
            </span>
          </p>

          {(topic.action || tour) && (
            <div className="mt-2 -mx-1 flex flex-wrap items-center gap-x-4">
              {topic.action && (
                <button type="button" onClick={() => { tapLight(); onShow(topic); }} aria-label={`${words.guideShow} — ${title}`} className={link}>
                  {words.guideShow}
                  <ArrowRight className="w-[18px] h-[18px] shrink-0 rtl:rotate-180" strokeWidth={2.4} aria-hidden="true" />
                </button>
              )}
              {tour && (
                <button type="button" onClick={() => { tapLight(); onTour(tour); }} className={link}>
                  <Play className="w-4 h-4 shrink-0 rtl:-scale-x-100" strokeWidth={2.4} fill="currentColor" aria-hidden="true" />
                  {words.guideTourStart}
                </button>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

/** The theme the app shows right now (index.html / App set `data-theme` on <html>), followed as it changes. */
function useShownTheme(): 'light' | 'dark' {
  const read = (): 'light' | 'dark' => (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    const mo = new MutationObserver(() => setTheme(read()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  return theme;
}

/**
 * A topic's picture: a real screenshot of its screen with the app's test
 * data (scripts/guide-shots.mjs), in the language — German, English, Arabic,
 * else English — and the theme shown. Its size is known, so nothing jumps as
 * it loads; it is read from the app itself, never from the network. A topic
 * without one shows its drawing. Hidden from VoiceOver: the steps say it all.
 */
function GuidePicture({ id, t }: { id: GuideTopicId; t: Strings }) {
  const theme = useShownTheme();
  const [failed, setFailed] = useState(false);
  const code = t.locale.slice(0, 2);
  const set = `${(GUIDE_SHOT_LANGS as readonly string[]).includes(code) ? code : 'en'}-${theme}`;
  const size = GUIDE_SHOTS[set]?.[id];
  if (!size || failed) return <GuideScene id={id} t={t} />;
  return (
    <img
      src={`${import.meta.env.BASE_URL}guide/${set}/${id}.webp`}
      width={size[0]}
      height={size[1]}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
      className="mb-3 block w-full h-auto rounded-[16px] card-edge bg-bg select-none"
    />
  );
}

/** One line of a topic's steps, in pieces. */
function guidePartsOfLine(words: GuideWords, key: keyof GuideWords, line: number): GuidePart[] {
  const one = { ...words, [key]: words[key].split('\n')[line] } as GuideWords;
  return guideParts(one, key);
}
