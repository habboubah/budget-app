/**
 * iOS Dynamic Type → root font size.
 *
 * A WKWebView ignores the Larger Text accessibility setting entirely: px, rem
 * and em are all inert with respect to it, so on iOS this app's text could not
 * be enlarged at all. (Android is the opposite — its WebView already multiplies
 * text by the system font scale, which is why nothing here touches Android.)
 *
 * The one documented bridge is the `-apple-system-body` CSS font shorthand,
 * which resolves to the *current* Dynamic Type body size. It can't be used
 * directly as the app's font — it would replace the bundled faces — but it can be
 * measured, and the ratio it gives drives the root font size, which the whole
 * rem-based type and spacing scale hangs off.
 */

/** Dynamic Type's body size at the default (Large) setting. */
const DEFAULT_BODY_PT = 17;

/**
 * The factor to multiply the root font size by, or 1 when Dynamic Type is not
 * available. Exported for the unit test — the DOM measurement is the only part
 * that can't be tested headlessly, the clamping is the part with the bug risk.
 */
export function scaleFromBodySize(measuredPx: number): number {
  if (!Number.isFinite(measuredPx) || measuredPx <= 0) return 1;
  // Dynamic Type's accessibility sizes reach ~53pt for body. Uncapped that is a
  // 3.1x root, which pushes even an elastic layout past the point where the
  // primary action fits on screen. 2x is the level WCAG 1.4.4 asks for and the
  // level this layout is verified at; beyond it the user still has pinch-zoom.
  return Math.min(measuredPx / DEFAULT_BODY_PT, 2);
}

/**
 * Measures Dynamic Type and applies it to <html>. No-op off Apple platforms.
 * Re-measures when the app comes back to the foreground, because changing the
 * setting means leaving for Settings and returning — and a web view does not
 * get a notification for it.
 */
export function applyDynamicType(): void {
  // Chrome and Firefox report false here, so this never runs on Android or the
  // web build. Without the guard they'd resolve the font to the inherited 16px
  // and quietly shrink the whole app by 6%.
  if (!CSS.supports('font', '-apple-system-body')) return;

  const measure = () => {
    const probe = document.createElement('span');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText =
      'position:absolute;visibility:hidden;pointer-events:none;font:-apple-system-body';
    document.body.appendChild(probe);
    const px = parseFloat(getComputedStyle(probe).fontSize);
    probe.remove();

    const scale = scaleFromBodySize(px);
    // Root stays 16px at the default setting, so 1x renders byte-identically to
    // the fixed-px layout this replaces.
    document.documentElement.style.fontSize = scale === 1 ? '' : `${16 * scale}px`;
  };

  measure();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') measure();
  });
}
