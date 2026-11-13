import React, { useEffect, useId, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react';
import { CalendarCheck, Check, ChevronDown, ChevronRight, ChevronUp, Eye, EyeOff, PiggyBank, Wallet } from 'lucide-react';
import { MonthBalance } from '../logic';
import { dateAt, dayLabel, formatMoney, formatMoneyApprox, leftPerDay, monthKeyOf, monthLabel, monthLeft, monthSettled, spoken } from '../logic';
import { MonthTrack } from '../insights';
import { Strings, capitalize, fmt, plural } from '../translations';
import { tapLight } from '../ui/haptics';
import { useCountUp } from '../ui/useCountUp';
import { Menu } from '../ui/Menu';
import { CountingMoney } from '../ui/CountingMoney';
import { useWidth } from '../ui/useWidth';

interface Props {
  balance: MonthBalance;
  t: Strings;
  /** Opens the opening-balance sheet. Unset for "Alle Konten": an opening is one account's (plan 30). */
  onOpening?: () => void;
  /** The month's balance day by day (`monthTrack`): the line under the balance. None while nothing moves it. */
  track?: MonthTrack | null;
  /** Swiped sideways: one month on (1) or back (−1). */
  onSwipe?: (delta: 1 | -1) => void;
  /** When this month was last matched against the bank (ms epoch, plan 10). */
  reconciledAt?: number;
  /**
   * While amounts are hidden (plan 06): the eye beside "Kontostand jetzt",
   * which shows them for a while (`shown`) and hides them again.
   */
  peek?: { shown: boolean; onToggle: () => void };
  /**
   * Once the book has more than one account (plan 30): which one the card
   * shows, as a small switch above the balance ("🏦 Giro ▾"), and the others
   * — with "Alle Konten" — to switch to.
   */
  account?: AccountSwitch;
  /**
   * Folded (plan 39): the balance alone, with a slim "Mehr" row that opens
   * the rest: the line, the ring, the two panels and the workings. A new book
   * starts folded; the choice is kept (store).
   */
  open?: boolean;
  onOpen?: (open: boolean) => void;
  /**
   * The book knows what is on the account (`balanceGiven`). Without it the
   * card claims no balance: it says what the month spent, and asks for the
   * balance (`onBalanceNow`) — a coffee is not a negative account.
   */
  given?: boolean;
  onBalanceNow?: () => void;
}

export interface AccountSwitch {
  label: string;
  emoji: string;
  options: { id: string; label: string; emoji: string }[];
  selected: string;
  onSelect: (id: string) => void;
}

/** How far (px) or how fast (px/s) a swipe has to go to turn the month. */
const SWIPE_DISTANCE = 64;
const SWIPE_SPEED = 480;
/** Movement (px) that is still a tap. */
const SLOP = 10;

type Note = { text: string; tone: string };

/**
 * The card at the top of a month, on the accent's gradient (the hero): the
 * answers the app is opened for, and the workings behind them on demand.
 *
 * On top, big, what is on the account now (only what is ticked as paid), with
 * a ring for how many of the month's bills are paid. Under it the month as a
 * line: from what it opened with, through today — where the line stands at
 * that balance — and, dashed, on to the month's end through what is still
 * open. Then two frosted panels: the balance once everything pending is
 * settled ("Am Monatsende"), and what the month leaves over — for the
 * running month also per day until it ends. A row at the bottom opens the
 * details: the carry-over (tap it to correct the opening balance), then
 * income and expenses each as a meter — what is received or paid, solid, and
 * what is still expected or open, amber, with both amounts under it — and
 * the month's net, paid so far and with the pending entries settled.
 *
 * A month not started yet shows the balance it would open with and where
 * that comes from.
 *
 * With *Beträge verbergen* on, every amount reads "•••• €" (logic.ts) and an
 * eye beside the first caption shows them for a while.
 *
 * Folded (plan 39, how a new book starts) it is the balance alone, with a
 * slim "Mehr" row that opens everything above; a slim "Weniger" row at the
 * card's end folds it again. Before the book knows
 * a balance, the card says what the month spent and offers to enter one.
 *
 * Swiping the card sideways turns the month, as in Calendar: it follows the
 * finger, slides out, and the next month's comes in from the other side (the
 * figures run to their new values). The ‹ › in the bar do the same for
 * everyone else; the list below keeps its own swipes (paid, delete).
 */
export function BalanceCard({ balance: b, track, t, onOpening, onSwipe, reconciledAt, peek, account, open = true, onOpen, given = true, onBalanceNow }: Props) {
  const money = (c: number, sign: 'auto' | 'exceptZero' = 'auto') => formatMoney(c, t.locale, sign);
  /** What VoiceOver reads for an amount: the amount, or "Betrag verborgen". */
  const say = (text: string) => spoken(text, t.amountHidden);
  const [details, setDetails] = useState(false);
  const [accountMenu, setAccountMenu] = useState<HTMLElement | null>(null);
  const detailsId = useId();
  const swipe = useMonthSwipe(t.dir === 'rtl', onSwipe);
  const today = new Date();
  const running = b.key === monthKeyOf(today);
  const settled = monthSettled(b);
  const perDay = leftPerDay(settled.net, b.key, today);
  const anyOpen = b.incomeOpen !== 0 || b.expenseOpen !== 0;

  // What the end of the month still waits for.
  const endNote: Note = b.openCount
    ? { text: plural(b.openCount, t.endAfterOne, t.endAfterMany), tone: 'text-on-hero-warn' }
    : b.end !== b.now
      // Nothing open this month, but earlier months still have something.
      ? { text: t.afterPending, tone: 'text-on-hero-warn' }
      : { text: t.nothingOpen, tone: 'text-on-hero-soft' };
  const leftNote: Note | null = perDay !== null
    ? { text: fmt(t.perDay, { amount: formatMoneyApprox(perDay, t.locale) }), tone: 'text-on-hero' }
    : anyOpen ? { text: t.colSettled, tone: 'text-on-hero-soft' } : null;
  const net = settled.net;
  // The carry-over in a word, for the details row.
  const carryShort = b.overridden ? t.openingShort : b.prevKey ? t.carryShort : t.startingBalance;

  return (
    <motion.section className="hero hero-glow hero-art hero-shine rounded-lg overflow-hidden" aria-label={t.balanceNow} data-tour="balance" {...swipe}>
      <div className="ps-5 pe-4 pt-5 pb-4">
        {/* The ring grows with the text size; once the balance would be squeezed
            beside it (the basis is in rem), it moves under the balance. */}
        <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1 basis-[10rem]">
            {account && (
              <button
                type="button"
                aria-haspopup="menu"
                aria-label={fmt(t.accountSwitchLabel, { account: account.label })}
                onClick={e => { tapLight(); setAccountMenu(e.currentTarget); }}
                // A full tap target; the pill inside is what shows.
                className="-ms-1 -mt-2 max-w-full min-h-tap inline-flex items-center rounded-full active:opacity-60 transition-opacity focus-visible:ring-focus"
              >
                <span className="max-w-full min-h-[30px] ps-1.5 pe-2.5 rounded-full inline-flex items-center gap-1.5 bg-on-hero/15 text-label font-semibold text-on-hero">
                  <span className="emoji text-[15px]" aria-hidden="true">{account.emoji}</span>
                  <span className="min-w-0 truncate">{account.label}</span>
                  <ChevronDown className="w-4 h-4 shrink-0 text-on-hero-mute" strokeWidth={2.5} aria-hidden="true" />
                </span>
              </button>
            )}
            <div className="flex items-center gap-0.5">
              <p className="eyebrow text-on-hero-mute">{given ? t.balanceNow : t.spentThisMonth}</p>
              {peek && (
                <button
                  type="button"
                  onClick={() => { tapLight(); peek.onToggle(); }}
                  aria-label={peek.shown ? t.hideAmounts : t.showAmounts}
                  // Out of the line's height: the caption keeps its place.
                  className="shrink-0 -my-3 -ms-1.5 h-tap w-tap inline-flex items-center justify-center rounded-full text-on-hero-mute active:opacity-60 transition-opacity focus-visible:ring-focus"
                >
                  {peek.shown
                    ? <EyeOff className="w-[18px] h-[18px]" strokeWidth={2.25} aria-hidden="true" />
                    : <Eye className="w-[18px] h-[18px]" strokeWidth={2.25} aria-hidden="true" />}
                </button>
              )}
            </div>
            <BigMoney cents={given ? b.now : b.expensePaid} money={money} say={say} />
          </div>
          {open && b.expenseCount > 0 && (
            <PaidRing paid={b.expensePaidCount} total={b.expenseCount} caption={capitalize(t.paidState)} label={fmt(t.paidProgress, { paid: b.expensePaidCount, total: b.expenseCount })} />
          )}
        </div>
      </div>

      {b.started && !given ? (
        <>
          {b.incomePaid !== 0 && (
            <p className="ps-5 pe-4 -mt-2 pb-3 text-label text-on-hero-mute wrap-prose">
              {t.income} <span className="num font-semibold text-on-hero whitespace-nowrap">{money(b.incomePaid, 'exceptZero')}</span>
            </p>
          )}
          <div className="mx-2.5 mb-2.5 rounded-[22px] hero-panel overflow-hidden">
            {onBalanceNow && (
              <button
                type="button"
                onClick={() => { tapLight(); onBalanceNow(); }}
                className="w-full min-h-tap ps-3.5 pe-2.5 py-3 flex items-center gap-3 text-start active:opacity-60 transition-opacity focus-visible:ring-focus"
              >
                <Wallet className="w-5 h-5 shrink-0 text-on-hero-soft" strokeWidth={2.2} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-semibold text-on-hero wrap-compound">{t.noBalanceAsk}</span>
                  <span className="block text-caption text-on-hero-soft mt-0.5 wrap-prose">{t.noBalanceAskSub}</span>
                </span>
                <ChevronRight className="w-4 h-4 shrink-0 text-on-hero-soft rtl:rotate-180" strokeWidth={2.5} aria-hidden="true" />
              </button>
            )}
            {open && <Workings balance={b} t={t} money={money} />}
          </div>
        </>
      ) : b.started && !open ? (
        // Folded: the balance alone, and a slim row that opens the rest.
        <button
          type="button"
          aria-expanded={false}
          onClick={() => { tapLight(); onOpen?.(true); }}
          className="w-full min-h-tap -mt-3 ps-5 pe-4 pb-1 flex items-center justify-end gap-1 text-caption text-on-hero-mute active:opacity-60 transition-opacity focus-visible:ring-focus"
        >
          {t.more}
          <ChevronDown className="w-4 h-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
        </button>
      ) : b.started ? (
        <>
          {track && <MonthLine track={track} t={t} money={money} say={say} />}
          {/* The two answers. Side by side while both fit; a large amount or
              large text stacks them (the basis is in rem). */}
          <dl className="mx-2.5 flex flex-wrap gap-2">
            <Panel icon={CalendarCheck} label={t.balanceEnd} tone={b.end < 0 ? 'text-on-hero-neg' : 'text-on-hero'} note={endNote}>
              <span className="sr-only">{say(money(b.end))}</span>
              <span aria-hidden="true"><CountingMoney cents={b.end} money={money} /></span>
            </Panel>
            <Panel
              icon={PiggyBank}
              label={running ? t.leftOverNow : t.leftThisMonth}
              tone={net > 0 ? 'text-on-hero-pos' : net < 0 ? 'text-on-hero-neg' : 'text-on-hero-soft'}
              note={leftNote}
            >
              <span className="sr-only">{say(money(net, 'exceptZero'))}</span>
              <span aria-hidden="true"><CountingMoney cents={net} money={c => money(c, 'exceptZero')} /></span>
            </Panel>
          </dl>

          <button
            type="button"
            aria-expanded={details}
            aria-controls={detailsId}
            onClick={() => { tapLight(); setDetails(v => !v); }}
            className="w-full min-h-tap ps-5 pe-4 pt-3 pb-3.5 flex items-center gap-2 text-caption text-on-hero-mute text-start active:opacity-60 transition-opacity focus-visible:ring-focus"
          >
            <span className="min-w-0 flex-1 wrap-prose">
              {carryShort} <span className="num font-semibold text-on-hero whitespace-nowrap">{money(b.openingNow)}</span>
              {' · '}{t.detailsIncomeExpenses}
            </span>
            <ChevronDown
              className={`w-4 h-4 shrink-0 transition-transform duration-200 ${details ? 'rotate-180' : ''}`}
              strokeWidth={2.5}
              aria-hidden="true"
            />
          </button>

          {/* Appears in place (a fade, never a height animation). */}
          {details && (
            <motion.div
              id={detailsId}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              className="mx-2.5 mb-2.5 rounded-[22px] hero-panel overflow-hidden"
            >
              <CarryRow balance={b} t={t} money={money} onOpening={onOpening} />
              <Workings balance={b} t={t} money={money} />
              {b.transferPaid !== undefined && (b.transferPaid !== 0 || b.transferOpen !== 0) && (
                <p className="px-3.5 py-2 border-t border-on-hero/15 text-label text-on-hero-mute flex flex-wrap items-baseline gap-x-3">
                  <span className="wrap-prose">{t.transfers}</span>
                  <span className="ms-auto"><span className="block num font-semibold whitespace-nowrap text-on-hero">{money(b.transferPaid, 'exceptZero')}</span></span>
                  {!!b.transferOpen && (
                    <span className="basis-full text-caption font-medium text-on-hero-warn tabular-nums">{fmt(t.transfersOpen, { amount: money(b.transferOpen, 'exceptZero') })}</span>
                  )}
                </p>
              )}
              {reconciledAt && (
                <p className="px-4 py-2 text-caption text-on-hero-mute">
                  {fmt(t.reconciledOn, { date: new Date(reconciledAt).toLocaleDateString(t.locale, { day: 'numeric', month: 'short' }) })}
                </p>
              )}
            </motion.div>
          )}
          {/* Back to the balance and one row. */}
          {onOpen && (
            <button
              type="button"
              aria-expanded
              onClick={() => { tapLight(); onOpen(false); }}
              className="w-full min-h-tap -mt-2 ps-5 pe-4 pb-1 flex items-center justify-end gap-1 text-caption text-on-hero-mute active:opacity-60 transition-opacity focus-visible:ring-focus"
            >
              {t.less}
              <ChevronUp className="w-4 h-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
            </button>
          )}
        </>
      ) : (
        <div className="mx-2.5 mb-2.5 rounded-[22px] hero-panel overflow-hidden">
          <CarryRow balance={b} t={t} money={money} onOpening={onOpening} />
        </div>
      )}
      {account && (
        <Menu
          anchor={accountMenu}
          label={t.accountSwitch}
          groups={[account.options.map(o => ({
            key: o.id, label: `${o.emoji} ${o.label}`, icon: o.id === account.selected ? Check : undefined, onSelect: () => account.onSelect(o.id),
          }))]}
          onClose={() => setAccountMenu(null)}
        />
      )}
    </motion.section>
  );
}

/**
 * The card's sideways swipe, as props for a motion element. Touch and pen
 * only: a mouse selects and clicks as usual and has ‹ › for the months.
 *
 * Nothing is taken over until the finger has clearly gone sideways (more
 * than SLOP, and more sideways than down): until then a tap stays a tap for
 * whatever is under it, and a vertical move stays the page's scroll
 * (touch-action: pan-y). From there the card follows the finger 1:1 and has
 * the pointer to itself, so the click that ends a swipe never reaches a
 * button inside.
 */
function useMonthSwipe(rtl: boolean, onSwipe?: (delta: 1 | -1) => void) {
  const x = useMotionValue(0);
  const reduced = useReducedMotion();
  const g = useRef<{ id: number; x0: number; y0: number; on: boolean; last: { x: number; t: number }[] } | null>(null);
  const swallow = useRef(false);
  // Once the card has the finger, its touchmoves are the page's own: the
  // browser starts no pan of its own, so none flings on afterwards (Chromium
  // would swallow the next tap to stop it). A native listener, as React's are
  // passive — and only while a swipe runs, so scrolling never waits for it.
  const hold = useRef((e: TouchEvent) => { if (e.cancelable) e.preventDefault(); }).current;
  const release = () => document.removeEventListener('touchmove', hold);
  useEffect(() => release, []);
  if (!onSwipe) return {};

  const settle = (dx: number, speed: number) => {
    const turn = Math.abs(dx) > SWIPE_DISTANCE || (Math.abs(speed) > SWIPE_SPEED && Math.sign(speed) === Math.sign(dx));
    if (!turn) {
      animate(x, 0, { type: 'spring', duration: 0.35, bounce: 0.2 });
      return;
    }
    // Leftwards is later in German, earlier in Arabic (the months run right to left).
    const delta: 1 | -1 = (dx < 0) !== rtl ? 1 : -1;
    tapLight();
    if (reduced) { x.set(0); onSwipe(delta); return; }
    const out = Math.sign(dx) * window.innerWidth;
    void animate(x, out, { duration: 0.16, ease: [0.4, 0, 1, 1] }).then(() => {
      onSwipe(delta);
      x.set(-out * 0.35);
      animate(x, 0, { type: 'spring', duration: 0.4, bounce: 0 });
    });
  };

  return {
    style: { x, touchAction: 'pan-y' },
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse' || g.current) return;
      g.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, on: false, last: [{ x: e.clientX, t: e.timeStamp }] };
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const s = g.current;
      if (!s || e.pointerId !== s.id) return;
      const dx = e.clientX - s.x0;
      const dy = e.clientY - s.y0;
      if (!s.on) {
        if (Math.abs(dy) > SLOP && Math.abs(dy) >= Math.abs(dx)) { g.current = null; return; } // a scroll
        if (Math.abs(dx) <= SLOP || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        s.on = true;
        swallow.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        document.addEventListener('touchmove', hold, { passive: false });
      }
      x.set(dx);
      s.last = [...s.last.slice(-4), { x: e.clientX, t: e.timeStamp }];
    },
    onPointerUp: (e: React.PointerEvent) => {
      const s = g.current;
      if (!s || e.pointerId !== s.id) return;
      g.current = null;
      if (!s.on) return;
      release();
      // The click that follows is the swipe's, not a tap's.
      window.setTimeout(() => { swallow.current = false; }, 0);
      const first = s.last[0];
      const dt = Math.max(1, e.timeStamp - first.t);
      settle(e.clientX - s.x0, ((e.clientX - first.x) / dt) * 1000);
    },
    onPointerCancel: (e: React.PointerEvent) => {
      const s = g.current;
      if (!s || e.pointerId !== s.id) return;
      g.current = null;
      swallow.current = false;
      release();
      if (s.on) animate(x, 0, { type: 'spring', duration: 0.35, bounce: 0.2 });
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (swallow.current) { e.preventDefault(); e.stopPropagation(); }
    },
  };
}

