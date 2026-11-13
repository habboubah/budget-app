import { CSSProperties, useEffect, useId, useState } from 'react';
import { ArrowUpRight, Bell, CalendarDays, CalendarRange, Check, CloudUpload, Coins, EyeOff, FlaskConical, FlaskConicalOff, Fingerprint, Languages, ListChecks, Lock, Mail, Palette, ScanFace, ShieldCheck, Star, SunMoon, Trash2 } from 'lucide-react';
import { ACCENTS, Accent, ThemeMode } from '../types';
import { CURRENCIES, Currency, currencyName } from '../currency';
import { LANGUAGE_NAMES, Language, Strings, fmt, languages } from '../translations';
import { LockKind } from '../lock';
import { ReminderPrefs } from '../reminders';
import { Screen, Group, IconTile, MenuRow, Row } from '../ui/Screen';
import { Confirm } from '../ui/Sheet';
import { Switch } from '../ui/Switch';
import { tapLight } from '../ui/haptics';
import { Next, PrefsSection } from './MoreView';
import { leadLabel, timeLabel } from './RemindersView';

interface Props {
  language: Language;
  themeMode: ThemeMode;
  accent: Accent;
  t: Strings;
  onBack: () => void;
  /** The group a search in *Mehr* led to: the screen opens there. */
  section?: PrefsSection;
  /** How much the book holds, for the card about the app: its started months and its entries (no amounts). */
  monthCount: number;
  entryCount: number;
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
  /** Über Spartopf (plan 15): the App Store's review page — iPhone app only; Mail with the versions; the privacy policy. */
  onRate?: () => void;
  onFeedback: () => void;
  onPrivacy: () => void;
}

