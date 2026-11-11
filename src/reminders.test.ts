import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REMINDERS, NUDGE_DAYS, REMINDER_LIMIT, ReminderPrefs, ReminderSource, billSource, normalizeReminderPrefs, nudgePlan, reminderId, reminderPlan, returnSource, warrantySource,
} from './reminders';
import { defaultCategories } from './data/defaults';
import { carryOver } from './logic';
import translations from './translations';
import { AppData, Entry } from './types';

const t = translations.de;
const cats = defaultCategories();
/** Intl puts a no-break space before "€". */
const sp = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ');
let n = 0;
function e(month: string, categoryId: string, name: string, euros: number, extra: Partial<Entry> = {}): Entry {
  n++;
  return { id: `r${n}`, month, categoryId, name, amount: Math.round(euros * 100), paid: false, repeat: 'none', seriesId: `s-${name}`, createdAt: n, ...extra };
}
const on: ReminderPrefs = { ...DEFAULT_REMINDERS, on: true };
const data = (entries: Entry[], extra: Partial<AppData> = {}): AppData => ({
  categories: cats, entries, months: [{ key: '2026-11', startedAt: 1 }], ...extra,
});
// Saturday 7 November 2026, 08:00 — before the 09:00 reminders.
const morning = new Date(2026, 10, 7, 8, 0);
const noon = new Date(2026, 10, 7, 12, 0);

describe('reminder preferences', () => {
  it('starts off, at nine, the day before, without amounts', () => {
    expect(normalizeReminderPrefs(undefined)).toMatchObject({ on: false, time: '09:00', lead: 1, amounts: false });
  });
  it('drops what it cannot use', () => {
    expect(normalizeReminderPrefs({ on: true, time: '25:00', lead: 5, amounts: 'yes' })).toMatchObject({ on: true, time: '09:00', lead: 1, amounts: false });
    expect(normalizeReminderPrefs({ on: true, time: '07:30', lead: 3, amounts: true })).toMatchObject({ on: true, time: '07:30', lead: 3, amounts: true });
  });
});

