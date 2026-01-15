# User Story: Reminders

## Story Overview
I want the app to remind me to log entries so I don't forget to track important activities and conditions throughout the day.

Context: Bob has been [using the app daily](02-daily.md) for a few days. He's committed to tracking his health but sometimes forgets to log meals or symptoms when he's busy. He wants gentle reminders without being intrusive.

## Sequence
1. Bob opens the app and taps the settings icon in the bottom tab bar.
2. He sees "Reminders" in the settings list and taps it.
3. The reminders screen shows a simple option: "Remind me if I haven't logged anything in: [4] hours".
4. He can adjust the time interval using a picker (1-12 hours, or "Off").
5. He sets it to 4 hours and returns to the main screen.
6. Later that day, Bob has breakfast at 8am and logs it in Sereus Health.
7. By noon (4 hours later), he's been busy with work and hasn't logged anything.
8. His phone shows a notification: "Haven't logged in a while. Tap to add an entry."
9. Bob taps the notification, and Sereus Health opens directly to the new entry screen (EditEntry in new mode).
10. He quickly logs his lunch and goes back to work.
11. The next morning, Bob notices he logged breakfast yesterday at 7am, but it's now 10am and he hasn't logged breakfast yet.
12. He receives another reminder notification and logs his breakfast.

Alternative Path A: Turning Off Reminders
3.1. Bob decides the reminders are too frequent.
3.2. He goes back to settings → Reminders.
3.3. He sets the interval to "Off".
3.4. He no longer receives automatic reminders.

Alternative Path B: AI Assist
1.1. Bob selects the AI assistant
1.2. He clicks the entry, selects microphone and says "Remind me each day around mealtimes or just after to log what I ate"
1.3. The preview shows 3 daily reminders will be booked
1.4. He tells the agent how to adjust the times slightly
1.5. The preview looks good so he approves it.
1.6. His reminders now arrive just after meal times.

## Acceptance Criteria
- [ ] User can configure a time interval (in hours) for reminder notifications
- [ ] User receives a notification if no entries have been logged within the configured interval
- [ ] Tapping the notification opens the app to the new entry screen
- [ ] User can disable reminders by setting interval to "Off"

