import { useEffect, useRef } from 'react';

export interface Shortcuts {
  /** ⌘N / Ctrl+N: a new entry. */
  onNew?: () => void;
  /** ⌘F / Ctrl+F: the search. */
  onSearch?: () => void;
  /** ← and →: the month before and after (swapped in a right-to-left language). */
  onPrev?: () => void;
  onNext?: () => void;
  rtl?: boolean;
}

/** What a key press means, or null: pure, so it is tested without a keyboard. */
export function shortcutFor(
  e: { key: string; metaKey: boolean; ctrlKey: boolean; altKey: boolean; shiftKey: boolean },
  where: { typing: boolean; dialog: boolean; rtl: boolean },
): 'new' | 'search' | 'prev' | 'next' | null {
  if (where.dialog || e.altKey) return null;
  const mod = e.metaKey || e.ctrlKey;
  const key = e.key.toLowerCase();
  if (mod && !e.shiftKey && key === 'n') return 'new';
  if (mod && !e.shiftKey && key === 'f') return 'search';
  if (mod || e.shiftKey || where.typing) return null;
  if (e.key === 'ArrowLeft') return where.rtl ? 'next' : 'prev';
  if (e.key === 'ArrowRight') return where.rtl ? 'prev' : 'next';
  return null;
}

const isTyping = (el: Element | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

/**
 * Keyboard shortcuts for a hardware keyboard (plan 22). Nothing happens while
 * a sheet, a menu or a dialog is open, and the arrows leave text fields and
 * anything that uses them itself (sliders, radio groups, tabs) alone.
 */
export function useShortcuts(shortcuts: Shortcuts) {
  const latest = useRef(shortcuts);
  latest.current = shortcuts;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const s = latest.current;
      const active = document.activeElement;
      const arrowUser = active instanceof HTMLElement && !!active.closest('[role="radiogroup"],[role="tablist"],[role="slider"],[role="menu"],[role="listbox"]');
      const what = shortcutFor(e, {
        typing: isTyping(active) || arrowUser,
        dialog: !!document.querySelector('[role="dialog"],[role="alertdialog"],[role="menu"]'),
        rtl: !!s.rtl,
      });
      const run = what === 'new' ? s.onNew : what === 'search' ? s.onSearch : what === 'prev' ? s.onPrev : what === 'next' ? s.onNext : undefined;
      if (!run) return;
      e.preventDefault();
      run();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