describe('the reminder plan', () => {
  it('is empty while switched off', () => {
    expect(reminderPlan(data([e('2026-11', 'fixed', 'Strom', 83, { date: '2026-11-08' })]), DEFAULT_REMINDERS, t, morning)).toEqual([]);
  });

  it('reminds the day before, at the time chosen, without the amount', () => {
    const plan = reminderPlan(data([e('2026-11', 'fixed', 'Strom', 83, { date: '2026-11-09' })]), on, t, morning);
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ at: '2026-11-08T09:00', title: 'Morgen fällig: Strom', body: 'Tippe, um den Monat zu öffnen.', month: '2026-11' });
    expect(plan[0].title + plan[0].body).not.toMatch(/€|83/);
  });

  it('shows the sum once amounts are on', () => {
    const plan = reminderPlan(data([e('2026-11', 'fixed', 'Strom', 83, { date: '2026-11-09' })]), { ...on, amounts: true }, t, morning);
    expect(sp(plan[0].title)).toBe('Morgen fällig: Strom · 83,00 €');
  });

  it('goes off at the next slot when the lead time has passed, as long as the day has not', () => {
    // Due tomorrow, three days ahead wanted: too late for that, so today at nine…
    const due = [e('2026-11', 'fixed', 'Internet', 40, { date: '2026-11-08' })];
    expect(reminderPlan(data(due), { ...on, lead: 3 }, t, morning)[0]).toMatchObject({ at: '2026-11-07T09:00', title: 'Morgen fällig: Internet' });
    // …and after nine, tomorrow at nine — on the day.
    expect(reminderPlan(data(due), { ...on, lead: 3 }, t, noon)[0]).toMatchObject({ at: '2026-11-08T09:00', title: 'Heute fällig: Internet' });
    // Due today and nine has passed: nothing left to remind before it.
    expect(reminderPlan(data([e('2026-11', 'fixed', 'Kita', 180, { date: '2026-11-07' })]), on, t, noon)).toEqual([]);
  });

  it('says how many days are left when reminding further ahead', () => {
    const plan = reminderPlan(data([e('2026-11', 'fixed', 'Versicherung', 6.5, { date: '2026-11-20' })]), { ...on, lead: 3 }, t, morning);
    expect(plan[0]).toMatchObject({ at: '2026-11-17T09:00', title: 'In 3 Tagen fällig: Versicherung' });
  });

  it('puts the bills of one day into one notification', () => {
    const plan = reminderPlan(data([
      e('2026-11', 'fixed', 'Miete', 1050, { date: '2026-11-15' }),
      e('2026-11', 'fixed', 'Strom', 83, { date: '2026-11-15' }),
      e('2026-11', 'car', 'Kfz-Versicherung', 54.26, { date: '2026-11-15' }),
      e('2026-11', 'fixed', 'Handy', 19.99, { date: '2026-11-16' }),
    ]), { ...on, amounts: true }, t, morning);
    expect(plan.map(p => sp(p.title))).toEqual([
      'Morgen fällig: Miete, Strom und 1 weitere · 1.187,26 €',
      'Morgen fällig: Handy · 19,99 €',
    ]);
  });

  it('leaves out what is paid, income, past and undated', () => {
    const plan = reminderPlan(data([
      e('2026-11', 'fixed', 'Miete', 1050, { date: '2026-11-15', paid: true }),
      e('2026-11', 'income', 'Gehalt', 3000, { date: '2026-11-28' }),
      e('2026-11', 'fixed', 'Strom', 83, { date: '2026-11-03' }),
      e('2026-11', 'extra', 'Geschenk', 30),
    ]), on, t, morning);
    expect(plan).toEqual([]);
  });

  it('uses the due day when an entry has no date', () => {
    const plan = reminderPlan(data([e('2026-11', 'fixed', 'Fitnessstudio', 24.9, { dueDay: 15 })]), on, t, morning);
    expect(plan[0].at).toBe('2026-11-14T09:00');
  });

  it('looks into the next month: what starting it will bring along', () => {
    // Rent every month on the 1st; December isn't started yet.
    const rent = e('2026-11', 'fixed', 'Miete', 1050, { date: '2026-11-01', paid: true, repeat: 'monthly', seriesId: 'rent' });
    const plan = reminderPlan(data([rent]), on, t, new Date(2026, 10, 29, 8, 0));
    expect(plan[0]).toMatchObject({ at: '2026-11-30T09:00', title: 'Morgen fällig: Miete', month: '2026-12' });
  });

  it('reminds a week before the last day to cancel a contract, and opens the contracts', () => {
    const insurance = e('2026-11', 'fixed', 'Handyvertrag', 25, { date: '2026-11-18', paid: true, repeat: 'monthly', seriesId: 'phone' });
    const plan = reminderPlan(data([insurance], { contracts: { phone: { end: '2026-12-17', notice: 1 } } }), on, t, morning);
    const cancel = plan.find(p => p.screen === 'contracts');
    expect(cancel).toMatchObject({ at: '2026-11-10T09:00', title: 'Kündigen bis 17. Nov.: Handyvertrag', body: 'Sonst verlängert sich der Vertrag.' });
  });

  it('keeps to what iOS holds, soonest first', () => {
    const many = Array.from({ length: 80 }, (_, i) => {
      const d = new Date(2026, 10, 8 + i);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return e(month, 'extra', `Posten ${i}`, 10, { date: `${month}-${String(d.getDate()).padStart(2, '0')}` });
    });
    // Only the running month and the next count; that's still more than 60 days' worth here.
    const months = [{ key: '2026-11', startedAt: 1 }, { key: '2026-12', startedAt: 1 }];
    const plan = reminderPlan({ categories: cats, entries: many, months }, on, t, morning);
    expect(plan.length).toBeLessThanOrEqual(REMINDER_LIMIT);
    expect(plan[0].at).toBe('2026-11-07T09:00');
    expect([...plan].sort((a, b) => (a.at < b.at ? -1 : 1))).toEqual(plan);
  });

  it('gives a kind and day the same id every time, and others another', () => {
    expect(reminderId('bill:2026-11-15')).toBe(reminderId('bill:2026-11-15'));
    expect(reminderId('bill:2026-11-15')).not.toBe(reminderId('bill:2026-11-16'));
    expect(reminderId('bill:2026-11-15')).not.toBe(reminderId('contract:2026-11-15'));
    const id = reminderId('anything');
    expect(Number.isInteger(id) && id > 0 && id < 2 ** 31).toBe(true);
  });

  it('takes more sources without touching the scheduling', () => {
    const backup: ReminderSource = {
      kind: 'backup',
      lead: 0,
      items: () => [{ day: '2026-11-10', name: 'Sicherung', month: '2026-11' }],
      text: () => ({ title: 'Zeit für eine Sicherung', body: '' }),
    };
    const plan = reminderPlan(data([]), on, t, morning, [billSource, backup]);
    expect(plan).toEqual([expect.objectContaining({ at: '2026-11-10T09:00', title: 'Zeit für eine Sicherung', id: reminderId('backup:2026-11-10') })]);
  });
});

