import { ComponentType, useState } from 'react';
import { ArchiveRestore, Bell, CalendarRange, CloudUpload, Coins, EyeOff, FlaskConical, FlaskConicalOff, Fingerprint, Languages, Lock, Moon, Palette, ScanFace, Sun, SunMoon, Trash2 } from 'lucide-react';
import { ACCENTS, Accent, ThemeMode } from '../types';
import { CURRENCIES, Currency, currencyName } from '../currency';
import { LANGUAGE_NAMES, Language, Strings, fmt, languages } from '../translations';
import { LockKind } from '../lock';
import { ReminderPrefs } from '../reminders';
import { DrawerRow, DrawerValue } from '../ui/DrawerRow';
import { Confirm } from '../ui/Sheet';
import { Switch } from '../ui/Switch';
import { leadLabel, timeLabel } from './RemindersView';

interface Props {
  language: Language;
  themeMode: ThemeMode;
  accent: Accent;
  t: Strings;
  onLanguage: (l: Language) => void;
  onTheme: (m: ThemeMode) => void;
  onAccent: (a: Accent) => void;
  currency: Currency;
  onCurrency: (c: Currency) => void;
  /** The day the book's month begins (plan 32). */
  monthStart: number;
  onMonthStart: () => void;
  /** The book holds test data (src/demo.ts): the row offers to remove it instead of adding it. */
  hasDemo: boolean;
  onAddDemo: () => void;
  /** Called once the user has confirmed. */
  onRemoveDemo: () => void;
  onDeleteAll: () => void;
  /** What can lock the app on this device; null: no lock row (the web, no passcode). */
  lockKind: LockKind | null;
  lockOn: boolean;
  onLock: (on: boolean) => void;
  /** *Beträge verbergen* (plan 06): every amount shows as "•••• €" until the eye on the balance card is tapped. */
  hideAmounts: boolean;
  onHideAmounts: (on: boolean) => void;
  /** Whether the book is part of the phone's own backup (plan 06); null where there is no file (the web). */
  deviceBackup: boolean | null;
  /** Moves the book in or out of the backed-up folder; the switch waits for it. */
  onDeviceBackup: (on: boolean) => void;
  /** A move is running: the switch can't be tapped again until it's done. */
  deviceBackupBusy?: boolean;
  /** The reminder settings; null where there are no notifications (the web). */
  reminders: ReminderPrefs | null;
  onReminders: () => void;
  /** Pushes *Sichern und wiederherstellen*: export a backup, import one, the CSV. */
  onTransfer: () => void;
}

/**
 * The settings, in the menu drawer (plan 39; a screen of their own until
 * November 2026, then groups in a full-screen menu, now the way fuel-app has
 * them, Ahmad). Two parts, which the menu places itself:
 *
 * - `PreferencesRows`, under the heading *Einstellungen*: the day the month
 *   begins; hiding amounts, the lock and the phone's backup (the guide's
 *   `{security}`); the reminders (apps only); *Sichern und wiederherstellen*;
 *   the test data in and out (each asks first); and
 *   resetting the app, in red, behind a confirmation.
 * - `PreferencesButtons`, at the drawer's foot: four round icon buttons
 *   without a visible label — the look (light, dark, automatic), the language,
 *   the currency and the colour (the guide's `{display}`). Each has the
 *   phone's own picker lying invisibly over it, so a tap opens the system's
 *   list, and VoiceOver reads a pop-up button with its name and value.
 *
 * What the app is — its card, its promises, rating, feedback and the privacy
 * policy — is on *Über diese App* (AboutView).
 */
