import { ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { tapLight } from './haptics';

export interface Tab<T extends string> {
  id: T;
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
}

/**
 * The bottom tab bar: Monat · Statistik · Einstellungen. Solid, not blurred
 * (backdrop-filter over a scrolling page is too expensive in a WebView), with
 * a hairline on top and the home indicator's safe area below. Portalled so a
 * screen's slide-in transform can't capture `position: fixed`.
 */
export function TabBar<T extends string>({ tabs, active, onChange, label }: {
  tabs: Tab<T>[];
  active: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return createPortal(
    <nav aria-label={label} className="fixed inset-x-0 bottom-0 z-30 bg-surface hairline-t safe-bottom">
      <div className="mx-auto max-w-xl grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map(({ id, label: name, icon: Icon }) => {
          const on = id === active;
          return (
            <button
              key={id}
              type="button"
              aria-current={on ? 'page' : undefined}
              onClick={() => { if (!on) tapLight(); onChange(id); }}
              className={`min-h-[56px] pt-1.5 pb-1 flex flex-col items-center justify-center gap-0.5 transition-colors focus-visible:ring-focus ${
                on ? 'text-accent' : 'text-fg-mute active:text-fg'}`}
            >
              <Icon className="w-6 h-6" strokeWidth={on ? 2.4 : 2} />
              <span className={`text-chrome ${on ? 'font-bold' : 'font-medium'}`}>{name}</span>
            </button>
          );
        })}
      </div>
    </nav>,
    document.body,
  );
}
