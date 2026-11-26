import { ArrowUpRight, CalendarDays, Gift, KeyRound, ListChecks, Mail, ShieldCheck, Smartphone, Star, UserX } from 'lucide-react';
import { Strings, fmt } from '../translations';
import { Group, IconTile, Row, Screen } from '../ui/Screen';

interface Props {
  t: Strings;
  onBack: () => void;
  /** How much the book holds, for the card: its started months and its entries (no amounts). */
  monthCount: number;
  entryCount: number;
  /** Plan 15: the store's review page — in the apps only; Mail with the versions; the privacy policy. */
  onRate?: () => void;
  onFeedback: () => void;
  onPrivacy: () => void;
}

/** A row's end when it opens something outside the app (the App Store, Mail, Safari): ↗. */
function Away() {
  return <ArrowUpRight className="shrink-0 w-5 h-5 text-fg-faint rtl:-scale-x-100" aria-hidden="true" />;
}

/**
 * *Über diese App* (November 2026, Ahmad: its card stood in the settings
 * before), pushed from the menu's *App* group:
 *
 *   1. the card on the hero — the icon, the name, the version, the tagline,
 *      how much the book holds (months and entries from two on, never an
 *      amount);
 *   2. *Darauf kannst du dich verlassen* — what the app promises, as the store
 *      listing says it: free without ads or subscriptions, no account, the
 *      data stays on the device and goes to no one, backups locked with the
 *      user's own password (plan 04). Plain rows, nothing to tap;
 *   3. rating (the apps only), feedback and the privacy policy — each opens
 *      something outside the app (↗).
 */
export function AboutView({ t, onBack, monthCount, entryCount, onRate, onFeedback, onPrivacy }: Props) {
  // From two on: the strings are plurals ("14 Monate").
  const facts = [
    ...(monthCount > 1 ? [{ icon: CalendarDays, text: fmt(t.averageSpanN, { n: monthCount }) }] : []),
    ...(entryCount > 1 ? [{ icon: ListChecks, text: fmt(t.tagEntries, { n: entryCount }) }] : []),
  ];
  const promises = [
    { icon: Gift, hue: 'berry', label: t.promiseFree },
    { icon: UserX, hue: 'stone', label: t.promiseAccount },
    { icon: Smartphone, hue: 'leaf', label: t.promiseDevice },
    { icon: KeyRound, hue: 'lemon', label: t.promiseBackup },
  ];
  return (
    <Screen title={t.aboutPageTitle} onBack={onBack} backLabel={t.back} tabbed>
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

      <Group title={t.aboutPromises}>
        {promises.map(x => <Row key={x.label} label={x.label} leading={<IconTile icon={x.icon} hue={x.hue} />} />)}
      </Group>

      <Group>
        {onRate && <Row label={t.rateApp} leading={<IconTile icon={Star} hue="lemon" />} trailing={<Away />} onClick={onRate} />}
        <Row label={t.sendFeedback} sub={t.sendFeedbackSub} leading={<IconTile icon={Mail} hue="blue" />} trailing={<Away />} onClick={onFeedback} />
        <Row label={t.privacyPolicy} leading={<IconTile icon={ShieldCheck} hue="leaf" />} trailing={<Away />} onClick={onPrivacy} />
      </Group>
    </Screen>
  );
}