export function PreferencesRows(p: Props) {
  const { t } = p;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);
  // Adding the test data asks first too (Ahmad, November 2026): a year of entries lands in the book.
  const [confirmAddDemo, setConfirmAddDemo] = useState(false);
  const lockLabel = p.lockKind === 'faceId' ? t.lockFaceId : p.lockKind === 'touchId' ? t.lockTouchId : t.lockCode;
  const LockIcon = p.lockKind === 'faceId' ? ScanFace : p.lockKind === 'touchId' ? Fingerprint : Lock;
  const sw = (checked: boolean, onChange: (on: boolean) => void, label: string, busy = false) => (
    <Switch checked={checked} onChange={on => { if (!busy) onChange(on); }} label={label} className={`-me-1 ${busy ? 'opacity-60' : ''}`} />
  );
  return (
    <div className="flex flex-col gap-0.5 border-t border-hairline pt-2" data-tour="set-prefs">
      <p className="px-3 pt-1 eyebrow text-fg-mute">{t.prefsTitle}</p>
      <div data-prefs="general">
        <DrawerRow icon={CalendarRange} label={t.monthStartRow} onClick={p.onMonthStart}
          end={<DrawerValue>{fmt(t.monthStartValue, { day: p.monthStart })}</DrawerValue>} />
      </div>
      <div data-prefs="security" data-tour="set-security">
        <DrawerRow icon={EyeOff} label={t.hideAmounts} end={sw(p.hideAmounts, p.onHideAmounts, t.hideAmounts)} />
        {p.lockKind && <DrawerRow icon={LockIcon} label={lockLabel} end={sw(p.lockOn, p.onLock, lockLabel)} />}
        {p.deviceBackup !== null && (
          <DrawerRow icon={CloudUpload} label={t.deviceBackup} end={sw(p.deviceBackup, p.onDeviceBackup, t.deviceBackup, p.deviceBackupBusy)} />
        )}
      </div>
      {p.reminders && (
        <div data-prefs="notify">
          <DrawerRow
            icon={Bell}
            label={t.remindersRow}
            // The setting as a line under it: long in German, and text in Arabic (no `num`).
            sub={p.reminders.on ? `${leadLabel(p.reminders.lead, t)} · ${timeLabel(p.reminders.time, t.locale)}`
              : p.reminders.nudge ? `${t.nudgeRow} · ${timeLabel(p.reminders.nudgeTime, t.locale)}` : t.remindersOff}
            onClick={p.onReminders}
          />
        </div>
      )}
      <div data-prefs="backup">
        <DrawerRow icon={ArchiveRestore} label={t.transferTitle} onClick={p.onTransfer} tour="set-transfer" />
      </div>
      <div data-prefs="demo">
        {p.hasDemo
          ? <DrawerRow icon={FlaskConicalOff} label={t.demoRemove} onClick={() => setConfirmDemo(true)} />
          : <DrawerRow icon={FlaskConical} label={t.demoAdd} onClick={() => setConfirmAddDemo(true)} />}
      </div>
      <div data-prefs="reset">
        <DrawerRow icon={Trash2} label={t.deleteAll} danger onClick={() => setConfirmDelete(true)} />
      </div>

      <Confirm
        open={confirmDemo}
        title={t.demoRemoveTitle}
        body={t.demoRemoveBody}
        confirmLabel={t.demoRemove}
        cancelLabel={t.cancel}
        onCancel={() => setConfirmDemo(false)}
        onConfirm={() => { setConfirmDemo(false); p.onRemoveDemo(); }}
      />
      <Confirm
        open={confirmAddDemo}
        title={t.demoAddTitle}
        body={t.demoFooter}
        confirmLabel={t.demoAdd}
        cancelLabel={t.cancel}
        onCancel={() => setConfirmAddDemo(false)}
        onConfirm={() => { setConfirmAddDemo(false); p.onAddDemo(); }}
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
    </div>
  );
}

/**
 * One round icon button at the drawer's foot, as fuel-app draws them: 48 px,
 * the symbol only (the name is its title and what VoiceOver reads), and the
 * phone's own picker lying invisibly over it.
 */
function IconSelect<V extends string>({ icon: I, label, value, options, onChange, accent }: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: V;
  options: { value: V; label: string }[];
  onChange: (v: V) => void;
  /** The colour button: filled with the chosen colour's gradient. */
  accent?: Accent;
}) {
  const shown = options.find(o => o.value === value)?.label ?? '';
  return (
    <label
      title={`${label}: ${shown}`}
      data-accent={accent}
      className={`relative grid size-12 shrink-0 place-items-center rounded-full active:scale-95 transition-transform duration-150 focus-within:ring-focus ${
        accent ? 'hero text-on-hero' : 'bg-surface-2 text-fg'}`}
    >
      <I className="w-[22px] h-[22px]" strokeWidth={2.1} />
      <select
        aria-label={label}
        value={value}
        onChange={e => onChange(e.target.value as V)}
        className="absolute inset-0 cursor-pointer appearance-none rounded-full opacity-0"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function PreferencesButtons(p: Pick<Props, 't' | 'language' | 'onLanguage' | 'themeMode' | 'onTheme' | 'currency' | 'onCurrency' | 'accent' | 'onAccent'>) {
  const { t } = p;
  const names: Record<Accent, string> = {
    petrol: t.accentPetrol, ocean: t.accentOcean, indigo: t.accentIndigo, violet: t.accentViolet,
    berry: t.accentBerry, coral: t.accentCoral, emerald: t.accentEmerald, graphite: t.accentGraphite,
  };
  return (
    <div data-prefs="display" data-tour="set-display" className="flex flex-wrap items-center gap-3 px-2">
      <IconSelect<ThemeMode>
        icon={p.themeMode === 'dark' ? Moon : p.themeMode === 'light' ? Sun : SunMoon}
        label={t.appearance}
        value={p.themeMode}
        onChange={p.onTheme}
        options={[
          { value: 'system', label: t.themeSystem },
          { value: 'light', label: t.themeLight },
          { value: 'dark', label: t.themeDark },
        ]}
      />
      <IconSelect<Language>
        icon={Languages}
        label={t.language}
        value={p.language}
        onChange={p.onLanguage}
        options={languages.map(l => ({ value: l, label: LANGUAGE_NAMES[l] }))}
      />
      <IconSelect<Currency>
        icon={Coins}
        label={t.currency}
        value={p.currency}
        onChange={p.onCurrency}
        options={CURRENCIES.map(c => ({ value: c, label: currencyName(c, t.locale) }))}
      />
      <IconSelect<Accent>
        icon={Palette}
        label={t.accent}
        value={p.accent}
        onChange={p.onAccent}
        accent={p.accent}
        options={ACCENTS.map(a => ({ value: a, label: names[a] }))}
      />
    </div>
  );
}
