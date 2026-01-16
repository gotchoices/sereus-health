# Reminders Screen Spec

## Purpose

Let the user view, add, edit, enable/disable, and delete reminders.

## Layout

- Header: title “Reminders”
  - Upper-right: **(+) Add**
  - Upper-left: Back
- Content: list of reminders

## Reminder row (list item)

Each reminder row shows:

- Left: enable/disable **switch**
- Middle: editable fields (at minimum: **time of day**)
- Right: **trash** button (delete)

## Behaviors

- **List**: shows the reminders currently configured (enabled and disabled).
- **Add (+)**:
  - creates a new reminder row in the list
  - the new row starts in an editable state
- **Edit**:
  - user can edit the **time of day** for a reminder
- **Enable/disable**:
  - switch toggles a reminder on/off without deleting it
- **Delete**:
  - trash button deletes the reminder
  - confirm before deleting