/** One of the two answers: a caption, the amount, and a line about it. */
function Panel({ icon: Icon, label, tone, note, children }: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  tone: string;
  note: Note | null;
  children: React.ReactNode;
}) {
  return (
    // No min-w-0: an amount wider than the basis widens its panel, and the
    // two stack instead of the figure running out of its frame.
    <div className="flex-1 basis-[9.5rem] rounded-[22px] hero-panel ps-3.5 pe-2.5 pt-3 pb-2.5">
      <dt className="flex items-start gap-1.5 text-caption font-medium text-on-hero-soft">
        <Icon className="w-[15px] h-[15px] shrink-0 mt-[1.5px]" strokeWidth={2.2} aria-hidden="true" />
        <span className="min-w-0 wrap-prose">{label}</span>
      </dt>
      <dd className={`rounded-num text-heading font-bold whitespace-nowrap mt-1 ${tone}`}>{children}</dd>
      {note && <dd className={`text-caption font-medium wrap-prose ${note.tone}`}>{note.text}</dd>}
    </div>
  );
}

/** Where the month started from; tap to correct it (the opening-balance sheet). */
function CarryRow({ balance: b, t, money, onOpening }: {
  balance: MonthBalance;
  t: Strings;
  money: (c: number) => string;
  onOpening?: () => void;
}) {
  // Open bills of earlier months still to settle.
  const carryOpen = b.openingEnd - b.openingNow;
  const label = b.overridden
    ? t.carryManual
    : b.prevKey
      ? fmt(t.carryFrom, { month: b.prevKey.slice(0, 4) === b.key.slice(0, 4)
        // Same year: the month's name says it all ("aus Oktober").
        ? new Intl.DateTimeFormat(t.locale, { month: 'long' }).format(new Date(Number(b.prevKey.slice(0, 4)), Number(b.prevKey.slice(5, 7)) - 1, 1))
        : monthLabel(b.prevKey, t.locale, 'long') })
      : t.startingBalance;
  const body = (
    <>
      {/* The amount wraps under the label when both don't fit (large text). */}
      <span className="min-w-0 flex-1 flex flex-wrap items-baseline gap-x-3">
        <span className="text-label text-on-hero-soft wrap-prose">{label}</span>
        {/* The margin sits on a wrapper: `num` turns its own box left to right, which would flip "ms-auto" in Arabic. */}
        <span className="ms-auto">
          {/* A block, so `num`'s direction holds (an inline one would set the € the Arabic sentence way). */}
          <span className={`block text-label num font-semibold whitespace-nowrap ${b.openingNow < 0 ? 'text-on-hero-neg' : 'text-on-hero'}`}>{money(b.openingNow)}</span>
        </span>
        {carryOpen !== 0 && (
          <span className="basis-full text-caption font-medium text-on-hero-warn tabular-nums">{fmt(t.inclOpen, { amount: money(carryOpen) })}</span>
        )}
      </span>
      {onOpening && <ChevronRight className="w-4 h-4 shrink-0 text-on-hero-soft rtl:rotate-180" strokeWidth={2.5} aria-hidden="true" />}
    </>
  );
  // "Alle Konten" (plan 30): only what it adds up to — an opening is set per account.
  if (!onOpening) return <div className="w-full min-h-tap ps-3.5 pe-2.5 py-2 flex items-center gap-2">{body}</div>;
  return (
    <button
      type="button"
      onClick={() => { tapLight(); onOpening(); }}
      className="w-full min-h-tap ps-3.5 pe-2.5 py-2 flex items-center gap-2 text-start active:opacity-60 transition-opacity focus-visible:ring-focus"
    >
      {body}
    </button>
  );
}

