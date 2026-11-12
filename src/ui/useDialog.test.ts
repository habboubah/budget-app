import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lockScroll, unlockScroll } from './useDialog';

describe('dialog scroll lock', () => {
  const body = { style: { overflow: '' } };
  beforeEach(() => { body.style.overflow = ''; vi.stubGlobal('document', { body }); });
  afterEach(() => vi.unstubAllGlobals());

  it('locks while one dialog is open and unlocks when it closes', () => {
    const a = Symbol('a');
    lockScroll(a);
    expect(body.style.overflow).toBe('hidden');
    unlockScroll(a);
    expect(body.style.overflow).toBe('');
  });

  // Planen › "Budget hinzufügen": the menu is still animating out when the
  // budget sheet opens, so the menu closes first and the sheet second.
  it('unlocks when stacked dialogs close oldest-first', () => {
    const menu = Symbol('menu');
    const sheet = Symbol('sheet');
    lockScroll(menu);
    lockScroll(sheet);
    unlockScroll(menu);
    expect(body.style.overflow).toBe('hidden');
    unlockScroll(sheet);
    expect(body.style.overflow).toBe('');
  });

  it('unlocks when stacked dialogs close newest-first', () => {
    const sheet = Symbol('sheet');
    const confirm = Symbol('confirm');
    lockScroll(sheet);
    lockScroll(confirm);
    unlockScroll(confirm);
    expect(body.style.overflow).toBe('hidden');
    unlockScroll(sheet);
    expect(body.style.overflow).toBe('');
  });
});
