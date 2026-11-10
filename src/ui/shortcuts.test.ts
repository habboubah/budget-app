import { describe, expect, it } from 'vitest';
import { shortcutFor } from './useShortcuts';

const key = (k: string, mods: Partial<{ metaKey: boolean; ctrlKey: boolean; altKey: boolean; shiftKey: boolean }> = {}) =>
  ({ key: k, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods });
const page = { typing: false, dialog: false, rtl: false };

describe('keyboard shortcuts (plan 22)', () => {
  it('⌘N and Ctrl+N start an entry, ⌘F the search — in a text field too', () => {
    expect(shortcutFor(key('n', { metaKey: true }), page)).toBe('new');
    expect(shortcutFor(key('N', { ctrlKey: true }), page)).toBe('new');
    expect(shortcutFor(key('f', { metaKey: true }), { ...page, typing: true })).toBe('search');
  });

  it('the arrows change the month, swapped from right to left', () => {
    expect(shortcutFor(key('ArrowLeft'), page)).toBe('prev');
    expect(shortcutFor(key('ArrowRight'), page)).toBe('next');
    expect(shortcutFor(key('ArrowLeft'), { ...page, rtl: true })).toBe('next');
    expect(shortcutFor(key('ArrowRight'), { ...page, rtl: true })).toBe('prev');
  });

  it('the arrows leave a text field alone, and a modified arrow is the system’s', () => {
    expect(shortcutFor(key('ArrowLeft'), { ...page, typing: true })).toBeNull();
    expect(shortcutFor(key('ArrowLeft', { metaKey: true }), page)).toBeNull();
    expect(shortcutFor(key('ArrowRight', { shiftKey: true }), page)).toBeNull();
  });

  it('nothing happens over a sheet or a menu, or with Option held', () => {
    expect(shortcutFor(key('n', { metaKey: true }), { ...page, dialog: true })).toBeNull();
    expect(shortcutFor(key('ArrowLeft'), { ...page, dialog: true })).toBeNull();
    expect(shortcutFor(key('n', { metaKey: true, altKey: true }), page)).toBeNull();
    expect(shortcutFor(key('n'), page)).toBeNull();
  });
});
