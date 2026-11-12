import React, { CSSProperties, ReactNode, useId, useState } from 'react';
import { ArrowUpRight, Bell, CalendarDays, Check, ChevronRight, CloudUpload, Coins, Compass, Download, EyeOff, Filter, FlaskConical, FlaskConicalOff, Fingerprint, Landmark, Languages, ListChecks, Lock, Luggage, Mail, Palette, ScanFace, ShieldCheck, Star, SunMoon, Tags, Trash2, Wallet, HandCoins, CalendarRange, Zap } from 'lucide-react';
import { ACCENTS, Accent, ThemeMode } from '../types';
import { CURRENCIES, Currency, currencyName } from '../currency';
import { LANGUAGE_NAMES, Language, Strings, fmt, languages } from '../translations';
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
  /** How much the book holds, for the card at the top: its started months and its entries (no amounts). */
  monthCount: number;
  entryCount: number;
  categoryCount: number;
  onLanguage: (l: Language) => void;
  onTheme: (m: ThemeMode) => void;
  onAccent: (a: Accent) => void;
  currency: Currency;
  onCurrency: (c: Currency) => void;
  /** The day the book's month begins (plan 32). */
  monthStart: number;
  onMonthStart: () => void;
  onCategories: () => void;
  favoriteCount: number;
  onFavorites: () => void;
  ruleCount: number;
  onRules: () => void;
  /** How many accounts the book has (1 until another is added, plan 30). */
  accountCount: number;
  onAccounts: () => void;
  /** How many debts the book has (plan 31). */
  debtCount: number;
  onDebts: () => void;
  onProjects: () => void;
  projectCount: number;
  onTax: () => void;
  /** Pushes "Sichern und übertragen": backup, Excel, CSV. */
  onTransfer: () => void;
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
  /** Plan 19, iPhone only: the guide to the Shortcuts automations. */
  onCapture?: () => void;
  /** Über Spartopf (plan 15): the App Store's review page — iPhone app only; Mail with the versions; the privacy policy. */
  onRate?: () => void;
  onFeedback: () => void;
  onPrivacy: () => void;
  /** Pushes the guide (src/guide.ts): every feature explained, and the short tour. */
  onGuide: () => void;
}

/** A row's end when it opens something outside the app (the App Store, Mail, Safari): ↗. */
function Away() {
  return <ArrowUpRight className="shrink-0 w-5 h-5 text-fg-faint rtl:-scale-x-100" aria-hidden="true" />;
}

/** A row's end when it pushes a screen: a value (a count, a day) in a soft pill, then ›. */
function Next({ value }: { value?: ReactNode }) {
  return (
    <span className="shrink-0 flex items-center gap-1.5 text-fg-mute">
      {value !== undefined && (
        <span className="min-w-[1.75rem] min-h-[1.5rem] px-2 rounded-full bg-surface-2 inline-flex items-center justify-center text-caption font-semibold tabular-nums">{value}</span>
      )}
      <ChevronRight className="w-5 h-5 text-fg-faint rtl:rotate-180" aria-hidden="true" />
    </span>
  );
}

/**
 * One of the two cards under the header — the guide, and backup and transfer:
 * where help and safety are looked for, so they are large and first. A card
 * that is one button (it gives a little under the finger); the two sit side
 * by side and stack when large text no longer fits them abreast.
 */
