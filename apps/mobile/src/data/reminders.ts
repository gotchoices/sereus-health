/**
 * Device-local reminder storage.
 *
 * Reminders schedule local OS notifications on THIS device, so — unlike log data and
 * the catalog — they are NOT written to the shared cadre schema. They live in
 * AsyncStorage under a single key. See design/specs/mobile/global/reminders.md.
 *
 * This module is pure persistence: it never touches notifee. Callers mutate the store
 * and then call `syncReminders()` (services/reminders/notifications) to (re)schedule.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { newUuid } from '../util/id';

const KEY = '@sereus/reminders:v1';

/** A single "nudge me if I haven't logged in N hours" reminder. */
export interface InactivityReminder {
  enabled: boolean;
  /** 1–12 hours when enabled. */
  intervalHours: number;
}

/** A daily reminder that fires at a fixed local time of day. */
export interface ScheduledReminder {
  id: string;
  /** "HH:MM" in 24-hour local time. */
  timeOfDay: string;
  label?: string;
  enabled: boolean;
}

export interface RemindersState {
  inactivity: InactivityReminder;
  scheduled: ScheduledReminder[];
}

export const DEFAULT_REMINDERS: RemindersState = {
  inactivity: { enabled: false, intervalHours: 4 },
  scheduled: [],
};

/** Coerce arbitrary input to a valid "HH:MM" 24h string (defaults to 08:00). */
export function normalizeTimeOfDay(input: unknown): string {
  const m = typeof input === 'string' ? input.match(/^\s*(\d{1,2}):(\d{2})/) : null;
  let h = m ? parseInt(m[1], 10) : 8;
  let min = m ? parseInt(m[2], 10) : 0;
  if (!Number.isFinite(h) || h < 0 || h > 23) h = 8;
  if (!Number.isFinite(min) || min < 0 || min > 59) min = 0;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(h)}:${p(min)}`;
}

function coerce(raw: unknown): RemindersState {
  const obj = (raw ?? {}) as Partial<RemindersState>;
  const inact = (obj.inactivity ?? {}) as Partial<InactivityReminder>;
  const hours = Number(inact.intervalHours);
  const scheduled = Array.isArray(obj.scheduled) ? obj.scheduled : [];
  return {
    inactivity: {
      enabled: !!inact.enabled,
      intervalHours: Number.isFinite(hours) && hours >= 1 && hours <= 12 ? Math.round(hours) : 4,
    },
    scheduled: scheduled
      .filter((r): r is ScheduledReminder => !!r && typeof (r as ScheduledReminder).id === 'string')
      .map((r) => ({
        id: r.id,
        timeOfDay: normalizeTimeOfDay(r.timeOfDay),
        label: typeof r.label === 'string' && r.label.trim() ? r.label.trim() : undefined,
        enabled: r.enabled !== false,
      })),
  };
}

export async function getReminders(): Promise<RemindersState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_REMINDERS };
    return coerce(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_REMINDERS };
  }
}

export async function setReminders(state: RemindersState): Promise<RemindersState> {
  const next = coerce(state);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

// --- Mutations (return the new state; caller re-syncs notifications) -------------

/** Set the inactivity nudge. `null`/`0`/negative turns it off. */
export async function setInactivity(intervalHours: number | null): Promise<RemindersState> {
  const state = await getReminders();
  if (intervalHours == null || intervalHours <= 0) {
    state.inactivity = { enabled: false, intervalHours: state.inactivity.intervalHours };
  } else {
    state.inactivity = {
      enabled: true,
      intervalHours: Math.max(1, Math.min(12, Math.round(intervalHours))),
    };
  }
  return setReminders(state);
}

export async function addScheduled(input: {
  timeOfDay: string;
  label?: string;
  enabled?: boolean;
}): Promise<{ state: RemindersState; id: string }> {
  const state = await getReminders();
  const id = newUuid();
  state.scheduled.push({
    id,
    timeOfDay: normalizeTimeOfDay(input.timeOfDay),
    label: input.label?.trim() || undefined,
    enabled: input.enabled !== false,
  });
  state.scheduled.sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay));
  return { state: await setReminders(state), id };
}

export async function updateScheduled(
  id: string,
  patch: { timeOfDay?: string; label?: string; enabled?: boolean },
): Promise<RemindersState> {
  const state = await getReminders();
  const r = state.scheduled.find((x) => x.id === id);
  if (r) {
    if (patch.timeOfDay !== undefined) r.timeOfDay = normalizeTimeOfDay(patch.timeOfDay);
    if (patch.label !== undefined) r.label = patch.label?.trim() || undefined;
    if (patch.enabled !== undefined) r.enabled = patch.enabled;
    state.scheduled.sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay));
  }
  return setReminders(state);
}

export async function deleteScheduled(id: string): Promise<RemindersState> {
  const state = await getReminders();
  state.scheduled = state.scheduled.filter((x) => x.id !== id);
  return setReminders(state);
}
