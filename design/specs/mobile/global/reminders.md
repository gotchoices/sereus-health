# Reminders — Architecture

Reminders schedule **local notifications** on one device. Unlike log data and the
catalog (which replicate across the cadre via the Optimystic strand), reminders are
**device-specific** and are **not** stored in the shared SQL schema.

## Storage

- Persisted device-locally via `AsyncStorage` under a single key (`@sereus/reminders:v1`).
- Shape:
  - `inactivity`: `{ enabled: boolean, intervalHours: number }` (a single nudge).
  - `scheduled`: array of `{ id, timeOfDay: "HH:MM", label?: string, enabled: boolean }`.
- A reminder may reference catalog ids (from the shared schema), but the reminder record
  itself stays local.

### Rationale

A reminder fires an OS notification on a specific handset, keyed by OS-assigned ids that
are meaningless on another device. Syncing reminder definitions would require choosing
which device fires them and de-duplicating — complexity with no user benefit today. If
cross-device reminders are ever wanted, that is a deliberate future sync feature; do not
put reminders in the shared schema pre-emptively.

## Notifications

- Library: `@notifee/react-native` (same version/patterns proven in the `mypitch` app).
- A single Android channel is created at startup.
- **Scheduled reminders**: one `TimestampTrigger` per enabled reminder with
  `RepeatFrequency.DAILY` at the next occurrence of its `HH:MM`.
- **Inactivity nudge**: a single `TimestampTrigger` at `lastLogTime + intervalHours`,
  rescheduled whenever a log entry is created and on app foreground.
- All triggers use `AlarmType.SET_AND_ALLOW_WHILE_IDLE` (inexact) to avoid the
  Play-restricted `SCHEDULE_EXACT_ALARM` permission. The manifest strips that permission
  (injected by notifee's AAR) via `tools:node="remove"` and declares `POST_NOTIFICATIONS`.
- Tapping a reminder deep-links to the new-entry screen (EditEntry, new mode); handled via
  notifee foreground/background events and `getInitialNotification()` on cold start.

## Sync after any change

Any mutation (screen edit or assistant action) rewrites the local store and then
re-syncs notifee: cancel all reminder notifications and re-create the enabled ones.
