import { createContext, useContext } from 'react';

/**
 * The ⓘ in a page's bar that says what the page is for (November 2026, Ahmad):
 * App provides it around the pages that have a topic in the guide (Regeln,
 * Schulden, Steuerliste, Sichern …), and `Screen` draws it at the bar's end,
 * so no view has to pass it along. A tap opens the topic's words in a sheet,
 * in the app's language (PageInfoSheet).
 */
export interface PageInfo { label: string; onOpen: () => void }
export const PageInfoContext = createContext<PageInfo | null>(null);
export const usePageInfo = () => useContext(PageInfoContext);
