import { CSSProperties, ReactNode, useId, useState } from 'react';
import { Bell, Check, ChevronRight, Download, Fingerprint, Languages, Lock, Palette, ScanFace, SunMoon, Tags, Trash2 } from 'lucide-react';
import { ACCENTS, Accent, ThemeMode } from '../types';
import translations, { Language, Strings, fmt, languages } from '../translations';
import { LockKind } from '../lock';
import { ReminderPrefs } from '../reminders';
import { Screen, Group, IconTile, MenuRow, Row } from '../ui/Screen';
import { Confirm } from '../ui/Sheet';
import { Switch } from '../ui/Switch';
import { tapLight } from '../ui/haptics';
import { leadLabel, timeLabel } from './RemindersView';

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
  /** Pushes "Sichern und übertragen": backup, Excel, CSV. */
  onTransfer: () => void;
  onDeleteAll: () => void;
  /** What can lock the app on this device; null: no lock row (the web, no passcode). */
  lockKind: LockKind | null;
  lockOn: boolean;
  onLock: (on: boolean) => void;
  /** The reminder settings; null where there are no notifications (the web). */
  reminders: ReminderPrefs | null;
  onReminders: () => void;
}

/** A row's end when it pushes a screen: a value (the count), then ›. */
function Next({ value }: { value?: ReactNode }) {
  return (
    <span className="shrink-0 flex items-center gap-1 text-fg-mute">
      {value !== undefined && <span className="num text-body">{value}</span>}
      <ChevronRight className="w-5 h-5 text-fg-faint rtl:rotate-180" aria-hidden="true" />
    </span>
  );
}

/**
 * Darstellung → Farbe: the colour's name at the row's end and the eight
 * swatches under it, each showing the gradient it gives the balance card —
 * one line of eight where each still gets 44 px, else two lines of four.
 * A radio group for VoiceOver; the whole app follows at once.
 */
function AccentRow({ value, onChange, t }: { value: Accent; onChange: (a: Accent) => void; t: Strings }) {
  const id = useId();
  const names: Record<Accent, string> = {
    petrol: t.accentPetrol, ocean: t.accentOcean, indigo: t.accentIndigo, violet: t.accentViolet,
    berry: t.accentBerry, coral: t.accentCoral, emerald: t.accentEmerald, graphite: t.accentGraphite,
  };
  return (
    <div className="px-4 pt-2.5 pb-1" style={{ '--sep': '58px' } as CSSProperties}>
      <div className="min-h-8 flex items-center gap-3">
        <IconTile icon={Palette} hue="plum" />
        <span className="min-w-0 flex-1 flex flex-wrap items-center gap-x-3">
          <span id={id} className="min-w-0 max-w-full text-body text-fg wrap-compound">{t.accent}</span>
          <span className="ms-auto min-w-0 max-w-full text-body text-fg-mute wrap-compound">{names[value]}</span>
        </span>
      </div>
      <div className="@container -mx-3 mt-1">
        <div role="radiogroup" aria-labelledby={id} className="grid grid-cols-4 @min-[352px]:grid-cols-8">
          {ACCENTS.map(a => {
            const on = a === value;
            return (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={names[a]}
                title={names[a]}
                onClick={() => { if (!on) { tapLight(); onChange(a); } }}
                className="h-tap min-w-0 flex items-center justify-center rounded-full active:scale-[0.9] transition-transform duration-150 focus-visible:ring-focus"
              >
                <span
                  data-accent={a}
                  aria-hidden="true"
                  // Physical, like the 44 px cell around it: a swatch holds no text to enlarge.
                  className={`hero size-[32px] rounded-full inline-flex items-center justify-center transition-shadow duration-200 ${
                    on ? 'ring-2 ring-accent ring-offset-2 ring-offset-surface' : ''}`}
                >
                  {on && <Check className="size-[16px]" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Optionen, grouped as iOS Settings is: Sicherheit und Mitteilungen (the
 * Face ID lock, reminders — iPhone app only), Darstellung (language, light
 * or dark, the colour), Haushaltsbuch (categories and budgets; backup and
 * transfer on a screen of their own), then deleting everything and what the
 * app is. Later features join their group (REDESIGN.md §4, plans/00).
 */
export function SettingsView(p: Props) {
  const { t } = p;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const lockLabel = p.lockKind === 'faceId' ? t.lockFaceId : p.lockKind === 'touchId' ? t.lockTouchId : t.lockCode;
  const LockIcon = p.lockKind === 'faceId' ? ScanFace : p.lockKind === 'touchId' ? Fingerprint : Lock;

  return (
    <Screen title={t.tabSettings} tabbed>
      {(p.lockKind || p.reminders) && (
        <Group title={t.securitySection}>
          {p.lockKind && (
            <Row
              label={lockLabel}
              sub={t.lockSub}
              leading={<IconTile icon={LockIcon} hue="leaf" />}
              trailing={<Switch checked={p.lockOn} onChange={p.onLock} label={lockLabel} className="-me-2" />}
            />
          )}
          {p.reminders && (
            <Row
              label={t.remindersRow}
              // The setting as a line under it: long in German, and text in Arabic (no `num`).
              sub={p.reminders.on ? `${leadLabel(p.reminders.lead, t)} · ${timeLabel(p.reminders.time, t.locale)}` : t.remindersOff}
              leading={<IconTile icon={Bell} hue="tomato" />}
              trailing={<Next />}
              onClick={p.onReminders}
            />
          )}
        </Group>
      )}

      <Group title={t.displaySection}>
        <MenuRow<Language>
          label={t.language}
          leading={<IconTile icon={Languages} hue="blue" />}
          value={p.language}
          onChange={p.onLanguage}
          options={languages.map(l => ({ value: l, label: translations[l].languageName }))}
        />
        <MenuRow<ThemeMode>
          label={t.appearance}
          leading={<IconTile icon={SunMoon} hue="stone" />}
          value={p.themeMode}
          onChange={p.onTheme}
          options={[
            { value: 'system', label: t.themeSystem },
            { value: 'light', label: t.themeLight },
            { value: 'dark', label: t.themeDark },
          ]}
        />
        <AccentRow value={p.accent} onChange={p.onAccent} t={t} />
      </Group>

      <Group title={t.bookSection} footer={t.transferFooter}>
        <Row
          label={t.categoriesTitle}
          leading={<IconTile icon={Tags} hue="lavender" />}
          trailing={<Next value={p.categoryCount} />}
          onClick={p.onCategories}
        />
        <Row
          label={t.transferTitle}
          leading={<IconTile icon={Download} hue="sky" />}
          trailing={<Next />}
          onClick={p.onTransfer}
        />
      </Group>

      <Group>
        <Row label={t.deleteAll} danger leading={<IconTile icon={Trash2} hue="tomato" />} onClick={() => setConfirmDelete(true)} />
      </Group>

      <section className="text-center pt-4 pb-2 px-6">
        <img src="/icon.svg" alt="" className="w-14 h-14 rounded-[14px] mx-auto" />
        <p className="display text-heading font-semibold text-fg mt-3">{t.about}</p>
        <p className="text-label text-fg-mute mt-1 wrap-prose">{t.aboutBody}</p>
        <p className="text-caption text-fg-mute mt-3 tabular-nums">{fmt(t.version, { v: __APP_VERSION__ })}</p>
      </section>

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
