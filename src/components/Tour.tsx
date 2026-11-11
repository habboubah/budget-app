import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Strings, fmt } from '../translations';
import { TOUR_TEXT, TourStep, guideText, tourAnchor, tourCardPlace } from '../guide';
import type { GuidePages } from '../guidePages';
import { Button } from '../ui/Button';
import { tapLight } from '../ui/haptics';
import { useDialog } from '../ui/useDialog';

/** Room left around a mark, and the mark's corners: the balance card's are large, the round things stay round. */
const PAD = 4;
const RADIUS: Record<TourStep, number> = { balance: 36, tick: 18, month: 18, tabs: 999, add: 999 };
/** The marks that scroll with the page are brought into view first; the tab bar's never move. */
const AT_TOP: TourStep[] = ['balance', 'month'];

interface Box { top: number; left: number; width: number; height: number }

interface Props {
  steps: TourStep[];
  index: number;
  t: Strings;
  /** The tour's sentences in the app's language (src/i18n/guide/). */
  pages: GuidePages;
  onNext: () => void;
  /** Ended early, or done. */
  onEnd: () => void;
  /** The last step is the add button: the tour can end on the first entry. */
  onAdd?: () => void;
}

/**
 * The short tour (src/guide.ts): the real month page with one thing marked at
 * a time — everything else steps back — and a card beside it with a sentence,
 * *Weiter* and a way out on every step. Only ever started by hand. A dialog
 * for VoiceOver and the keyboard: its card holds the focus, Escape (and
 * Android's back) ends it. The page behind can't be tapped or scrolled.
 */
export function Tour({ steps, index, t, pages, onNext, onEnd, onAdd }: Props) {
  const step = steps[index];
  const last = index === steps.length - 1;
  const card = useRef<HTMLDivElement>(null);
  const insets = useRef<HTMLDivElement>(null);
  const [mark, setMark] = useState<Box | null>(null);
  const [cardTop, setCardTop] = useState<number | null>(null);
  useDialog(true, card, onEnd);

  // Find the mark; again while the page settles (its cards rise in), and
  // whenever the window changes.
  useLayoutEffect(() => {
    const el = tourAnchor(step);
    if (!el) { setMark(null); return; }
    if (AT_TOP.includes(step)) window.scrollTo(0, 0);
    else if (step === 'tick') el.scrollIntoView({ block: 'center' });
    const measure = () => {
      const r = el.getBoundingClientRect();
      const top = Math.max(0, r.top - PAD);
      const bottom = Math.min(window.innerHeight, r.bottom + PAD);
      const left = Math.max(0, r.left - PAD);
      const right = Math.min(window.innerWidth, r.right + PAD);
      setMark(m => (m && m.top === top && m.left === left && m.width === right - left && m.height === bottom - top
        ? m : { top, left, width: right - left, height: bottom - top }));
    };
    measure();
    const timers = [120, 300, 600, 1000].map(ms => window.setTimeout(measure, ms));
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    return () => {
      timers.forEach(id => window.clearTimeout(id));
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
    };
  }, [step]);

  // The card: under the mark, else above it, clear of the notch and the home indicator.
  useLayoutEffect(() => {
    const el = card.current;
    if (!el || !mark) return;
    const safe = insets.current ? getComputedStyle(insets.current) : null;
    setCardTop(tourCardPlace(
      { top: mark.top, bottom: mark.top + mark.height },
      el.offsetHeight,
      { height: window.innerHeight, top: safe ? parseFloat(safe.paddingTop) || 0 : 0, bottom: safe ? parseFloat(safe.paddingBottom) || 0 : 0 },
    ).top);
  }, [mark, step, t]);

  // Each step is read out: the card takes the focus as it changes.
  useEffect(() => { card.current?.focus({ preventScroll: true }); }, [step]);

  if (!step) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70]" data-tour-open={step}>
      <div ref={insets} className="fixed inset-x-0 top-0 h-0 safe-top safe-bottom box-content invisible" aria-hidden="true" />
      {/* Nothing behind the tour answers a tap. */}
      <div className="absolute inset-0" aria-hidden="true" onClick={e => e.stopPropagation()} />
      {mark ? (
        <div
          aria-hidden="true"
          className="fixed pointer-events-none tour-mark"
          style={{ top: mark.top, left: mark.left, width: mark.width, height: mark.height, borderRadius: Math.min(RADIUS[step], mark.height / 2) }}
        />
      ) : <div className="absolute inset-0 scrim" aria-hidden="true" />}
      <motion.div
        ref={card}
        key={step}
        role="dialog"
        aria-modal="true"
        aria-label={`${t.guideTourTitle}, ${fmt(t.tourStep, { n: index + 1, total: steps.length })}`}
        tabIndex={-1}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: cardTop === null ? 0 : 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-[16px] mx-auto max-w-sm rounded-md bg-surface shadow-e2 p-4 outline-none"
        style={{ top: cardTop ?? 0 }}
      >
        <div className="flex items-center gap-3">
          <p className="eyebrow text-fg-mute tabular-nums">{fmt(t.tourStep, { n: index + 1, total: steps.length })}</p>
          <span className="ms-auto flex items-center gap-1.5" aria-hidden="true">
            {steps.map((s, i) => (
              <span key={s} className={`h-1.5 rounded-full transition-[width,background-color] duration-200 ${i === index ? 'w-4 bg-accent-fill' : i < index ? 'w-1.5 bg-accent-fill' : 'w-1.5 bg-fg/15'}`} />
            ))}
          </span>
        </div>
        <p className="mt-2 text-body text-fg wrap-prose">{guideText({ ...t, ...pages }, TOUR_TEXT[step])}</p>
        <div className="mt-3 -mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {(!last || (step === 'add' && onAdd)) && (
            <button
              type="button"
              onClick={() => { tapLight(); onEnd(); }}
              className="-ms-2 px-2 min-h-tap min-w-[44px] inline-flex items-center justify-center text-body font-semibold text-accent rounded-sm active:opacity-60 focus-visible:ring-focus"
            >
              {last ? t.done : t.tourEnd}
            </button>
          )}
          <span className="ms-auto">
            {!last ? <Button onClick={onNext}>{t.tourNext}</Button>
              : step === 'add' && onAdd ? <Button onClick={onAdd}>{t.addEntry}</Button>
              : <Button onClick={onEnd}>{t.done}</Button>}
          </span>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