/** Height of the month's line (px): a strip, not a chart with axes. */
const LINE_H = 54;

/**
 * The month as a line on the hero, under the balance: stepped, since a
 * balance moves on the day something is booked. Solid up to today — the dot,
 * which stands at *Jetzt auf dem Konto* and pulses twice when it appears —
 * dashed from there to the month's end, a hollow point (the vocabulary of
 * every chart: dashed is what lies ahead). A finished month is all solid, a
 * month ahead all dashed. No axis: the figures are the card's own, so the
 * line is one image for VoiceOver, naming start, today and end. It is drawn
 * from the left once per month; the card's swipe keeps the finger, so the
 * line is not scrubbed. Time runs left to right in Arabic too.
 */
function MonthLine({ track, t, money, say }: { track: MonthTrack; t: Strings; money: (c: number) => string; say: (text: string) => string }) {
  const box = useRef<HTMLDivElement>(null);
  const width = useWidth(box);
  const reduce = useReducedMotion();
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const { values, today } = track;
  const last = values.length - 1;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = 7;
  const x = (i: number) => pad + (i / last) * Math.max(1, width - 2 * pad);
  const y = (v: number) => (hi === lo ? LINE_H / 2 : pad + (1 - (v - lo) / (hi - lo)) * (LINE_H - 2 * pad));
  const at = (i: number) => `${x(i).toFixed(1)},${y(values[i]).toFixed(1)}`;
  const steps = (from: number, to: number) => {
    let d = `M${at(from)}`;
    for (let i = from + 1; i <= to; i++) d += `H${x(i).toFixed(1)}V${y(values[i]).toFixed(1)}`;
    return d;
  };
  const running = today > 0 && today < last;
  const day = (i: number) => dayLabel(dateAt(track.month, i), t.locale);
  const share = today / last;
  const label = [
    `${day(1)}: ${money(values[0])}`,
    running ? `${t.paceToday}: ${money(values[today])}` : null,
    `${day(last)}: ${money(values[last])}`,
  ].filter(Boolean).join(', ');
  return (
    <div ref={box} dir="ltr" className="mx-5 -mt-1 mb-3" role="img" aria-label={say(label)}>
      <svg key={track.month} width={width} height={LINE_H} className="block overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-wash`} x1={0} x2={0} y1={0} y2={1} className="text-on-hero">
            <stop offset="0" stopColor="currentColor" stopOpacity={0.2} />
            <stop offset="1" stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
          {/* Wider than the plot, so the dots and today's halo at its edges are drawn whole. */}
          <clipPath id={`${id}-draw`}>
            {reduce
              ? <rect x={-14} y={-14} width={width + 28} height={LINE_H + 28} />
              : <motion.rect x={-14} y={-14} height={LINE_H + 28} initial={{ width: 0 }} animate={{ width: width + 28 }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }} />}
          </clipPath>
        </defs>
        <g clipPath={`url(#${id}-draw)`}>
          <path d={`${steps(0, last)}V${LINE_H}H${x(0).toFixed(1)}Z`} fill={`url(#${id}-wash)`} />
          {lo < 0 && hi > 0 && <line x1={x(0)} x2={x(last)} y1={y(0)} y2={y(0)} className="stroke-on-hero" strokeOpacity={0.4} strokeWidth={1} strokeDasharray="2 4" />}
          {today > 0 && <path d={steps(0, today)} fill="none" className="stroke-on-hero" strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />}
          {today < last && <path d={steps(today, last)} fill="none" className="stroke-on-hero" strokeOpacity={0.8} strokeWidth={2} strokeDasharray="4 4" strokeLinejoin="round" strokeLinecap="round" />}
          {today !== 0 && <circle cx={x(0)} cy={y(values[0])} r={3} className="fill-on-hero" opacity={0.75} />}
          {today < last && <circle cx={x(last)} cy={y(values[last])} r={4} strokeWidth={2} className="stroke-on-hero" fill="none" />}
          {today > 0 && (
            <>
              <circle cx={x(today)} cy={y(values[today])} r={9} className="chart-pulse fill-on-hero" opacity={0.24}
                style={{ transformOrigin: `${x(today)}px ${y(values[today])}px` }} />
              <circle cx={x(today)} cy={y(values[today])} r={4.5} className="fill-on-hero" />
            </>
          )}
        </g>
      </svg>
      {/* The days under the line: where it starts and ends, and today when it is far enough from both. */}
      <div className="relative mt-1 h-[0.8125rem] text-micro text-on-hero-mute tabular-nums" aria-hidden="true">
        {(!running || share > 0.22) && <span className="absolute left-0">{day(1)}</span>}
        {running && (
          <span
            className="absolute font-semibold text-on-hero whitespace-nowrap"
            style={share < 0.12 ? { left: 0 } : share > 0.88 ? { right: 0 } : { left: x(today), transform: 'translateX(-50%)' }}
          >
            {t.paceToday}
          </span>
        )}
        {(!running || share < 0.78) && <span className="absolute right-0">{day(last)}</span>}
      </div>
    </div>
  );
}

