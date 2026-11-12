import { ComponentType, ReactNode } from 'react';
import {
  ArrowRight, Bell, CalendarDays, Camera, Check, ChevronDown, ChevronLeft, ChevronRight, CloudOff, Download, Eye, EyeOff, FileSpreadsheet,
  FileText, HandCoins, Hash, Landmark, Lock, Luggage, Moon, Paperclip, PiggyBank, Plus, QrCode, Repeat, Scale, ScrollText, Search,
  Share, ShieldCheck, Split, Star, Sun,
} from 'lucide-react';
import { Strings } from '../translations';
import type { GuideTopicId } from '../guide';
import { formatMoney, formatMoneyWhole } from '../logic';

/*
 * A small picture of the screen each topic is about, on top of its text —
 * drawn from the app's own parts and colours, not a screenshot: it follows
 * the language, the theme, the accent and right to left, never goes out of
 * date, and costs a few hundred bytes. Content is drawn as soft bars; what
 * the topic is about stands out in the accent, with its real label. Hidden
 * from VoiceOver: the steps say everything the picture shows.
 */

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

/** A line of text, as a soft bar. */
const Bar = ({ w, dim }: { w: string; dim?: boolean }) => <span className={`block h-[7px] rounded-full ${dim ? 'bg-fg/8' : 'bg-fg/15'}`} style={{ width: w }} />;

/** The circle in front of an entry: paid, open, or overdue. */
function Tick({ state }: { state: 'paid' | 'open' | 'late' }) {
  return state === 'paid'
    ? <span className="w-4 h-4 rounded-full bg-swipe-paid text-on-color inline-flex items-center justify-center shrink-0"><Check className="w-2.5 h-2.5" strokeWidth={3.5} /></span>
    : <span className={`w-4 h-4 rounded-full border-[1.75px] shrink-0 ${state === 'late' ? 'border-warn' : 'border-fg/30'}`} />;
}

/** An entry's row: its circle, its name as a bar, its amount. */
function Entry({ state = 'paid', w = '55%', cents, hot }: { state?: 'paid' | 'open' | 'late'; w?: string; cents: number; hot?: boolean; }) {
  return (
    <span className={`flex items-center gap-2 px-2.5 py-1.5 rounded-[10px] ${hot ? 'ring-2 ring-accent bg-accent-dim' : ''}`}>
      <Tick state={state} />
      <span className="flex-1 min-w-0"><Bar w={w} /></span>
      <Money cents={cents} />
    </span>
  );
}

/** The amounts are made up; written as the app writes amounts (set by GuideScene as it draws). */
let locale = 'de-DE';
const whole = (cents: number) => formatMoneyWhole(cents, locale);
function Money({ cents, className = 'text-[11px] text-fg-mute' }: { cents: number; className?: string }) {
  return <span dir="ltr" className={`rounded-num font-semibold tabular-nums shrink-0 ${className}`}>{whole(cents)}</span>;
}

/** A pill of the entry sheet; `hot`: the one the topic is about. */
function Pill({ icon: I, label, hot }: { icon?: Icon; label: string; hot?: boolean }) {
  return (
    <span className={`h-7 max-w-full ps-2 pe-2.5 rounded-full inline-flex items-center gap-1 text-[11px] font-medium min-w-0 ${hot ? 'bg-accent-dim text-accent ring-2 ring-accent' : 'bg-surface-2 text-fg-mute'}`}>
      {I && <I className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />}
      <span className="truncate">{label}</span>
    </span>
  );
}

/** A card with a category's colour across its head. */
function Card({ hue, emoji, children, folded }: { hue: string; emoji: string; children?: ReactNode; folded?: boolean }) {
  return (
    <span data-hue={hue} className="block rounded-[12px] bg-surface card-edge overflow-hidden">
      <span className="flex items-center gap-2 px-2.5 py-1.5 hue-wash">
        <span className="emoji text-[13px]">{emoji}</span>
        <span className="flex-1"><Bar w="40%" /></span>
        <ChevronDown className={`w-3.5 h-3.5 text-fg-faint ${folded ? 'rtl:rotate-90 -rotate-90' : ''}`} strokeWidth={2.4} />
      </span>
      {!folded && <span className="block pb-1">{children}</span>}
    </span>
  );
}