function QuickTile({ icon, hue, label, sub, onClick, tour }: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  hue: string;
  label: string;
  sub: string;
  onClick: () => void;
  /** What a tour points at (src/guide.ts). */
  tour?: string;
}) {
  return (
    <button
      type="button"
      data-tour={tour}
      onClick={() => { tapLight(); onClick(); }}
      // A column from the top: a button would centre its content, and the taller card's icon would sit lower than its neighbour's.
      className="flex-1 basis-[9.5rem] min-w-0 rounded-md bg-surface card-edge press p-[14px] flex flex-col items-stretch justify-start text-start focus-visible:ring-focus"
    >
      <span className="flex items-center justify-between gap-2">
        <IconTile icon={icon} hue={hue} />
        <ChevronRight className="w-5 h-5 text-fg-faint rtl:rotate-180" aria-hidden="true" />
      </span>
      <span className="block mt-2.5 text-body font-semibold text-fg wrap-compound">{label}</span>
      <span className="block mt-0.5 text-caption text-fg-mute wrap-compound">{sub}</span>
    </button>
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
 * Optionen, in the order they are needed rather than the order they were
 * built:
 *
 *   1. the header on the hero — what the app is, its version, how much the
 *      book holds (months and entries; never an amount);
 *   2. two large cards: the guide, and backup and transfer;
 *   3. *Haushaltsbuch* — what every book has: categories and budgets,
 *      accounts, favourites, the day the month begins;
 *   4. *Weitere Funktionen* — what a book may use: debts, trips and projects,
 *      the tax list, import rules, automatic capture (iPhone);
 *   5. *Darstellung* — language, light or dark, the colour, the currency
 *      (the guide sends people here by this name: keep those four in it);
 *   6. *Sicherheit und Mitteilungen* — hiding amounts first (every device
 *      has it), then the lock, reminders and the phone's backup (apps only);
 *   7. *Ausprobieren*, *Über Spartopf*, and last, on its own, resetting.
 *
 * Every icon tile in a group has its own colour, so a row is found by it. A
 * later feature joins its group; a new group needs a reason.
 */
export function SettingsView(p: Props) {
  const { t } = p;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);
  /** A currency change only relabels, so confirm it once before applying. */
  const [pendingCurrency, setPendingCurrency] = useState<Currency | null>(null);
  const lockLabel = p.lockKind === 'faceId' ? t.lockFaceId : p.lockKind === 'touchId' ? t.lockTouchId : t.lockCode;
  const LockIcon = p.lockKind === 'faceId' ? ScanFace : p.lockKind === 'touchId' ? Fingerprint : Lock;
  // From two on: the strings are plurals ("14 Monate").
  const facts = [
    ...(p.monthCount > 1 ? [{ icon: CalendarDays, text: fmt(t.averageSpanN, { n: p.monthCount }) }] : []),
    ...(p.entryCount > 1 ? [{ icon: ListChecks, text: fmt(t.tagEntries, { n: p.entryCount }) }] : []),
  ];

  return (
    <Screen title={t.tabSettings} tabbed>
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

      {/* Where help and safety are looked for: large, and first. */}
      <div className="flex flex-wrap gap-[12px]">
        <QuickTile icon={Compass} hue="blue" label={t.guideTitle} sub={t.guideRowSub} onClick={p.onGuide} />
        <QuickTile icon={Download} hue="sky" label={t.transferTitle} sub={t.transferRowSub} onClick={p.onTransfer} tour="set-transfer" />
      </div>

      <Group title={t.bookSection} tour="set-book">
        <Row
          label={t.categoriesTitle}
          leading={<IconTile icon={Tags} hue="lavender" />}
          trailing={<Next value={p.categoryCount} />}
          onClick={p.onCategories}
        />
        <Row
          label={t.accountsTitle}
          sub={t.accountsRowSub}
          leading={<IconTile icon={Wallet} hue="leaf" />}
          trailing={<Next value={p.accountCount > 1 ? p.accountCount : undefined} />}
          onClick={p.onAccounts}
        />
        <Row
          label={t.favorites}
          sub={t.favoritesSub}
          leading={<IconTile icon={Star} hue="lemon" />}
          trailing={<Next value={p.favoriteCount || undefined} />}
          onClick={p.onFavorites}
        />
        <Row
          label={t.monthStartRow}
          sub={t.monthStartRowSub}
          leading={<IconTile icon={CalendarRange} hue="tomato" />}
          trailing={<Next value={fmt(t.monthStartValue, { day: p.monthStart })} />}
          onClick={p.onMonthStart}
        />
      </Group>

      <Group title={t.moreSection} tour="set-more">
        <Row
          label={t.debtsTitle}
          sub={t.debtsRowSub}
          leading={<IconTile icon={HandCoins} hue="carrot" />}
          trailing={<Next value={p.debtCount || undefined} />}
          onClick={p.onDebts}
        />
        <Row
          label={t.projectsTitle}
          sub={t.projectsRowSub}
          leading={<IconTile icon={Luggage} hue="mint" />}
          trailing={<Next value={p.projectCount || undefined} />}
          onClick={p.onProjects}
        />
        <Row
          label={t.taxTitle}
          sub={t.taxRowSub}
          leading={<IconTile icon={Landmark} hue="stone" />}
          trailing={<Next />}
          onClick={p.onTax}
        />
        <Row
          label={t.rulesRow}
          sub={t.rulesRowSub}
          leading={<IconTile icon={Filter} hue="plum" />}
          trailing={<Next value={p.ruleCount || undefined} />}
          onClick={p.onRules}
        />
        {p.onCapture && (
          <Row
            label={t.captureRow}
            sub={t.captureRowSub}
            leading={<IconTile icon={Zap} hue="lemon" />}
            trailing={<Next />}
            onClick={p.onCapture}
          />
        )}
      </Group>

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
          onChange={c => { if (c !== p.currency) setPendingCurrency(c); }}
          options={CURRENCIES.map(c => ({ value: c, label: currencyName(c, t.locale) }))}
        />
      </Group>

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

      <Group title={t.aboutSection}>
        {p.onRate && <Row label={t.rateApp} leading={<IconTile icon={Star} hue="lemon" />} trailing={<Away />} onClick={p.onRate} />}
        <Row label={t.sendFeedback} sub={t.sendFeedbackSub} leading={<IconTile icon={Mail} hue="blue" />} trailing={<Away />} onClick={p.onFeedback} />
        <Row label={t.privacyPolicy} leading={<IconTile icon={ShieldCheck} hue="leaf" />} trailing={<Away />} onClick={p.onPrivacy} />
      </Group>

      {/* Last and alone: nothing else sits beside what erases everything. */}
      <Group>
        <Row label={t.deleteAll} danger leading={<IconTile icon={Trash2} hue="tomato" />} onClick={() => setConfirmDelete(true)} />
      </Group>

      <Confirm
        open={!!pendingCurrency}
        title={t.currencyChangeTitle}
        body={t.currencyChangeBody}
        confirmLabel={t.currencyChange}
        cancelLabel={t.cancel}
        onCancel={() => setPendingCurrency(null)}
        onConfirm={() => { if (pendingCurrency) p.onCurrency(pendingCurrency); setPendingCurrency(null); }}
      />
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