/**
 * Income and expenses, each as a meter: what is received or paid so far,
 * solid, and what is still expected or open, amber — amber means "open"
 * everywhere — against the whole, which is written beside the name; both
 * amounts with their word under the bar. Then the month's net: paid so far,
 * and with the pending entries settled (only while anything is pending).
 * Everything wraps by itself when large text or long amounts don't fit side
 * by side. The bars run out when the details open.
 */
function Workings({ balance: b, t, money }: { balance: MonthBalance; t: Strings; money: (c: number, sign?: 'auto' | 'exceptZero') => string }) {
  const left = monthLeft(b);
  const settled = monthSettled(b);
  const anyOpen = b.incomeOpen !== 0 || b.expenseOpen !== 0;
  const rows = [
    {
      label: t.income, total: money(settled.income, 'exceptZero'), paid: b.incomePaid, open: b.incomeOpen,
      paidLabel: capitalize(t.receivedState), openLabel: capitalize(t.expected), fill: 'bg-on-hero-pos', ink: 'text-on-hero-pos',
    },
    {
      label: t.expenses, total: money(settled.expense ? -settled.expense : 0), paid: b.expensePaid, open: b.expenseOpen,
      paidLabel: capitalize(t.paidState), openLabel: capitalize(t.open), fill: 'bg-on-hero', ink: 'text-on-hero',
    },
  ];
  // A label and its amount as one unit; the amount is its own box, so its direction holds in Arabic.
  const pair = (label: string, amount: string, tone: string) => (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
      <span className="text-on-hero-soft">{label}</span>
      <span className={`num font-semibold whitespace-nowrap ${tone}`}>{amount}</span>
    </span>
  );
  return (
    <div className="border-t border-on-hero/15">
      <dl>
        {rows.map(r => {
          const whole = Math.max(0, r.paid) + Math.max(0, r.open);
          const share = (c: number) => `${whole > 0 ? (Math.max(0, c) / whole) * 100 : 0}%`;
          const spring = { type: 'spring' as const, duration: 0.6, bounce: 0 };
          return (
            <div key={r.label} className="px-3.5 pt-2.5 pb-2">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <dt className="text-label text-on-hero-mute wrap-prose">{r.label}</dt>
                <dd className="ms-auto"><span className="block text-label num font-semibold whitespace-nowrap text-on-hero">{r.total}</span></dd>
              </div>
              <dd>
                <span className="mt-1.5 h-[7px] rounded-full bg-on-hero/15 overflow-hidden flex gap-[2px]" aria-hidden="true">
                  <motion.span className={`h-full rounded-full ${r.fill}`} initial={{ width: 0 }} animate={{ width: share(r.paid) }} transition={spring} />
                  <motion.span className="h-full rounded-full bg-on-hero-warn opacity-75" initial={{ width: 0 }} animate={{ width: share(r.open) }} transition={{ ...spring, delay: 0.08 }} />
                </span>
                <span className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-caption">
                  {pair(r.paidLabel, money(r.paid), r.paid ? r.ink : 'text-on-hero-soft')}
                  {r.open !== 0 && pair(r.openLabel, money(r.open), 'text-on-hero-warn')}
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
      <div className="border-t border-on-hero/15 px-3.5 pt-2.5 pb-3">
        <p className="text-label font-semibold text-on-hero wrap-prose">{t.leftThisMonth}</p>
        <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1.5">
          <div className="flex-1 basis-[7.5rem]">
            <dt className="text-caption font-medium text-on-hero-soft wrap-prose">{t.colPaid}</dt>
            <dd className={`text-label num font-bold whitespace-nowrap ${left.paid > 0 ? 'text-on-hero-pos' : left.paid < 0 ? 'text-on-hero-neg' : 'text-on-hero-soft'}`}>{money(left.paid, 'exceptZero')}</dd>
          </div>
          {anyOpen && (
            <div className="flex-1 basis-[7.5rem]">
              <dt className="text-caption font-medium text-on-hero-soft wrap-prose">{t.colSettled}</dt>
              <dd className={`text-label num font-bold whitespace-nowrap ${left.open ? 'text-on-hero-warn' : 'text-on-hero-soft'}`}>{money(settled.net, 'exceptZero')}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

/**
 * The balance, as large as it fits: the figure in SF Rounded, the currency
 * sign smaller and quieter beside it ("35.773,20 €", "€35,773.20"). It runs
 * to a new value rather than jumping; VoiceOver reads only the final one.
 */
function BigMoney({ cents, money, say }: { cents: number; money: (c: number) => string; say: (text: string) => string }) {
  const text = money(useCountUp(cents));
  // The figure — or the "••••" that stands for it while amounts are hidden (plan 06).
  const m = /^([^\d−•-]*?)\s*([−-]?[\d.,\u00a0\u202f]*\d|•+)\s*([^\d•]*)$/.exec(text);
  const [before, figure, after] = m ? [m[1], m[2], m[3]] : ['', text, ''];
  const sign = 'text-[0.6em] font-semibold text-on-hero-mute';
  return (
    <p className="rounded-num font-extrabold mt-1.5 text-[clamp(34px,11vw,46px)] leading-[1.06] tracking-[-0.02em] wrap-prose text-on-hero">
      <span className="sr-only">{say(money(cents))}</span>
      <span aria-hidden="true">
        {before && <span className={`${sign} me-1`}>{before}</span>}
        {figure}
        {after && <span className={`${sign} ms-1`}>{after}</span>}
      </span>
    </p>
  );
}

/** Apple-Fitness-style ring: how many of the month's bills are paid. */
function PaidRing({ paid, total, label, caption }: { paid: number; total: number; label: string; /** One word under the ring: what the count is of. */ caption: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const ratio = total ? paid / total : 0;
  // "14/18" while it fits the ring; past five characters the share instead,
  // never smaller than a caption. The ring grows with Dynamic Type (rem).
  const count = `${paid}/${total}`;
  const text = count.length <= 5 ? count : `${Math.round(ratio * 100)}%`;
  return (
    <div className="shrink-0 ms-auto flex flex-col items-center gap-1">
    <div
      className="relative w-[3.75rem] h-[3.75rem]"
      role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={paid} aria-label={label} title={label}
    >
      <svg viewBox="0 0 60 60" className="w-full h-full -rotate-90" aria-hidden="true">
        <circle cx="30" cy="30" r={r} fill="none" strokeWidth="6.5" className="stroke-on-hero/20" />
        <motion.circle
          cx="30" cy="30" r={r} fill="none" strokeWidth="6.5" strokeLinecap="round"
          className="stroke-on-hero"
          style={{ opacity: ratio > 0 ? 1 : 0 }}
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - ratio) }}
          transition={{ type: 'spring', duration: 0.6, bounce: 0 }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center rounded-num font-bold text-on-hero text-caption tracking-[-0.03em]" aria-hidden="true">
        {text}
      </span>
    </div>
    <span className="text-micro font-medium text-on-hero-mute" aria-hidden="true">{caption}</span>
    </div>
  );
}
