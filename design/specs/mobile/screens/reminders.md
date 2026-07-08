# Reminders Screen Spec

## Purpose

Let the user configure local reminder notifications of two kinds:

1. **Inactivity nudge** — one setting: notify if nothing has been logged for _N_ hours.
2. **Scheduled reminders** — a list of daily reminders, each firing at a set time of day.

Reminders are **device-local** (see [reminders global spec](../global/reminders.md)): they
are persisted on the device and never written to the shared cadre schema.

## Layout

- Header: title "Reminders"
  - Upper-left: Back
  - Upper-right: **(+) Add** (adds a scheduled reminder)
- Content:
  - **Inactivity nudge** section (top):
    - Label "Remind me if I haven't logged in:" + interval picker (**Off**, or 1–12 hours)
  - **Scheduled reminders** section: list of scheduled-reminder rows

## Scheduled reminder row (list item)

Each row shows:

- Left: enable/disable **switch**
- Middle: editable **time of day** (tap to open a time picker) + optional label
- Right: **trash** button (delete)

## Behaviors

- **Inactivity interval**:
  - Choosing a number of hours enables the nudge; "Off" disables it.
  - The nudge fires _N_ hours after the most recent log entry; logging resets the timer.
- **List**: shows scheduled reminders (enabled and disabled).
- **Add (+)**:
  - creates a new scheduled reminder row (default time, enabled), in an editable state.
- **Edit**: user can change a reminder's **time of day** (and optional label).
- **Enable/disable**: switch toggles a scheduled reminder on/off without deleting it.
- **Delete**: trash button deletes the reminder; **confirm before deleting**.

## Notifications & permissions

- On first use (or when enabling a reminder), request notification permission
  (`POST_NOTIFICATIONS` on Android 13+). If denied, show an inline hint and keep the
  settings editable, but no notifications fire until granted.
- Tapping any reminder notification opens the app to the **new entry** screen (EditEntry, new mode).
- Scheduling uses inexact alarms (`SET_AND_ALLOW_WHILE_IDLE`) so we don't require the
  Play-restricted `SCHEDULE_EXACT_ALARM` permission; reminders are reliable to within a
  few minutes, which is sufficient.

## Assistant

The assistant can read the current reminders (via a `list_reminders` tool) and propose
reminder changes (add/adjust scheduled reminders, set the inactivity interval, delete a
reminder) as an approvable **action plan** — see the assistant TOOLS and ACTION PLAN specs.
