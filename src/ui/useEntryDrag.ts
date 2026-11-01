import { useEffect, useRef, useState } from 'react';
import { tapLight, tapMedium } from './haptics';

/*
 * Drag an entry to sort it, or into another category — the way Reminders does
 * it: press and hold a row (or, with a mouse, simply drag it), and it lifts
 * off the page and follows the finger. A line shows where it will land; near
 * the top or bottom edge the page scrolls along. Letting go drops it there;
 * letting go outside every category puts it back.
 *
 * The page finds the drop spot through data attributes:
 *   [data-drop-category="<id>"]  on every category card (plus
 *                                 data-collapsed="true" while it is folded),
 *   [data-entry-row="<id>"]      on every entry row inside it.
 *
 * Touch: a finger that moves before the hold completes is a scroll, and the
 * drag never starts. Once it has, a non-passive touchmove listener keeps the
 * page from scrolling under it (the only way WebKit lets a web view keep the
 * finger).
 */

export interface DropTarget {
  categoryId: string;
  /** Position among the category's other entries (the dragged one left out). */
  index: number;
}

export interface DragGhost {
  id: string;
  left: number;
  width: number;
  /** Where the finger holds the row, from its top. */
  grab: number;
  /** Finger position, viewport coordinates. */
  y: number;
}

const HOLD_MS = 380;
const TOUCH_SLOP = 8;
const MOUSE_SLOP = 5;
const EDGE = 96;
const BOTTOM_CHROME = 84; // the tab bar
/** A folded category takes a dropped entry at its end. */
export const AT_END = Number.MAX_SAFE_INTEGER;

interface Session {
  id: string;
  row: HTMLElement;
  pointerId: number;
  mouse: boolean;
  x0: number;
  y0: number;
  x: number;
  y: number;
  active: boolean;
  timer: number;
  raf: number;
  target: DropTarget | null;
}

export function findDropTarget(x: number, y: number, draggedId: string): DropTarget | null {
  const card = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-drop-category]');
  if (!card) return null;
  const categoryId = card.dataset.dropCategory!;
  if (card.dataset.collapsed === 'true') return { categoryId, index: AT_END };
  const rows = [...card.querySelectorAll<HTMLElement>('[data-entry-row]')].filter(r => r.dataset.entryRow !== draggedId);
  let index = rows.length;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i].getBoundingClientRect();
    if (y < r.top + r.height / 2) { index = i; break; }
  }
  return { categoryId, index };
}

export function useEntryDrag(onDrop: (id: string, target: DropTarget) => void) {
  const [ghost, setGhost] = useState<DragGhost | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);
  const drop = useRef(onDrop);
  drop.current = onDrop;

  // One set of handlers for the hook's whole life, so the document listeners
  // added on pointerdown are exactly the ones removed when the drag ends.
  const api = useRef<ReturnType<typeof makeApi> | null>(null);
  if (!api.current) api.current = makeApi();

  function makeApi() {
    let session: Session | null = null;
    let quietUntil = 0; // the click that ends a drag must not open the editor

    const retarget = (s: Session) => {
      const t = findDropTarget(s.x, s.y, s.id);
      if (t?.categoryId === s.target?.categoryId && t?.index === s.target?.index) return;
      if (t && t.categoryId !== s.target?.categoryId) tapLight();
      s.target = t;
      setTarget(t);
    };

    // Near an edge the page scrolls by itself, faster the closer the finger.
    const scrollLoop = () => {
      const s = session;
      if (!s?.active) return;
      const bottom = window.innerHeight - BOTTOM_CHROME;
      let dy = 0;
      if (s.y < EDGE) dy = -Math.ceil(((EDGE - s.y) / EDGE) * 14);
      else if (s.y > bottom - EDGE) dy = Math.ceil((Math.min(s.y - (bottom - EDGE), EDGE) / EDGE) * 14);
      if (dy) { window.scrollBy(0, dy); retarget(s); }
      s.raf = requestAnimationFrame(scrollLoop);
    };

    const begin = () => {
      const s = session;
      if (!s || s.active) return;
      s.active = true;
      tapMedium();
      const r = s.row.getBoundingClientRect();
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      setGhost({ id: s.id, left: r.left, width: r.width, grab: s.y0 - r.top, y: s.y });
      retarget(s);
      s.raf = requestAnimationFrame(scrollLoop);
    };

    const finish = (commit: boolean) => {
      const s = session;
      if (!s) return;
      session = null;
      window.clearTimeout(s.timer);
      cancelAnimationFrame(s.raf);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      document.removeEventListener('touchmove', onTouchMove);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      if (s.active) {
        quietUntil = Date.now() + 450;
        if (commit && s.target) drop.current(s.id, s.target);
        setGhost(null);
        setTarget(null);
      }
    };

    function onMove(e: PointerEvent) {
      const s = session;
      if (!s || e.pointerId !== s.pointerId) return;
      s.x = e.clientX;
      s.y = e.clientY;
      if (!s.active) {
        const moved = Math.hypot(s.x - s.x0, s.y - s.y0);
        if (s.mouse && moved > MOUSE_SLOP) begin();
        else if (!s.mouse && moved > TOUCH_SLOP) finish(false); // a scroll, not a hold
        return;
      }
      setGhost(g => (g ? { ...g, y: s.y } : g));
      retarget(s);
    }
    function onUp(e: PointerEvent) {
      if (session && e.pointerId === session.pointerId) finish(true);
    }
    function onCancel() { finish(false); }
    function onTouchMove(e: TouchEvent) {
      if (session?.active && e.cancelable) e.preventDefault();
    }

    const start = (id: string, e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0 || session) return;
      const row = e.currentTarget.closest<HTMLElement>('[data-entry-row]');
      if (!row) return;
      const mouse = e.pointerType === 'mouse';
      session = {
        id, row, pointerId: e.pointerId, mouse,
        x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY,
        active: false, timer: mouse ? 0 : window.setTimeout(begin, HOLD_MS), raf: 0, target: null,
      };
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onCancel);
      document.addEventListener('touchmove', onTouchMove, { passive: false });
    };

    return {
      start,
      cancel: () => finish(false),
      holding: () => session !== null,
      quiet: () => Date.now() < quietUntil,
    };
  }

  useEffect(() => () => api.current?.cancel(), []);

  const a = api.current;
  /** Props for the part of a row that can be picked up. */
  const bind = (id: string) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => a.start(id, e),
    onClickCapture: (e: React.MouseEvent) => {
      if (a.quiet()) { e.preventDefault(); e.stopPropagation(); }
    },
    // No long-press menu while holding the row.
    onContextMenu: (e: React.MouseEvent) => { if (a.holding()) e.preventDefault(); },
  });

  return { ghost, target, bind, dragging: ghost?.id ?? null };
}
