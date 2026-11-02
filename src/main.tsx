import { Component, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import App from './App.tsx';
import { applyDynamicType } from './dynamicType.ts';
import { downloadFile } from './export.ts';
import { isoDay } from './logic.ts';
import { KEY_PREFIX } from './store.ts';
import translations, { isLanguage, DEFAULT_LANGUAGE } from './translations.ts';
import './index.css';

// Before the first render: the root font size is what the whole rem-based scale
// resolves against, so setting it afterwards would reflow the entire app.
applyDynamicType();

/**
 * Last-resort crash screen. Reads localStorage directly, not React state, so
 * the months can always be rescued even when the app itself is broken.
 */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  rescue = () => {
    const dump: Record<string, unknown> = { app: 'spartopf-rescue' };
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(KEY_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      try { dump[key] = raw ? JSON.parse(raw) : raw; } catch { dump[key] = raw; }
    }
    void downloadFile(`spartopf-rescue-${isoDay()}.json`, JSON.stringify(dump, null, 2), 'application/json');
  };

  render() {
    if (!this.state.error) return this.props.children;
    const saved = (() => { try { return localStorage.getItem('spartopf-lang'); } catch { return null; } })();
    const t = translations[isLanguage(saved) ? saved : DEFAULT_LANGUAGE];
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-surface rounded-lg card-edge p-6 text-center space-y-4">
          <div className="emoji text-[48px]" aria-hidden="true">🪙</div>
          <h1 className="display text-heading font-bold text-fg">{t.crashTitle}</h1>
          <p className="text-label text-fg-mute">{t.crashBody}</p>
          <button type="button" onClick={() => window.location.reload()}
            className="w-full min-h-control bg-accent-fill text-accent-fill-ink rounded-full display font-bold">
            {t.crashReload}
          </button>
          <button type="button" onClick={this.rescue}
            className="w-full min-h-control bg-surface-2 text-fg rounded-full display font-bold">
            {t.crashExport}
          </button>
        </div>
      </div>
    );
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {/* "user" honours prefers-reduced-motion: transforms are dropped, opacity kept. */}
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </ErrorBoundary>
  </StrictMode>,
);