/** A row's end when it opens something outside the app (the App Store, Mail, Safari): ↗. */
function Away() {
  return <ArrowUpRight className="shrink-0 w-5 h-5 text-fg-faint rtl:-scale-x-100" aria-hidden="true" />;
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
 * Mehr › Einstellungen (plan 39): what is set once and then left alone, in
 * the order it is looked for:
 *
 *   1. *Darstellung* — language, light or dark, the colour, the currency
 *      (the guide sends people here by this name: keep those four in it);
 *   2. *Sicherheit und Mitteilungen* — hiding amounts first (every device
 *      has it), then the lock, reminders and the phone's backup (apps only);
 *   3. *Haushaltsbuch* — the day the month begins;
 *   4. *Ausprobieren* — the test data, in and out;
 *   5. *Über Spartopf* — the card on the hero (what the app is, its version,
 *      how much the book holds: months and entries, never an amount), then
 *      rating, feedback and the privacy policy;
 *   6. last, on its own, resetting.
 *
 * Every icon tile in a group has its own colour, so a row is found by it.
 */
export function PreferencesView(p: Props) {
  const { t } = p;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const lockLabel = p.lockKind === 'faceId' ? t.lockFaceId : p.lockKind === 'touchId' ? t.lockTouchId : t.lockCode;
  const LockIcon = p.lockKind === 'faceId' ? ScanFace : p.lockKind === 'touchId' ? Fingerprint : Lock;
  // From two on: the strings are plurals ("14 Monate").
  const facts = [
    ...(p.monthCount > 1 ? [{ icon: CalendarDays, text: fmt(t.averageSpanN, { n: p.monthCount }) }] : []),
    ...(p.entryCount > 1 ? [{ icon: ListChecks, text: fmt(t.tagEntries, { n: p.entryCount }) }] : []),
  ];
  // A search led here: its group at the top. (A frame later than App's own scroll-to-top for a new screen.)
  useEffect(() => {
    if (!p.section) return;
    const id = requestAnimationFrame(() => document.querySelector(`[data-prefs="${p.section}"]`)?.scrollIntoView({ block: 'center' }));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <Screen title={t.prefsTitle} onBack={p.onBack} backLabel={t.back} tabbed>
      <div data-prefs="display">
        <Group title={t.displaySection} tour="set-display">
          <MenuRow<Language>
            label={t.language}
            leading={<IconTile icon={Languages} hue="blue" />}
            value={p.language}
            onChange={p.onLanguage}
            options={languages.map(l => ({ value: l, label: LANGUAGE_NAMES[l] }))}
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
          <MenuRow<Currency>
            label={t.currency}
            leading={<IconTile icon={Coins} hue="lemon" />}
            value={p.currency}
            onChange={p.onCurrency}
            options={CURRENCIES.map(c => ({ value: c, label: currencyName(c, t.locale) }))}
          />
        </Group>
      </div>

      <div data-prefs="security">
        <Group title={t.securitySection} tour="set-security">
          <Row
            label={t.hideAmounts}
            sub={t.hideAmountsSub}
            leading={<IconTile icon={EyeOff} hue="berry" />}
            trailing={<Switch checked={p.hideAmounts} onChange={p.onHideAmounts} label={t.hideAmounts} className="-me-2" />}
          />
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
              sub={p.reminders.on ? `${leadLabel(p.reminders.lead, t)} · ${timeLabel(p.reminders.time, t.locale)}`
                : p.reminders.nudge ? `${t.nudgeRow} · ${timeLabel(p.reminders.nudgeTime, t.locale)}` : t.remindersOff}
              leading={<IconTile icon={Bell} hue="tomato" />}
              trailing={<Next />}
              onClick={p.onReminders}
            />
          )}
          {p.deviceBackup !== null && (
            <Row
              label={t.deviceBackup}
              sub={p.deviceBackup ? t.deviceBackupOn : t.deviceBackupOff}
              leading={<IconTile icon={CloudUpload} hue="sky" />}
              trailing={
                <Switch
                  checked={p.deviceBackup}
                  onChange={on => { if (!p.deviceBackupBusy) p.onDeviceBackup(on); }}
                  label={t.deviceBackup}
                  className={`-me-2 ${p.deviceBackupBusy ? 'opacity-60' : ''}`}
                />
              }
            />
          )}
        </Group>
      </div>

      <div data-prefs="book">
        <Group title={t.bookSection}>
          <Row
            label={t.monthStartRow}
            sub={t.monthStartRowSub}
            leading={<IconTile icon={CalendarRange} hue="tomato" />}
            trailing={<Next value={fmt(t.monthStartValue, { day: p.monthStart })} />}
            onClick={p.onMonthStart}
          />
        </Group>
      </div>

      <div data-prefs="demo">
        <Group title={t.demoSection} footer={t.demoFooter}>
          {p.hasDemo ? (
            <Row
              label={t.demoRemove}
              sub={t.demoRemoveSub}
              leading={<IconTile icon={FlaskConicalOff} hue="stone" />}
              onClick={() => setConfirmDemo(true)}
            />
          ) : (
            <Row
              label={t.demoAdd}
              sub={t.demoAddSub}
              leading={<IconTile icon={FlaskConical} hue="mint" />}
              onClick={p.onAddDemo}
            />
          )}
        </Group>
      </div>

      {/* About the app: the card, then where to rate it, write to its maker and read the privacy policy. */}
      <div data-prefs="about" className="space-y-3">
        <section className="rounded-lg hero hero-glow hero-art overflow-hidden text-on-hero p-[18px]" aria-labelledby="about-title">
          <div className="flex items-center gap-3.5">
            <img src="/icon.svg" alt="" className="w-[52px] h-[52px] rounded-[14px] shrink-0 shadow-[0_0_0_1px_rgb(255_255_255/0.2)]" />
            <div className="min-w-0 flex-1">
              <h2 id="about-title" className="display text-heading font-semibold wrap-compound">{t.about}</h2>
              <p className="text-caption text-on-hero-mute tabular-nums">{fmt(t.version, { v: __APP_VERSION__ })}</p>
            </div>
          </div>
          <p className="mt-3 text-label text-on-hero-mute wrap-prose">{t.aboutBody}</p>
          {facts.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {facts.map(f => (
                <li key={f.text} className="min-h-[30px] ps-2.5 pe-3 py-1 rounded-full hero-panel inline-flex items-center gap-1.5 text-caption font-semibold text-on-hero tabular-nums">
                  <f.icon className="w-[15px] h-[15px] shrink-0 text-on-hero-soft" strokeWidth={2.2} aria-hidden="true" />
                  {f.text}
                </li>
              ))}
            </ul>
          )}
        </section>
        <Group>
          {p.onRate && <Row label={t.rateApp} leading={<IconTile icon={Star} hue="lemon" />} trailing={<Away />} onClick={p.onRate} />}
          <Row label={t.sendFeedback} sub={t.sendFeedbackSub} leading={<IconTile icon={Mail} hue="blue" />} trailing={<Away />} onClick={p.onFeedback} />
          <Row label={t.privacyPolicy} leading={<IconTile icon={ShieldCheck} hue="leaf" />} trailing={<Away />} onClick={p.onPrivacy} />
        </Group>
      </div>

      <div data-prefs="reset">
        {/* Last and alone: nothing else sits beside what erases everything. */}
        <Group>
          <Row label={t.deleteAll} danger leading={<IconTile icon={Trash2} hue="tomato" />} onClick={() => setConfirmDelete(true)} />
        </Group>
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
