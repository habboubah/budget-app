import { createContext, useContext } from 'react';

/**
 * The menu (☰) a screen's bar shows on its leading end where there is no back
 * button: the month page, Statistik and Planen — the screens the tab bar used
 * to switch between until November 2026. App provides it; `Screen` reads it,
 * so no view has to pass it along. `label` is read out and shown as the
 * button's title ("Menü").
 */
export interface MenuButton { label: string; onOpen: () => void }
export const MenuContext = createContext<MenuButton | null>(null);
export const useMenuButton = () => useContext(MenuContext);