/** A round symbol in the accent, as big as it stands out. */
const Round = ({ icon: I, hero, size = 'w-9 h-9' }: { icon: Icon; hero?: boolean; size?: string }) => (
  <span className={`${size} rounded-full inline-flex items-center justify-center shrink-0 ${hero ? 'hero text-on-hero' : 'bg-accent-dim text-accent'}`}>
    <I className="w-[55%] h-[55%]" strokeWidth={2.3} />
  </span>
);

const Arrow = () => <ArrowRight className="w-4 h-4 text-fg-faint shrink-0 rtl:rotate-180" strokeWidth={2.4} />;

/** A row of a menu or a list: a symbol, a label, the topic's one marked. */
function Item({ icon: I, label, hot }: { icon: Icon; label?: string; hot?: boolean }) {
  return (
    <span className={`flex items-center gap-2 px-2.5 py-1.5 rounded-[9px] min-w-0 ${hot ? 'bg-accent-dim text-accent ring-2 ring-accent' : 'text-fg-mute'}`}>
      <I className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
      {label ? <span className="text-[11px] font-medium truncate">{label}</span> : <span className="flex-1"><Bar w="70%" /></span>}
    </span>
  );
}

/** A thin bar filled to `p` (0–1). */
const Meter = ({ p, warn }: { p: number; warn?: boolean }) => (
  <span className="block h-[6px] rounded-full bg-fg/10 overflow-hidden"><span className={`block h-full rounded-full ${warn ? 'bg-warn' : 'bg-accent-fill'}`} style={{ width: `${p * 100}%` }} /></span>
);

/** A switch, on. */
const On = () => <span className="w-8 h-[18px] rounded-full bg-swipe-paid p-[2px] inline-flex justify-end shrink-0"><span className="w-[14px] h-[14px] rounded-full bg-white" /></span>;

/** A line going up and on, dashed where it is a forecast. */
function Line({ dashedFrom = 0.6 }: { dashedFrom?: number }) {
  const pts = [[0, 34], [20, 30], [40, 31], [60, 22], [80, 24], [100, 16], [120, 18], [140, 10], [160, 12], [180, 6]];
  const cut = Math.round(pts.length * dashedFrom);
  const d = (p: number[][]) => p.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  return (
    <svg viewBox="0 0 180 40" className="w-full h-10 rtl:-scale-x-100" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d(pts.slice(0, cut))} className="stroke-accent" strokeWidth="2.5" />
      <path d={d(pts.slice(cut - 1))} className="stroke-accent" strokeWidth="2.5" strokeDasharray="4 4" opacity="0.6" />
      <circle cx={pts[cut - 1][0]} cy={pts[cut - 1][1]} r="3.5" className="fill-accent" />
    </svg>
  );
}

/** Income and spending, month by month. */
function Columns() {
  const h = [[30, 22], [30, 26], [31, 20], [30, 28], [32, 18], [31, 21]];
  return (
    <span className="flex items-end justify-between gap-1.5 h-12 px-1">
      {h.map(([a, b], i) => (
        <span key={i} className="flex items-end gap-[2px]">
          <span className="w-[7px] rounded-t-[3px] bg-swipe-paid/80" style={{ height: a * 1.4 }} />
          <span className="w-[7px] rounded-t-[3px] bg-accent-fill" style={{ height: b * 1.4 }} />
        </span>
      ))}
    </span>
  );
}

const Row2 = ({ children, className = '' }: { children: ReactNode; className?: string }) => <span className={`flex items-center justify-center gap-2.5 ${className}`}>{children}</span>;

