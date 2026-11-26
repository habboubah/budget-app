// Getting around the app in the scripts (Playwright). The month page is home:
// it alone has ☰ (data-nav="menu"). Statistik and Planen are opened from the
// menu's tiles (data-nav-tile) and go back with ‹ (data-nav="back"), like
// every pushed screen; the menu closes with ✕ (data-nav="close").
// The pages keep the tab bar's old numbers: 0 the month, 1 Statistik,
// 2 Planen, 3 the menu.

const PAGES = { 1: 'stats', 2: 'insights' };

/** The month page's root, from wherever the page is: ‹ and ✕ until ☰ shows. */
export async function toMonth(page, settle = 350) {
  for (let i = 0; i < 6; i++) {
    if (await page.locator('[data-nav="menu"]:visible').count()) return;
    const step = page.locator('[data-nav="back"]:visible, [data-nav="close"]:visible');
    if (!(await step.count())) throw new Error('toMonth: neither ☰, ‹ nor ✕ on the screen');
    await step.first().click();
    await page.waitForTimeout(settle);
  }
}

/** The menu, at its top, from wherever the page is. */
export async function openMenu(page, settle = 350) {
  await toMonth(page, settle);
  await page.locator('[data-nav="menu"]:visible').first().click();
  await page.waitForTimeout(settle);
}

/** 0 the month, 1 Statistik, 2 Planen, 3 the menu. */
export async function goTab(page, n, settle = 350) {
  if (n === 0) return toMonth(page, settle);
  await openMenu(page, settle);
  if (PAGES[n]) await page.locator(`[data-nav-tile="${PAGES[n]}"]`).click();
}

/** For page.evaluate (perf-check): a page's tile in the menu. */
export const TILE = n => `[data-nav-tile="${PAGES[n]}"]`;
export const MENU = '[data-nav="menu"]';
