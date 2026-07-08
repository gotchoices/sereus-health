# User Story: Reminders

## Story Overview
I want the app to remind me to log entries so I don't forget to track important activities and conditions throughout the day.

Context: Bob has been [using the app daily](02-daily.md) for a few days. He's committed to tracking his health but sometimes forgets to log meals or symptoms when he's busy. He wants gentle reminders without being intrusive.

Reminders come in **two kinds**, and Bob can use either or both:

- **Inactivity nudge** — a single "remind me if I haven't logged anything in _N_ hours" setting.
- **Scheduled reminders** — a list of daily reminders that each fire at a set time of day (e.g. just after each meal).

Reminders are **device-specific**: they schedule local notifications on this phone and are stored locally on the device, not synced across the cadre (see [notifications spec](../../specs/mobile/global/reminders.md)).

## Sequence

### Inactivity nudge
1. Bob opens the app and taps the settings icon in the bottom tab bar.
2. He sees "Reminders" in the settings list and taps it.
3. At the top of the reminders screen is: "Remind me if I haven't logged anything in: [4] hours".
4. He can adjust the interval using a picker (1–12 hours, or "Off").
5. He sets it to 4 hours and returns to the main screen.
6. Later that day, Bob has breakfast at 8am and logs it in Sereus Health.
7. By noon (4 hours after his last log), he's been busy and hasn't logged anything.
8. His phone shows a notification: "Haven't logged in a while. Tap to add an entry."
9. Bob taps the notification, and Sereus Health opens directly to the new entry screen (EditEntry in new mode).
10. He quickly logs his lunch. Logging resets the inactivity timer, so the next nudge is measured from now.

### Scheduled reminders
11. Below the inactivity setting, Bob sees a list of scheduled reminders (empty at first).
12. He taps **(+) Add** and a new reminder appears, defaulting to a time he can edit.
13. He sets it to 8:00 AM and labels it "Log breakfast".
14. He adds two more: 12:30 PM and 6:30 PM.
15. Each day at those times his phone reminds him; tapping opens the new entry screen.
16. He can toggle any reminder off (without deleting it) or delete it with the trash button.

Alternative Path A: Turning Off Reminders
- Bob sets the inactivity interval to "Off" and toggles off (or deletes) his scheduled reminders. He no longer receives automatic reminders.

Alternative Path B: AI Assist
1. Bob selects the AI assistant.
2. He types (or dictates) "Remind me each day around mealtimes or just after to log what I ate".
3. The assistant reads his current reminders, then proposes an action plan: 3 daily reminders (e.g. 8:00 AM, 12:30 PM, 6:30 PM).
4. The plan preview shows the 3 reminders that will be booked; he tells the agent to nudge the times slightly and it revises the plan.
5. The preview looks good, so he approves it. His reminders now arrive just after meal times.

## Acceptance Criteria
- [ ] User can configure an inactivity interval (in hours, or "Off") for a nudge reminder
- [ ] User receives a notification if no entries have been logged within the configured interval
- [ ] User can add scheduled daily reminders at chosen times of day
- [ ] User can edit a reminder's time, enable/disable it, and delete it (delete confirms first)
- [ ] Tapping any reminder notification opens the app to the new entry screen
- [ ] Reminders are stored on-device and are not written to the shared (cadre) schema
- [ ] The assistant can list existing reminders and propose reminder changes as an approvable action plan
