/**
 * Reminder notifications via @notifee/react-native.
 *
 * Schedules OS-local notifications for the two reminder kinds (see
 * design/specs/mobile/global/reminders.md):
 *   - scheduled: one daily-repeating TimestampTrigger per enabled reminder
 *   - inactivity: a single one-shot trigger N hours out, re-armed on activity/foreground
 *
 * All triggers use SET_AND_ALLOW_WHILE_IDLE (inexact) to avoid the Play-restricted
 * SCHEDULE_EXACT_ALARM permission. Every call is defensive: if the native module is
 * absent (e.g. a JS-only reload against an older native build) we no-op rather than crash.
 */
import notifee, {
  AlarmType,
  AuthorizationStatus,
  EventType,
  RepeatFrequency,
  TriggerType,
  type TimestampTrigger,
} from '@notifee/react-native';
import { getReminders, type RemindersState } from '../../data/reminders';

const CHANNEL_ID = 'sereus-reminders';
const INACTIVITY_ID = 'reminder-inactivity';
const SCHED_PREFIX = 'reminder-sched-';

/** Deep-link payload a reminder tap carries; App reads this to open the new-entry screen. */
export const REMINDER_ROUTE = 'EditEntry';
export const REMINDER_PARAMS: Record<string, string> = { mode: 'new' };

function isReminderNotification(data: unknown): boolean {
  return !!data && (data as Record<string, unknown>).reminder === '1';
}

const NOTIF_DATA: Record<string, string> = { reminder: '1', route: REMINDER_ROUTE, mode: 'new' };

async function safe<T>(fn: () => Promise<T>, label: string): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(`[reminders] ${label} failed:`, e);
    return null;
  }
}

/** Create the Android channel. Call once at app startup (no-op on iOS). */
export async function initReminders(): Promise<void> {
  await safe(
    () =>
      notifee.createChannel({
        id: CHANNEL_ID,
        name: 'Reminders',
        importance: 4, // HIGH
      }),
    'createChannel',
  );
}

export async function requestReminderPermission(): Promise<boolean> {
  const settings = await safe(() => notifee.requestPermission(), 'requestPermission');
  return !!settings && settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
}

export async function checkReminderPermission(): Promise<boolean> {
  const settings = await safe(() => notifee.getNotificationSettings(), 'getNotificationSettings');
  return !!settings && settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
}

function trigger(timestamp: number, repeatDaily: boolean): TimestampTrigger {
  return {
    type: TriggerType.TIMESTAMP,
    timestamp,
    ...(repeatDaily ? { repeatFrequency: RepeatFrequency.DAILY } : {}),
    alarmManager: { type: AlarmType.SET_AND_ALLOW_WHILE_IDLE },
  };
}

/** Next occurrence (epoch ms) of an "HH:MM" local time, today if still ahead else tomorrow. */
function nextDailyTimestamp(timeOfDay: string): number {
  const [h, m] = timeOfDay.split(':').map(Number);
  const next = new Date();
  next.setHours(h, m, 0, 0);
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
  return next.getTime();
}

async function createReminder(
  id: string,
  title: string,
  body: string,
  ts: number,
  repeatDaily: boolean,
): Promise<void> {
  await safe(
    () =>
      notifee.createTriggerNotification(
        {
          id,
          title,
          body,
          android: {
            channelId: CHANNEL_ID,
            pressAction: { id: 'default', launchActivity: 'default' },
          },
          data: NOTIF_DATA,
        },
        trigger(ts, repeatDaily),
      ),
    `schedule ${id}`,
  );
}

/**
 * Cancel every reminder notification and re-create the currently-enabled ones.
 * @param opts.state       reminders to sync (defaults to the persisted state)
 * @param opts.inactivityFromMs  base time for the inactivity nudge (defaults to now)
 */
export async function syncReminders(opts?: {
  state?: RemindersState;
  inactivityFromMs?: number;
}): Promise<void> {
  const state = opts?.state ?? (await getReminders());

  // Cancel all previously-scheduled triggers (reminders are the only ones we schedule).
  await safe(() => notifee.cancelTriggerNotifications(), 'cancelTriggerNotifications');

  // Scheduled daily reminders.
  for (const r of state.scheduled) {
    if (!r.enabled) continue;
    await createReminder(
      `${SCHED_PREFIX}${r.id}`,
      r.label?.trim() || 'Reminder',
      'Tap to add an entry.',
      nextDailyTimestamp(r.timeOfDay),
      true,
    );
  }

  // Inactivity nudge (one-shot, re-armed on activity/foreground).
  if (state.inactivity.enabled && state.inactivity.intervalHours > 0) {
    const from = opts?.inactivityFromMs ?? Date.now();
    const ts = from + state.inactivity.intervalHours * 60 * 60 * 1000;
    // Only schedule if it's in the future; if the base time is already stale, arm from now.
    const when = ts > Date.now() ? ts : Date.now() + state.inactivity.intervalHours * 60 * 60 * 1000;
    await createReminder(
      INACTIVITY_ID,
      "Haven't logged in a while",
      'Tap to add an entry.',
      when,
      false,
    );
  }
}

/**
 * Re-arm the inactivity nudge relative to "now" (call after a log entry is created).
 * Leaves scheduled daily reminders untouched.
 */
export async function noteLogActivity(): Promise<void> {
  const state = await safe(() => getReminders(), 'getReminders(activity)');
  if (!state || !state.inactivity.enabled) return;
  // cancelNotification clears BOTH the pending trigger AND an already-delivered
  // nudge in the tray (cancelTriggerNotification alone leaves a fired one showing).
  await safe(() => notifee.cancelNotification(INACTIVITY_ID), 'clear inactivity');
  await createReminder(
    INACTIVITY_ID,
    "Haven't logged in a while",
    'Tap to add an entry.',
    Date.now() + state.inactivity.intervalHours * 60 * 60 * 1000,
    false,
  );
}

/**
 * Remove any *delivered* reminder notifications from the tray. Call whenever the
 * app is entered (cold start or returning to foreground): the user is present, so
 * a lingering "haven't logged" / scheduled nudge is moot. This does NOT re-arm or
 * reschedule anything (entering the app is not "logging") — it only clears the
 * stale visual; the next inactivity trigger is re-armed on the next log entry.
 */
export async function clearDeliveredReminders(): Promise<void> {
  const displayed = await safe(() => notifee.getDisplayedNotifications(), 'getDisplayedNotifications');
  if (!displayed) return;
  for (const d of displayed) {
    const id = d.id ?? d.notification?.id;
    if (id && isReminderNotification(d.notification?.data)) {
      await safe(() => notifee.cancelDisplayedNotification(id), 'clear delivered reminder');
    }
  }
}

/** If the app was cold-started by tapping a reminder, returns its route; else null. */
export async function getInitialReminderRoute(): Promise<{ route: string; params: Record<string, string> } | null> {
  const initial = await safe(() => notifee.getInitialNotification(), 'getInitialNotification');
  if (initial && isReminderNotification(initial.notification?.data)) {
    return { route: REMINDER_ROUTE, params: REMINDER_PARAMS };
  }
  return null;
}

/** Subscribe to foreground reminder taps. Returns an unsubscribe fn. */
export function onReminderPress(cb: () => void): () => void {
  try {
    return notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS && isReminderNotification(detail.notification?.data)) cb();
    });
  } catch {
    return () => {};
  }
}
