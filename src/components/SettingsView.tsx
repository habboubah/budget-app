import { ReactNode, useState } from 'react';
import { ChevronRight, Palette, Languages, RotateCcw, Tags, Trash2 } from 'lucide-react';
import { ThemeMode } from '../types';
import translations, { Language, Strings, fmt, languages } from '../translations';
import { Screen, Group, IconTile, Row } from '../ui/Screen';
import { Segmented } from '../ui/Field';
import { Confirm } from '../ui/Sheet';

interface Props {
  language: Language;
  themeMode: ThemeMode;
  t: Strings;
  categoryCount: number;
  onLanguage: (l: Language) => void;
  onTheme: (m: ThemeMode) => void;
  onCategories: () => void;
  onDeleteAll: () => void;
  onRestoreDefaults: () => void;
  /** The backup group, rendered by the caller. */
  backup?: ReactNode;
}

/** The settings tab — the same shape as shopping-list's settings. */
export function SettingsView(p: Props) {
  const { t } = p;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);

  return (
    <Screen title={t.settingsTitle} tabbed>
      <Group>
        <Row
          label={t.categories}
          sub={t.categoriesSub}
          leading={<IconTile icon={Tags} hue="lavender" />}
          trailing={<span className="flex items-center gap-1 text-fg-mute"><span className="num text-body">{p.categoryCount}</span><ChevronRight className="w-5 h-5 text-fg-faint rtl:rotate-180" aria-hidden="true" /></span>}
          onClick={p.onCategories}
        />
      </Group>

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
      </section>

      {p.backup}

      <Group title={t.resetSection}>
        <Row label={t.restoreDefaults} sub={t.restoreDefaultsSub} leading={<IconTile icon={RotateCcw} hue="stone" />} onClick={() => setConfirmRestore(true)} />
        <Row label={t.deleteAll} danger leading={<IconTile icon={Trash2} hue="tomato" />} onClick={() => setConfirmDelete(true)} />
      </Group>

      <section className="text-center pt-4 pb-2 px-6">
        <img src="/icon.svg" alt="" className="w-14 h-14 rounded-[14px] mx-auto" />
        <p className="display text-heading font-semibold text-fg mt-3">{t.about}</p>
        <p className="text-label text-fg-mute mt-1 wrap-prose">{t.aboutBody}</p>
        <p className="text-caption text-fg-mute mt-3 num">{fmt(t.version, { v: __APP_VERSION__ })}</p>
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