/** Each topic's picture. */
const SCENES: Record<GuideTopicId, (t: Strings) => ReactNode> = {
  balances: t => (
    <span className="block rounded-[14px] hero hero-glow text-on-hero p-3">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-semibold opacity-80 truncate">{t.balanceNow}</span>
      </span>
      <span dir="ltr" className="block rounded-num text-[20px] font-bold">{whole(124000)}</span>
      <svg viewBox="0 0 180 22" className="w-full h-5 my-1 rtl:-scale-x-100" fill="none"><path d="M0 4 L50 6 L60 14 L110 15 L120 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M120 18 L150 18 L160 9 L180 10" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" strokeLinecap="round" /><circle cx="120" cy="18" r="3" fill="currentColor" /></svg>
      <span className="flex gap-2">
        <span className="flex-1 rounded-[9px] hero-panel px-2 py-1 min-w-0"><span className="block text-[9px] opacity-80 truncate">{t.balanceEnd}</span><span dir="ltr" className="block rounded-num text-[12px] font-bold">{whole(86000)}</span></span>
        <span className="flex-1 rounded-[9px] hero-panel px-2 py-1"><Bar w="60%" /><span className="block h-1.5" /><Bar w="40%" /></span>
      </span>
    </span>
  ),
  paid: () => (
    <Card hue="leaf" emoji="🏠">
      <Entry state="paid" cents={89000} w="45%" />
      <span className="relative block rounded-[10px] overflow-hidden">
        <span className="absolute inset-y-0 start-0 w-16 bg-swipe-paid text-on-color flex items-center ps-3"><Check className="w-4 h-4" strokeWidth={3} /></span>
        <span className="relative block bg-surface translate-x-12 rtl:-translate-x-12"><Entry state="open" cents={6500} w="40%" /></span>
      </span>
      <Entry state="open" cents={4200} w="50%" />
    </Card>
  ),
  months: t => (
    <span className="block">
      <span className="flex items-center gap-2 mb-2">
        <span className="flex-1 inline-flex items-center gap-1 min-w-0 rounded-[8px] ring-2 ring-accent bg-accent-dim px-2 py-1"><span className="text-[13px] font-bold text-fg truncate">{new Date(2026, 10, 1).toLocaleDateString(t.locale, { month: 'long' })}</span><ChevronDown className="w-3.5 h-3.5 text-accent" strokeWidth={2.6} /></span>
        <span className="inline-flex rounded-full glass-chrome"><ChevronLeft className="w-6 h-6 p-1 text-fg rtl:rotate-180" /><ChevronRight className="w-6 h-6 p-1 text-fg rtl:rotate-180" /></span>
      </span>
      <span className="grid grid-cols-4 gap-1.5">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className={`rounded-[8px] px-1.5 py-1 text-center text-[10px] font-medium truncate ${i === 6 ? 'bg-accent-fill text-accent-fill-ink' : 'bg-surface-2 text-fg-mute'}`}>{new Date(2026, 4 + i, 1).toLocaleDateString(t.locale, { month: 'short' })}</span>
        ))}
      </span>
    </span>
  ),
  categories: () => (
    <span className="grid gap-1.5">
      <Card hue="leaf" emoji="🏠"><Entry cents={89000} w="40%" /><Entry state="open" cents={6500} w="55%" /></Card>
      <Card hue="carrot" emoji="🛒" folded />
      <Card hue="sky" emoji="🚗" folded />
    </span>
  ),
  search: () => (
    <span className="block">
      <span className="flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-surface card-edge ring-2 ring-accent mb-2"><Search className="w-3.5 h-3.5 text-fg-mute" strokeWidth={2.4} /><span dir="ltr" className="text-[12px] text-fg">#urlaub</span></span>
      <span className="block rounded-[12px] bg-surface card-edge py-1"><Entry cents={42000} w="45%" /><Entry cents={8900} w="60%" /></span>
    </span>
  ),
  due: () => (
    <span className="flex gap-2">
      {(['late', 'open', 'open'] as const).map((s, i) => (
        <span key={i} data-hue={['tomato', 'leaf', 'sky'][i]} className={`flex-1 rounded-[12px] bg-surface card-edge hue-tint p-2 ${i === 0 ? 'ring-2 ring-warn' : ''}`}>
          <span className="flex items-center gap-1.5 mb-1.5"><Tick state={s} /><span dir="ltr" className={`text-[11px] font-bold ${i === 0 ? 'text-warn' : 'text-fg'}`}>{[12, 15, 18][i]}.</span></span>
          <Bar w="80%" /><span className="block h-1" /><Money cents={[6500, 3999, 12000][i]} />
        </span>
      ))}
    </span>
  ),
  add: () => (
    <span className="block">
      <span className="block rounded-[12px] bg-surface card-edge p-2 mb-2 text-center">
        <span dir="ltr" className="block rounded-num text-[18px] font-semibold text-fg">− {formatMoney(1730, locale)}</span>
        <span dir="ltr" className="flex justify-center gap-1 mt-1">{['+', '−', '×', '÷'].map(k => <span key={k} className="w-7 h-6 rounded-[6px] bg-surface-2 text-[12px] font-semibold text-fg inline-flex items-center justify-center">{k}</span>)}</span>
      </span>
      <span className="flex items-center gap-2">
        <span className="flex-1 h-10 rounded-full glass-chrome flex items-center justify-around px-2">{[0, 1, 2, 3].map(i => <span key={i} className="w-5 h-1.5 rounded-full bg-fg/15" />)}</span>
        <span className="rounded-full ring-2 ring-accent ring-offset-2 ring-offset-bg"><Round icon={Plus} hero size="w-10 h-10" /></span>
      </span>
    </span>
  ),
  repeats: t => (
    <span className="flex gap-2 items-start">
      <span className="flex-1 grid gap-1.5 content-start">
        <span className="flex flex-wrap gap-1.5"><Pill icon={CalendarDays} label="12." /><Pill icon={Repeat} label={t.repeat} hot /></span>
        <Bar w="70%" dim />
      </span>
      <span className="w-[46%] rounded-[12px] bg-surface shadow-e2 card-edge p-1 grid">
        {[1, 2, 3].map(i => <span key={i} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-[8px] ${i === 1 ? 'bg-accent-dim' : ''}`}>{i === 1 ? <Check className="w-3 h-3 text-accent" strokeWidth={3} /> : <span className="w-3" />}<Bar w={`${70 - i * 10}%`} /></span>)}
      </span>
    </span>
  ),
  favorites: t => (
    <span className="block rounded-[12px] bg-surface card-edge p-2">
      <span className="flex gap-1.5 mb-2 flex-wrap">{['🥐', '⛽', '🍝'].map((e, i) => <span key={e} className={`h-7 ps-1.5 pe-2.5 rounded-full inline-flex items-center gap-1 ${i === 0 ? 'ring-2 ring-accent bg-accent-dim' : 'bg-surface-2'}`}><span className="emoji text-[12px]">{e}</span><Bar w="26px" /></span>)}</span>
      <span className="flex items-center justify-center gap-1.5 h-8 rounded-full bg-surface-2 text-[11px] font-semibold text-accent"><Star className="w-3.5 h-3.5" strokeWidth={2.4} /><span className="truncate">{t.pinFavorite}</span></span>
    </span>
  ),
  split: t => (
    <Row2>
      <span className="flex-1 rounded-[12px] bg-surface card-edge py-1"><Entry cents={4820} w="50%" /><span className="flex justify-center pb-1"><Pill icon={Split} label={t.splitPayAction} hot /></span></span>
      <Arrow />
      <span className="flex-1 grid gap-1.5">
        <span data-hue="carrot" className="block rounded-[10px] bg-surface card-edge hue-tint"><Entry cents={3510} w="45%" /></span>
        <span data-hue="lavender" className="block rounded-[10px] bg-surface card-edge hue-tint"><Entry cents={1310} w="40%" /></span>
      </span>
    </Row2>
  ),
  receipts: t => (
    <Row2>
      <span className="w-12 h-16 rounded-[6px] bg-surface card-edge p-1.5 grid content-start gap-1 -rotate-3 shrink-0"><Bar w="80%" /><Bar w="60%" dim /><Bar w="70%" dim /><span className="block h-1" /><Bar w="50%" /></span>
      <span className="flex flex-wrap gap-1.5 justify-center"><Pill icon={Paperclip} label={t.receipt} hot /><Pill icon={Hash} label={t.tag} hot /><Pill icon={Repeat} label={t.repeat} /></span>
    </Row2>
  ),
  capture: () => (
    <Row2>
      <span className="flex-1 rounded-[12px] bg-surface shadow-e2 card-edge p-2 flex items-center gap-2"><Round icon={Bell} size="w-7 h-7" /><span className="flex-1 grid gap-1"><Bar w="70%" /><Bar w="45%" dim /></span></span>
      <Arrow />
      <span className="flex-1 rounded-[12px] bg-surface card-edge py-1"><Entry cents={2340} w="55%" hot /></span>
    </Row2>
  ),
  budgets: t => (
    <Card hue="carrot" emoji="🛒">
      <span className="block px-2.5 pt-1 pb-1.5">
        <span className="flex justify-between items-baseline mb-1"><span className="text-[10px] font-semibold text-fg-mute truncate">{t.budgetsTitle}</span><Money cents={30000} /></span>
        <Meter p={0.62} />
        <span className="flex justify-end mt-1"><Money cents={11400} className="text-[10px] text-pos" /></span>
      </span>
    </Card>
  ),
  goals: () => (
    <Row2>
      <svg viewBox="0 0 44 44" className="w-14 h-14 -rotate-90 shrink-0"><circle cx="22" cy="22" r="18" fill="none" strokeWidth="6" className="stroke-fg/10" /><circle cx="22" cy="22" r="18" fill="none" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${0.65 * 113} 113`} className="stroke-accent" /></svg>
      <span className="flex-1 grid gap-1.5"><span className="flex items-center gap-1.5"><span className="emoji text-[15px]">🏖️</span><Bar w="50%" /></span><Meter p={0.65} /><Bar w="40%" dim /></span>
      <Round icon={PiggyBank} />
    </Row2>
  ),
  outlook: () => (
    <span className="block rounded-[12px] bg-surface card-edge p-2.5">
      <Line dashedFrom={0.3} />
      <span className="flex justify-between mt-1">{[0, 1, 2, 3, 4, 5].map(i => <span key={i} className="w-3 h-1 rounded-full bg-fg/10" />)}</span>
    </span>
  ),
  contracts: () => (
    <span className="block rounded-[12px] bg-surface card-edge py-1">
      {[0, 1, 2].map(i => (
        <span key={i} className={`flex items-center gap-2 px-2.5 py-1.5 ${i === 1 ? 'bg-accent-dim rounded-[10px] ring-2 ring-accent' : ''}`}>
          <ScrollText className="w-3.5 h-3.5 text-fg-mute shrink-0" strokeWidth={2.2} />
          <span className="flex-1 grid gap-1"><Bar w={`${60 - i * 8}%`} />{i === 1 && <span className="flex items-center gap-1 text-accent"><Bell className="w-3 h-3" strokeWidth={2.4} /><Bar w="40%" /></span>}</span>
          <Money cents={[1299, 3999, 899][i]} />
        </span>
      ))}
    </span>
  ),
  debts: () => (
    <Row2>
      <Round icon={HandCoins} />
      <span className="flex-1 grid gap-1.5"><Bar w="55%" /><Meter p={0.38} /><span className="flex justify-between"><Bar w="30%" dim /><Bar w="25%" dim /></span></span>
    </Row2>
  ),
  stats: () => (
    <span className="block rounded-[12px] bg-surface card-edge p-2.5">
      <span className="flex items-center gap-2.5 mb-2">
        <svg viewBox="0 0 44 44" className="w-10 h-10 -rotate-90 shrink-0"><circle cx="22" cy="22" r="17" fill="none" strokeWidth="6" className="stroke-fg/10" /><circle cx="22" cy="22" r="17" fill="none" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${0.33 * 107} 107`} className="stroke-accent" /></svg>
        <span className="flex-1 grid gap-1"><span dir="ltr" className="rounded-num text-[15px] font-bold text-fg">33 %</span><Bar w="60%" dim /></span>
      </span>
      <Columns />
    </span>
  ),
  reports: t => (
    <Row2>
      <span className="w-[58%] rounded-[8px] bg-surface card-edge p-2 grid gap-1.5"><Bar w="55%" /><Columns /><Bar w="80%" dim /></span>
      <Pill icon={Share} label={t.reportShare} hot />
    </Row2>
  ),
  bank: t => (
    <span className="block rounded-[12px] bg-surface shadow-e2 card-edge p-1 grid gap-0.5">
      <Item icon={Camera} label={t.importPhoto} hot />
      <Item icon={FileSpreadsheet} label={t.importCsv} hot />
      <Item icon={FileText} label={t.importPdf} hot />
      <Item icon={QrCode} label={t.scanInvoice} />
    </span>
  ),
  invoice: () => (
    <Row2>
      <span className="w-16 h-16 rounded-[10px] bg-surface card-edge ring-2 ring-accent inline-flex items-center justify-center shrink-0"><QrCode className="w-10 h-10 text-fg" strokeWidth={1.6} /></span>
      <Arrow />
      <span className="flex-1 rounded-[12px] bg-surface card-edge py-1"><Entry state="open" cents={18450} w="55%" /><span className="block px-2.5 pb-1"><Bar w="70%" dim /></span></span>
    </Row2>
  ),
  excel: () => (
    <Row2>
      <span className="grid grid-cols-4 gap-[2px] p-1.5 rounded-[8px] bg-surface card-edge shrink-0">{Array.from({ length: 16 }, (_, i) => <span key={i} className={`w-5 h-3 rounded-[2px] ${i < 4 ? 'bg-swipe-paid/70' : 'bg-fg/10'}`} />)}</span>
      <Arrow />
      <span className="flex-1 grid gap-1.5"><Card hue="leaf" emoji="🏠"><Entry cents={89000} w="45%" /></Card><Card hue="carrot" emoji="🛒" folded /></span>
    </Row2>
  ),
  reconcile: () => (
    <Row2>
      <span className="flex-1 rounded-[12px] bg-surface card-edge p-2 text-center"><span className="block emoji text-[14px]">🐷</span><Money cents={124050} className="text-[13px] text-fg-mute" /></span>
      <Round icon={Scale} />
      <span className="flex-1 rounded-[12px] bg-surface card-edge ring-2 ring-accent p-2 text-center"><span className="flex justify-center text-fg-mute"><Landmark className="w-4 h-4" strokeWidth={2.2} /></span><Money cents={123210} className="text-[13px] text-fg" /></span>
    </Row2>
  ),
  accounts: () => (
    <Row2>
      {['🏦', '💶', '🐷'].map((e, i) => (
        <span key={e} className="contents">
          {i === 1 && <Arrow />}
          <span className={`flex-1 rounded-[12px] bg-surface card-edge p-2 text-center ${i < 2 ? '' : 'opacity-70'}`}><span className="block emoji text-[15px]">{e}</span><Money cents={[124000, 8000, 250000][i]} /></span>
        </span>
      ))}
    </Row2>
  ),
  projects: () => (
    <Row2>
      <Round icon={Luggage} />
      <span className="flex-1 grid gap-1.5"><span className="flex justify-between"><Bar w="45%" /><Money cents={200000} /></span><Meter p={0.32} /><span className="flex items-center gap-1 text-fg-mute"><CalendarDays className="w-3 h-3" strokeWidth={2.4} /><Bar w="35%" dim /></span></span>
    </Row2>
  ),
  tax: t => (
    <span className="block">
      <span className="flex flex-wrap gap-1.5 mb-2"><Pill icon={Repeat} label={t.repeat} /><Pill icon={Landmark} label={t.taxPill} hot /></span>
      <span className="block rounded-[12px] bg-surface card-edge py-1">{[0, 1].map(i => <span key={i} className="flex items-center gap-2 px-2.5 py-1"><span className="flex-1"><Bar w={`${55 - i * 15}%`} /></span><Money cents={[45000, 12000][i]} /></span>)}</span>
    </span>
  ),
  monthStart: () => (
    <span className="grid grid-cols-7 gap-1">
      {[22, 23, 24, 25, 26, 27, 28].map(d => <span key={d} dir="ltr" className={`h-7 rounded-[8px] text-[11px] font-semibold inline-flex items-center justify-center ${d === 25 ? 'bg-accent-fill text-accent-fill-ink' : 'bg-surface-2 text-fg-mute'}`}>{d}</span>)}
    </span>
  ),
  private: () => (
    <Row2>
      <span className="relative w-12 h-16 rounded-[12px] border-2 border-fg/25 inline-flex items-center justify-center shrink-0"><ShieldCheck className="w-6 h-6 text-pos" strokeWidth={2.2} /></span>
      <span className="grid gap-1.5 justify-items-center text-fg-faint"><CloudOff className="w-6 h-6" strokeWidth={2} /></span>
    </Row2>
  ),
  backup: () => (
    <Row2>
      <span className="w-11 h-14 rounded-[8px] bg-surface card-edge inline-flex flex-col items-center justify-center gap-1 shrink-0"><FileText className="w-5 h-5 text-fg-mute" strokeWidth={2} /><Lock className="w-3.5 h-3.5 text-accent" strokeWidth={2.6} /></span>
      <Arrow />
      <span className="w-10 h-16 rounded-[10px] border-2 border-fg/25 inline-flex items-center justify-center shrink-0"><Download className="w-5 h-5 text-accent" strokeWidth={2.4} /></span>
    </Row2>
  ),
  lock: t => (
    <span className="block rounded-[12px] bg-surface card-edge">
      <span className="flex items-center gap-2 px-2.5 py-2 border-b border-fg/8"><EyeOff className="w-4 h-4 text-fg-mute" strokeWidth={2.2} /><span className="flex-1 text-[11px] font-medium text-fg truncate">{t.hideAmounts}</span><On /></span>
      <span className="flex items-center gap-2 px-2.5 py-2"><span dir="ltr" className="flex-1 rounded-num text-[15px] font-bold text-fg tracking-widest">•••• €</span><Eye className="w-4 h-4 text-accent" strokeWidth={2.2} /></span>
    </span>
  ),
  reminders: () => (
    <span className="block rounded-[14px] glass-chrome shadow-e2 p-2.5 flex items-center gap-2.5">
      <span className="w-8 h-8 rounded-[9px] hero text-on-hero inline-flex items-center justify-center shrink-0"><PiggyBank className="w-4 h-4" strokeWidth={2.3} /></span>
      <span className="flex-1 grid gap-1"><Bar w="45%" /><Bar w="75%" dim /></span>
      <Bell className="w-4 h-4 text-accent shrink-0" strokeWidth={2.4} />
    </span>
  ),
  look: () => (
    <span className="block">
      <span className="flex items-center gap-2 mb-2">
        <span className="inline-flex rounded-full bg-surface-2 p-0.5"><Sun className="w-6 h-6 p-1 rounded-full bg-surface text-fg" strokeWidth={2.2} /><Moon className="w-6 h-6 p-1 text-fg-mute" strokeWidth={2.2} /></span>
        <span className="flex-1"><Bar w="50%" /></span>
        <span className="text-[13px] font-semibold text-fg">Aa</span>
      </span>
      <span className="flex justify-between">{['blue', 'sky', 'mint', 'leaf', 'lemon', 'carrot', 'berry', 'plum'].map((h, i) => <span key={h} data-hue={h} className={`w-6 h-6 rounded-full bg-hue-chart ${i === 0 ? 'ring-2 ring-offset-2 ring-accent ring-offset-bg' : ''}`} />)}</span>
    </span>
  ),
};

/** The topic's picture, in its frame. */
export function GuideScene({ id, t }: { id: GuideTopicId; t: Strings }) {
  locale = t.locale;
  return (
    <div aria-hidden="true" className="mb-3 rounded-[16px] bg-bg card-edge px-3 py-3 overflow-hidden select-none">
      {SCENES[id](t)}
    </div>
  );
}

