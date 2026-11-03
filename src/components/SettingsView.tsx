import { ReactNode, useState } from 'react';
import { Check, ChevronRight, Palette, Languages, RotateCcw, Tags, Trash2 } from 'lucide-react';
import { ACCENTS, Accent, ThemeMode } from '../types';
import translations, { Language, Strings, fmt, languages } from '../translations';
import { Screen, Group, IconTile, Row } from '../ui/Screen';
import { Segmented } from '../ui/Field';
import { Confirm } from '../ui/Sheet';
import { tapLight } from '../ui/haptics';

interface Props {
  language: Language;
  themeMode: ThemeMode;
  accent: Accent;
  t: Strings;
  categoryCount: number;
  onLanguage: (l: Language) => void;
  onTheme: (m: ThemeMode) => void;
  onAccent: (a: Accent) => void;
  onCategories: () => void;
  onDeleteAll: () => void;
  onRestoreDefaults: () => void;
  /** The backup group, rendered by the caller. */
  backup?: ReactNode;
}

/**
 * The app's colour: eight swatches, each showing the gradient it gives the
 * balance card. A radio group for VoiceOver; the whole app follows at once.
 */
function AccentPicker({ value, onChange, t }: { value: Accent; onChange: (a: Accent) => void; t: Strings }) {
  const names: Record<Accent, string> = {
    petrol: t.accentPetrol, ocean: t.accentOcean, indigo: t.accentIndigo, violet: t.accentViolet,
    berry: t.accentBerry, coral: t.accentCoral, emerald: t.accentEmerald, graphite: t.accentGraphite,
  };
  return (
    <div className="rounded-md bg-surface card-edge px-2 pt-3 pb-2">
      <p id="accent-label" className="px-2 text-label font-medium text-fg-mute">{t.accent}</p>
      <div role="radiogroup" aria-labelledby="accent-label" className="mt-1 grid grid-cols-4">
        {ACCENTS.map(a => {
          const on = a === value;
          return (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => { if (!on) { tapLight(); onChange(a); } }}
              className="min-w-0 py-2 flex flex-col items-center gap-1.5 rounded-sm active:scale-[0.94] transition-transform duration-150 focus-visible:ring-focus"
            >
              <span
                data-accent={a}
                aria-hidden="true"
                className={`hero w-11 h-11 rounded-full inline-flex items-center justify-center transition-shadow duration-200 ${
                  on ? 'ring-[2.5px] ring-accent ring-offset-[2.5px] ring-offset-surface' : ''}`}
              >
                {on && <Check className="w-5 h-5" strokeWidth={3} />}
              </span>
              <span className={`max-w-full px-0.5 text-caption text-center wrap-compound ${on ? 'text-fg font-semibold' : 'text-fg-mute'}`}>{names[a]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The settings tab — the same shape as shopping-list's settings. */
export function SettingsView(p: Props) {
  const { t } = p;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);

  return (
    <Screen title={t.settingsTitle} tabbed>
      <section className="space-y-2">
        <h2 className="px-4 eyebrow text-fg-mute flex items-center gap-2"><Languages className="w-4 h-4" aria-hidden="true" />{t.language}</h2>
        <Segmented<Language>
          label={t.language}
          value={p.language}
          onChange={p.onLanguage}
          options={languages.map(l => ({ value: l, label: translations[l].languageName }))}
        />
      </section>

      <section className="space-y-2">
        <h2 className="px-4 eyebrow text-fg-mute flex items-center gap-2"><Palette className="w-4 h-4" aria-hidden="true" />{t.appearance}</h2>
        <Segmented<ThemeMode>
          label={t.appearance}
          value={p.themeMode}
          onChange={p.onTheme}
          options={[
            { value: 'system', label: t.themeSystem },
            { value: 'light', label: t.themeLight },
            { value: 'dark', label: t.themeDark },
          ]}
        />
        <AccentPicker value={p.accent} onChange={p.onAccent} t={t} />
      </section>

      <Group>
        <Row
          label={t.categories}
          sub={t.categoriesSub}
          leading={<IconTile icon={Tags} hue="lavender" />}
          trailing={<span className="flex items-center gap-1 text-fg-mute"><span className="num text-body">{p.categoryCount}</span><ChevronRight className="w-5 h-5 text-fg-faint rtl:rotate-180" aria-hidden="true" /></span>}
          onClick={p.onCategories}
        />
      </Group>

      {p.backup}

      <Group title={t.resetSection}>
        <Row label={t.restoreDefaults} sub={t.restoreDefaultsSub} leading={<IconTile icon={RotateCcw} hue="stone" />} onClick={() => setConfirmRestore(true)} />
        <Row label={t.deleteAll} danger leading={<IconTile icon={Trash2} hue="tomato" />} onClick={() => setConfirmDelete(true)} />
      </Group>

      <section className="text-center pt-4 pb-2 px-6">
        <img src="/icon.svg" alt="" className="w-14 h-14 rounded-[14px] mx-auto" />
        <p className="display text-heading font-semibold text-fg mt-3">{t.about}</p>
        <p className="text-label text-fg-mute mt-1 wrap-prose">{t.aboutBody}</p>
        <p className="text-caption text-fg-mute mt-3 tabular-nums">{fmt(t.version, { v: __APP_VERSION__ })}</p>
      </section>

      <Confirm
        open={confirmRestore}
        title={t.restoreDefaultsTitle}
        body={t.restoreDefaultsBody}
        confirmLabel={t.restoreDefaults}
        cancelLabel={t.cancel}
        onCancel={() => setConfirmRestore(false)}
        onConfirm={() => { setConfirmRestore(false); p.onRestoreDefaults(); }}
      />
      <Confirm
        open={confirmDelete}
        title={t.deleteAllTitle}
        body={t.deleteAllBody}
        confirmLabel={t.deleteAll}
        cancelLabel={t.cancel}
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => { setConfirmDelete(false); p.onDeleteAll(); }}
      />
    </Screen>
  );
}
