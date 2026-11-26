// Getting around the app in the scripts (Playwright), since the tab bar gave
// way to the menu (☰, November 2026). The pages keep their old numbers:
// 0 the month, 1 Statistik, 2 Planen, 3 the menu (it was the tab "Mehr").
//
// `goTab(page, n)` gets there from wherever the page is: back out of a pushed
// screen (‹, data-nav="back") until ☰ (data-nav="menu") shows, open the menu,
// and tap the page's tile (data-nav-tile) — or stay in the menu for 3, at its top.

const PAGES = ['month', 'stats', 'insights'];

/** The menu, at its top, from wherever the page is. */
export async function openMenu(page, settle = 350) {
  for (let i = 0; i < 5; i++) {
    const tiles = page.locator('[data-nav-tile]');
    const back = page.locator('[data-nav="back"]:visible');
    if (await tiles.count() && !(await back.count())) return;
    const menu = page.locator('[data-nav="menu"]:visible');
    if (await menu.count()) await menu.first().click();
    else if (await back.count()) await back.first().click();
    else throw new Error('goTab: neither ☰ nor ‹ on the screen');
    await page.waitForTimeout(settle);
  }
}

/** 0 the month, 1 Statistik, 2 Planen, 3 the menu. */
export async function goTab(page, n, settle = 350) {
  await openMenu(page, settle);
  if (n < 3) await page.locator(`[data-nav-tile="${PAGES[n]}"]`).click();
}

/** For page.evaluate (perf-check): the tile's selector and the menu button's. */
export const TILE = n => `[data-nav-tile="${PAGES[n]}"]`;
export const MENU = '[data-nav="menu"]';
