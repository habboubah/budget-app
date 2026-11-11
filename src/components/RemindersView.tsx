import { CSSProperties, ReactNode, useEffect, useId, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { AppData } from '../types';
import { REMINDER_LEADS, ReminderPrefs, reminderPlan } from '../reminders';
import { NotifyPermission, askNotify, notifyPermission } from '../notify';
import { Strings, fmt } from '../translations';
import { Group, MenuRow, Screen } from '../ui/Screen';
import { Switch } from '../ui/Switch';

/** "Am Vortag", "3 Tage vorher". */
export function leadLabel(lead: number, t: Strings): string {
  return lead === 0 ? t.lead0 : lead === 1 ? t.lead1 : lead === 7 ? t.lead7 : fmt(t.leadDays, { n: lead });
}

/** "09:00" in the locale's way of writing a time. */
export function timeLabel(time: string, locale: string): string {
  const [hh, mm] = time.split(':').map(Number);
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(2026, 0, 1, hh, mm));
}

/** A planned reminder's moment: "Mo., 9. Nov., 09:00". */
function whenLabel(at: string, locale: string): string {
  const [day, time] = at.split('T');
  const [y, m, d] = day.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    .format(new Date(y, m - 1, d, hh, mm));
}

/** A settings row with its own control at the end (a switch, a time). */
function ControlRow({ label, labelId, children }: { label: string; labelId?: string; children: ReactNode }) {
  return (
    <div className="relative min-h-[52px] ps-4 pe-2 py-1 flex items-center gap-3" style={{ '--sep': '1rem' } as CSSProperties}>
      <span id={labelId} className="min-w-0 flex-1 text-body text-fg wrap-compound">{label}</span>
      {children}
    </div>
  );
}

/**
 * Optionen → An offene Posten erinnern (pushed): on or off, at what time and
 * how many days ahead, with or without amounts (off: notifications show on
 * the lock screen), and the next few reminders as they will go off.
 */
export function RemindersView({ data, prefs, t, onBack, onChange }: {
  data: AppData;
  prefs: ReminderPrefs;
  t: Strings;
  onBack: () => void;
  onChange: (patch: Partial<ReminderPrefs>) => void;
}) {
  const timeId = useId();
  const [permission, setPermission] = useState<NotifyPermission>('granted');
  useEffect(() => { void notifyPermission().then(setPermission); }, []);
  const next = useMemo(() => reminderPlan(data, prefs, t).slice(0, 5), [data, prefs, t]);

  const toggle = async (on: boolean) => {
    onChange({ on });
    if (on) setPermission(await askNotify());
  };
  const toggleNudge = async (nudge: boolean) => {
    onChange({ nudge });
    if (nudge) setPermission(await askNotify());
  };
  const nudgeTimeId = useId();
  const any = prefs.on || prefs.nudge;

  return (
    <Screen title={t.remindersTitle} subtitle={t.remindersIntro} onBack={onBack} backLabel={t.back} tabbed>
      <Group>
        <ControlRow label={t.remindersRow}>
          <Switch checked={prefs.on} onChange={on => void toggle(on)} label={t.remindersRow} />
        </ControlRow>
      </Group>

      {any && permission === 'denied' && (
        <p role="alert" className="rounded-md bg-warn-dim px-4 py-3 flex items-start gap-3 text-label text-fg wrap-prose">
          <AlertCircle className="w-5 h-5 text-warn shrink-0 mt-px" aria-hidden="true" />
          <span>{t.remindersDenied}</span>
        </p>
      )}

      {prefs.on && (
        <>
          <Group footer={t.remindersAmountsHint}>
            <ControlRow label={t.remindersTime} labelId={timeId}>
              <input
                type="time"
                aria-labelledby={timeId}
                value={prefs.time}
                onChange={e => { if (/^\d{2}:\d{2}$/.test(e.target.value)) onChange({ time: e.target.value }); }}
                className="min-h-tap px-3 rounded-sm bg-surface-2 text-body text-fg tabular-nums focus-visible:ring-focus"
              />
            </ControlRow>
            <MenuRow<string>
              label={t.remindersLead}
              value={String(prefs.lead)}
              onChange={v => onChange({ lead: Number(v) })}
              options={REMINDER_LEADS.map(n => ({ value: String(n), label: leadLabel(n, t) }))}
            />
            <ControlRow label={t.remindersAmounts}>
              <Switch checked={prefs.amounts} onChange={amounts => onChange({ amounts })} label={t.remindersAmounts} />
            </ControlRow>
          </Group>

        </>
      )}

      {/* The daily nudge: its own switch and time, whatever the bill reminders do. */}
      <Group footer={t.nudgeHint}>
        <ControlRow label={t.nudgeRow}>
          <Switch checked={prefs.nudge} onChange={on => void toggleNudge(on)} label={t.nudgeRow} />
        </ControlRow>
        {prefs.nudge && (
          <ControlRow label={t.remindersTime} labelId={nudgeTimeId}>
            <input
              type="time"
              aria-labelledby={nudgeTimeId}
              value={prefs.nudgeTime}
              onChange={e => { if (/^\d{2}:\d{2}$/.test(e.target.value)) onChange({ nudgeTime: e.target.value }); }}
              className="min-h-tap px-3 rounded-sm bg-surface-2 text-body text-fg tabular-nums focus-visible:ring-focus"
            />
          </ControlRow>
        )}
      </Group>

      {any && (
        <Group title={t.remindersNext}>
          {next.length === 0 ? (
            <p className="px-4 py-3.5 text-label text-fg-mute wrap-prose">{t.remindersNone}</p>
          ) : next.map(r => (
            <div key={r.id} className="relative px-4 py-2.5" style={{ '--sep': '1rem' } as CSSProperties}>
              <p className="text-caption text-fg-mute tabular-nums">{whenLabel(r.at, t.locale)}</p>
              <p className="text-body text-fg wrap-prose mt-0.5">{r.title}</p>
            </div>
          ))}
        </Group>
      )}
    </Screen>
  );
}
