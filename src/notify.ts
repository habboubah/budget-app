import { LocalNotifications } from '@capacitor/local-notifications';
import { MonthKey } from './types';
import { PlannedReminder } from './reminders';
import { devNative, isNative } from './platform';

/*
 * The device side of the reminders: permission, swapping what is pending for
 * the plan (reminders.ts), and where a tap on one leads. iPhone app only —
 * the web has no reliable scheduled notifications.
 */

export const remindersAvailable = () => isNative() || devNative();

export type NotifyPermission = 'granted' | 'denied' | 'prompt';

const permissionOf = (display: string): NotifyPermission =>
  display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt';

export async function notifyPermission(): Promise<NotifyPermission> {
  if (!isNative()) return 'granted';
  try { return permissionOf((await LocalNotifications.checkPermissions()).display); } catch { return 'prompt'; }
}

/** Asks once (iOS shows its prompt the first time only); afterwards it just reports. */
export async function askNotify(): Promise<NotifyPermission> {
  if (!isNative()) return 'granted';
  try { return permissionOf((await LocalNotifications.requestPermissions()).display); } catch { return 'denied'; }
}

/** "YYYY-MM-DDTHH:MM" as a local Date. */
function localDate(at: string): Date {
  const [day, time] = at.split('T');
  const [y, m, d] = day.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

/** Every pending notification is one of the app's reminders: they all give way to the plan. */
export async function syncReminders(plan: PlannedReminder[]): Promise<void> {
  if (!isNative()) return;
  const { notifications } = await LocalNotifications.getPending();
  if (notifications.length) await LocalNotifications.cancel({ notifications: notifications.map(n => ({ id: n.id })) });
  if (!plan.length || (await notifyPermission()) !== 'granted') return;
  await LocalNotifications.schedule({
    notifications: plan.map(p => ({
      id: p.id,
      title: p.title,
      body: p.body,
      schedule: { at: localDate(p.at), allowWhileIdle: true },
      extra: { month: p.month, screen: p.screen ?? null },
    })),
  });
}

/** A tap on a reminder: the month it is about, or the contracts. */
export function onReminderTap(open: (target: { month: MonthKey; screen?: 'contracts' }) => void): () => void {
  if (!isNative()) return () => {};
  const handle = LocalNotifications.addListener('localNotificationActionPerformed', action => {
    const extra = action.notification.extra as { month?: unknown; screen?: unknown } | undefined;
    if (typeof extra?.month !== 'string' || !/^\d{4}-\d{2}$/.test(extra.month)) return;
    open({ month: extra.month, ...(extra.screen === 'contracts' ? { screen: 'contracts' as const } : {}) });
  });
  return () => { void handle.then(h => h.remove()); };
}
