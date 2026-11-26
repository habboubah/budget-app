import { createContext, useContext } from 'react';

/**
 * What a page's bar shows on its leading end where the page passes no back
 * button of its own. App provides it; `Screen` reads it, so no view has to
 * pass it along.
 *
 * - The month page, the app's home: ☰ (the menu), and beside it the add
 *   button (`add`, while there is something to add to).
 * - Statistik and Planen, opened from the menu: ‹ back to the month (`back`).
 *
 * Not `menu.ts`: on a Mac's file system that is the same name as `Menu.tsx`.
 */
export interface MenuButton {
  /** ☰'s label, read out and shown as its title ("Menü"). */
  label: string;
  onOpen: () => void;
  /** ‹ in place of ☰: back to the month page. */
  back?: { label: string; onBack: () => void };
  /** The add button beside ☰. `open`: the sheet it opens is up. */
  add?: { label: string; open: boolean; onClick: () => void };
}
export const MenuContext = createContext<MenuButton | null>(null);
export const useMenuButton = () => useContext(MenuContext);
