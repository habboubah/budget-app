import { RefObject, useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Where Tab should land to keep focus inside a dialog, or null to let the
 * browser handle it. Split out from the DOM wiring so the wrap-around rule is
 * unit-testable: `items` is the dialog's focusable elements in tab order.
 */
export function nextTrapFocus<T>(items: T[], active: T | null, shiftKey: boolean): T | null {
  if (items.length === 0) return null;
  const first = items[0];
  const last = items[items.length - 1];
  if (shiftKey && active === first) return last;
  if (!shiftKey && active === last) return first;
  // Focus escaped the dialog entirely (or sits mid-list) — pull it back to the
  // edge Tab is heading for rather than letting it walk into the page behind.
  if (active === null || !items.includes(active)) return shiftKey ? last : first;
  return null;
}

/** The dialogs open right now, oldest first: only the topmost answers Escape and Tab. */
const openDialogs: symbol[] = [];

/** body's own overflow from before the first dialog opened, put back when the last one closes. */
let bodyOverflow = '';

/**
 * One scroll lock shared by every open dialog, held while any is open.
 *
 * Each dialog used to save body's overflow on open and put it back on close.
 * That only works if dialogs close newest-first, and they don't: a Menu stays
 * mounted through its exit animation, so picking "Budget hinzufügen › Food"
 * opened the budget sheet (which saved the menu's `hidden`) before the menu
 * finished closing (and put back `''`). Closing the sheet then put back
 * `hidden`, and the page never scrolled again.
 */
export function lockScroll(me: symbol) {
  if (openDialogs.length === 0) {
    bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  openDialogs.push(me);
}

export function unlockScroll(me: symbol) {
  const i = openDialogs.indexOf(me);
  if (i !== -1) openDialogs.splice(i, 1);
  if (openDialogs.length === 0) document.body.style.overflow = bodyOverflow;
}

/**
 * Shared dialog behaviour for Sheet, ConfirmationModal and Menu.
 *
 * Both used to hand-roll the same Escape listener and nothing else, so Tab
 * walked straight out of the open dialog into the screen behind it — which is
 * still scrollable and still clickable — and closing the dialog dropped focus
 * on <body>, losing a keyboard or switch user's place entirely.
 *
 * Dialogs stack — a menu over a sheet, an alert over a sheet — and only the
 * topmost one handles the keys: Escape closes the menu, not the sheet under
 * it with everything typed into it.
 */
export function useDialog(open: boolean, ref: RefObject<HTMLElement | null>, onClose: () => void) {
  // Callers pass an inline arrow / a function redeclared each render, so `onClose`
  // has a new identity every render. Held in a ref and kept out of the deps below:
  // with it in there the effect tore down and re-ran on every keystroke, and its
  // cleanup — the focus restore — pulled the caret out of the field being typed
  // into and back onto whatever was focused when the sheet opened. Every second
  // digit landed in another field.
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return;

    const restoreTo = document.activeElement as HTMLElement | null;
    const me = Symbol('dialog');
    lockScroll(me);

    const onKey = (e: KeyboardEvent) => {
      if (openDialogs[openDialogs.length - 1] !== me) return;
      if (e.key === 'Escape') { close.current(); return; }
      if (e.key !== 'Tab') return;
      const el = ref.current;
      if (!el) return;
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(n => n.offsetParent !== null);
      // Wrap at both ends so Tab can never reach the screen behind the dialog.
      const target = nextTrapFocus(items, document.activeElement as HTMLElement | null, e.shiftKey);
      if (target) { e.preventDefault(); target.focus(); }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      unlockScroll(me);
      // Only take focus back if the dialog still holds it — an action that
      // moves focus somewhere deliberate on close must not be overridden.
      if (restoreTo?.isConnected && ref.current?.contains(document.activeElement)) {
        restoreTo.focus({ preventScroll: true });
      }
    };
  }, [open, ref]);
}
