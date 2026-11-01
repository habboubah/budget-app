import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// Every call is fire-and-forget and swallows its error: on the web build the
// plugin throws "not implemented", and a missing buzz must never break a save.
const safe = (fn: () => Promise<unknown>) => { void fn().catch(() => {}); };

export const tapLight = () => safe(() => Haptics.impact({ style: ImpactStyle.Light }));
export const tapMedium = () => safe(() => Haptics.impact({ style: ImpactStyle.Medium }));
export const notifySuccess = () => safe(() => Haptics.notification({ type: NotificationType.Success }));
export const notifyWarning = () => safe(() => Haptics.notification({ type: NotificationType.Warning }));
