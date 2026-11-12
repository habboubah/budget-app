import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Strings, fmt } from '../translations';
import { MARKS, MarkId, tourAnchor, tourCardPlace } from '../guide';
import { Button } from '../ui/Button';
import { tapLight } from '../ui/haptics';
import { useDialog } from '../ui/useDialog';

/** Room left around a mark. */
const PAD = 4;

interface Box { top: number; left: number; width: number; height: number }

interface Props {
  /** The marks, in order, and each one's sentence (its labels filled in). */
  marks: MarkId[];
  texts: string[];
  index: number;
  t: Strings;
  /** The tour's name (read out with the step), or the topic *Zeigen* is about. */
  label: string;
  /** *Zeigen*'s single mark: the topic's title stands over the sentence, in place of "2 von 5". */
  point?: boolean;
  onNext: () => void;
  /** Ended early, or done. */
  onEnd: () => void;
  /** The last step's own button, in place of *Fertig*: the month page's tour ends on *Eintrag hinzufügen*. */
  final?: { label: string; run: () => void };
  /** Begun in the guide: the last step leads back to it. */
  onGuide?: () => void;
}

/**
 * A tour (src/guide.ts), or what *Zeigen* points at: the real screen with one
 * thing marked at a time — everything else steps back — and a card beside it
 * with a sentence, *Weiter* and a way out on every step. A dialog for
 * VoiceOver and the keyboard: its card holds the focus, Escape (and Android's
 * back) ends it. The screen behind can't be tapped or scrolled.
 */
export function Tour({ marks, texts, index, t, label, point, onNext, onEnd, final, onGuide }: Props) {
  const mark = marks[index];
  const last = index === marks.length - 1;
  const card = useRef<HTMLDivElement>(null);
  const insets = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [cardTop, setCardTop] = useState<number | null>(null);
  useDialog(true, card, onEnd);

  // Find the mark; again while the screen settles (cards rise in, a sheet
  // slides up), and whenever the window, the keyboard or a scroller moves.
  useLayoutEffect(() => {
    const el = tourAnchor(mark);
    if (!el) { setBox(null); return; }
    const { scroll } = MARKS[mark];
    if (scroll === 'top') window.scrollTo(0, 0);
    else if (scroll === 'center') el.scrollIntoView({ block: 'center' });
    const measure = () => {
      const r = el.getBoundingClientRect();
      const top = Math.max(0, r.top - PAD);
      const bottom = Math.min(window.innerHeight, r.bottom + PAD);
      const left = Math.max(0, r.left - PAD);
      const right = Math.min(window.innerWidth, r.right + PAD);
      setBox(m => (m && m.top === top && m.left === left && m.width === right - left && m.height === bottom - top
        ? m : { top, left, width: right - left, height: bottom - top }));
    };
    measure();
    const timers = [120, 300, 600, 1000].map(ms => window.setTimeout(measure, ms));
    const vv = window.visualViewport;
    window.addEventListener('resize', measure);
    vv?.addEventListener('resize', measure);
    // Capturing: a sheet scrolls inside itself, not the window.
    window.addEventListener('scroll', measure, { passive: true, capture: true });
    return () => {
      timers.forEach(id => window.clearTimeout(id));
      window.removeEventListener('resize', measure);
      vv?.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, { capture: true });
    };
  }, [mark]);

  // The card: under the mark, else above it, clear of the notch and the home indicator.
  useLayoutEffect(() => {
    const el = card.current;
    if (!el || !box) return;
    const safe = insets.current ? getComputedStyle(insets.current) : null;
    setCardTop(tourCardPlace(
      { top: box.top, bottom: box.top + box.height },
      el.offsetHeight,
      { height: window.innerHeight, top: safe ? parseFloat(safe.paddingTop) || 0 : 0, bottom: safe ? parseFloat(safe.paddingBottom) || 0 : 0 },
    ).top);
  }, [box, mark, t]);

  // Each step is read out: the card takes the focus as it changes.
  useEffect(() => { card.current?.focus({ preventScroll: true }); }, [mark]);

  if (!mark) return null;
  const count = fmt(t.tourStep, { n: index + 1, total: marks.length });
  const quiet = '-ms-2 px-2 min-h-tap min-w-[44px] inline-flex items-center justify-center text-body font-semibold text-accent rounded-sm active:opacity-60 focus-visible:ring-focus wrap-compound text-start';
  // On the last step the way out is the way back to the guide (when it came from there); before it, ending the tour.
  const leave = !last ? { label: t.tourEnd, run: onEnd } : onGuide ? { label: t.guideBack, run: onGuide } : final ? { label: t.done, run: onEnd } : null;
  return createPortal(
    <div className="fixed inset-0 z-[70]" data-tour-open={mark}>
      <div ref={insets} className="fixed inset-x-0 top-0 h-0 safe-top safe-bottom box-content invisible" aria-hidden="true" />
      {/* Nothing behind the tour answers a tap. */}
      <div className="absolute inset-0" aria-hidden="true" onClick={e => e.stopPropagation()} />
      {box ? (
        <div
          aria-hidden="true"
          className="fixed pointer-events-none tour-mark"
          style={{ top: box.top, left: box.left, width: box.width, height: box.height, borderRadius: Math.min(MARKS[mark].radius, box.height / 2) }}
        />
      ) : <div className="absolute inset-0 scrim" aria-hidden="true" />}
      <motion.div
        ref={card}
        key={mark}
        role="dialog"
        aria-modal="true"
        aria-label={point ? label : `${label}, ${count}`}
        tabIndex={-1}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: cardTop === null ? 0 : 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-[16px] mx-auto max-w-sm rounded-md bg-surface shadow-e2 p-4 outline-none"
        style={{ top: cardTop ?? 0 }}
      >
        {point ? (
          <p className="text-body font-semibold text-fg wrap-compound">{label}</p>
        ) : (
          <div className="flex items-center gap-3">
            <p className="eyebrow text-fg-mute tabular-nums min-w-0 wrap-compound">{label} · {count}</p>
            <span className="ms-auto flex items-center gap-1.5 shrink-0" aria-hidden="true">
              {marks.map((s, i) => (
                <span key={s} className={`h-1.5 rounded-full transition-[width,background-color] duration-200 ${i === index ? 'w-4 bg-accent-fill' : i < index ? 'w-1.5 bg-accent-fill' : 'w-1.5 bg-fg/15'}`} />
              ))}
            </span>
          </div>
        )}
        <p className={`${point ? 'mt-1 text-label' : 'mt-2 text-body'} text-fg wrap-prose`}>{texts[index]}</p>
        <div className="mt-3 -mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {leave && (
            <button type="button" onClick={() => { tapLight(); leave.run(); }} className={quiet}>{leave.label}</button>
          )}
          <span className="ms-auto">
            {!last ? <Button onClick={onNext}>{t.tourNext}</Button>
              : final ? <Button onClick={final.run}>{final.label}</Button>
              : <Button onClick={onEnd}>{t.done}</Button>}
          </span>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