describe('the daily nudge', () => {
  const nudge: ReminderPrefs = { ...DEFAULT_REMINDERS, nudge: true, nudgeTime: '20:00' };
  const at = (plan: { at: string }[]) => plan.map(p => p.at);

  it('goes off once a day for the next five days, today included while its time is still to come', () => {
    const plan = nudgePlan(data([]), nudge, t, noon);
    expect(at(plan)).toEqual(['2026-11-07T20:00', '2026-11-08T20:00', '2026-11-09T20:00', '2026-11-10T20:00', '2026-11-11T20:00']);
    expect(plan[0]).toMatchObject({ title: t.nudgeTitle, body: t.nudgeBody });
    expect(new Set(plan.map(p => p.id)).size).toBe(NUDGE_DAYS);
  });

  it('skips today once something was entered today, or once the time has passed', () => {
    const own = e('2026-11', 'groceries', 'Lidl', 12, { id: 'own', seriesId: 'own', createdAt: noon.getTime() - 3600_000 });
    expect(at(nudgePlan(data([own]), nudge, t, noon))[0]).toBe('2026-11-08T20:00');
    expect(at(nudgePlan(data([]), nudge, t, new Date(2026, 10, 7, 21, 0)))[0]).toBe('2026-11-08T20:00');
  });

  it('doesn’t take the copies a new month brings along for something entered', () => {
    const carried = e('2026-11', 'fixed', 'Miete', 950, { id: 'copy', seriesId: 'rent', createdAt: noon.getTime() - 60_000 });
    expect(at(nudgePlan(data([carried]), nudge, t, noon))[0]).toBe('2026-11-07T20:00');
  });

  it('runs beside the bill reminders, and without them', () => {
    const bill = e('2026-11', 'fixed', 'Strom', 85, { date: '2026-11-09' });
    expect(reminderPlan(data([bill]), nudge, t, noon).every(p => p.title === t.nudgeTitle)).toBe(true);
    const both = reminderPlan(data([bill]), { ...nudge, on: true }, t, noon);
    expect(both.filter(p => p.title === t.nudgeTitle)).toHaveLength(NUDGE_DAYS);
    expect(both.some(p => p.title !== t.nudgeTitle)).toBe(true);
    expect(reminderPlan(data([bill]), DEFAULT_REMINDERS, t, noon)).toEqual([]);
  });

  it('keeps a stored time only when it is one', () => {
    expect(normalizeReminderPrefs({ nudge: true, nudgeTime: '7pm' })).toMatchObject({ nudge: true, nudgeTime: '20:00' });
    expect(normalizeReminderPrefs({ nudge: true, nudgeTime: '07:30' }).nudgeTime).toBe('07:30');
    expect(normalizeReminderPrefs({}).nudge).toBe(false);
  });
});

describe('an awaited refund', () => {
  it('is not a bill to be reminded of', () => {
    const refund = e('2026-11', 'clothing', 'Zalando', -40, { refund: true, date: '2026-11-09' });
    expect(billSource.items(data([refund]), morning)).toEqual([]);
  });
});

describe('what a receipt is kept for (schema 27)', () => {
  const kettle = e('2026-11', 'extra', 'Wasserkocher', 34.99, { paid: true, date: '2026-11-05', returnUntil: '2026-11-19', warrantyUntil: '2028-11-05' });

  it('reminds three days before the last day to return it', () => {
    const plan = reminderPlan(data([kettle]), on, t, morning);
    const back = plan.find(p => p.title.includes('Rückgabe'))!;
    expect(back.at).toBe('2026-11-16T09:00');
    expect(sp(back.title)).toBe('Rückgabe noch bis 19. Nov.: Wasserkocher');
    expect(back.body).toBe(t.remindReceiptBody);
  });

  it('reminds a month before the warranty ends, and says nothing once a day has passed', () => {
    const late = new Date(2028, 9, 1, 8, 0);
    const plan = reminderPlan(data([kettle]), on, t, late);
    expect(plan.map(p => p.at)).toEqual(['2028-10-06T09:00']);
    expect(sp(plan[0].title)).toBe('Garantie endet am 5. Nov.: Wasserkocher');
    expect(warrantySource.items(data([kettle]), new Date(2028, 10, 6))).toEqual([]);
    expect(returnSource.items(data([kettle]), new Date(2026, 10, 20))).toEqual([]);
  });

  it('is not carried into the next month with a recurring entry', () => {
    const [copy] = carryOver([{ ...kettle, repeat: 'monthly' }], '2026-12', 1);
    expect([copy.returnUntil, copy.warrantyUntil]).toEqual([undefined, undefined]);
  });
});
