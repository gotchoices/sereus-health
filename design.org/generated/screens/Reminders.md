# Reminders Screen Consolidation

---
provides: ["screen:Reminders"]
dependsOn:
  - design/stories/08-reminders.md
  - design/specs/navigation.md
  - design/specs/screens/index.md
  - design/specs/global/general.md
---

## Purpose
Configure reminder notification interval so Bob gets gentle prompts to log entries when he hasn't done so recently.

## Screen Identity
- **Route**: `Reminders` (push from Settings)
- **Title**: "Reminders"
- **Deep Link**: `health://screen/Reminders`

## User Journey Context
From stories:
- **08-reminders.md**:
  - Bob can set interval: "Remind me if I haven't logged anything in: [4] hours"
  - Interval options: 1-12 hours, or "Off"
  - Notification text: "Haven't logged in a while. Tap to add an entry."
  - Tapping notification opens EditEntry in new mode

## Layout & Information Architecture

### Header
- **Back Button** (left): Returns to Settings
- **Title**: "Reminders" (centered)
- No right action

### Main Content Area

#### Interval Selection
- **Section Header**: "Remind me if I haven't logged anything in:"
- **Radio-style list** of interval options:
  - Off (no reminders)
  - 1 hour
  - 2 hours
  - 4 hours (default)
  - 6 hours
  - 8 hours
  - 12 hours
- **Checkmark** on selected option

#### Future Enhancements Section (placeholder)
- Grayed out preview of future options
- Helps set expectations without over-promising

## Interaction Patterns

### Primary Actions
1. **Select Interval**:
   - Tap option to select
   - Immediate visual feedback (checkmark)
   - No save button needed (auto-save)

### Deep Link from Notification
- `health://reminder/log` opens EditEntry in new mode
- Handled by navigation, not this screen

### Navigation
- **Back**: Returns to Settings

## Data Model

### Stored Preference
```typescript
interface ReminderSettings {
  intervalHours: number | null;  // null = off
  // Future: quietHoursStart, quietHoursEnd, etc.
}
```

### Screen State
```typescript
interface RemindersState {
  selectedInterval: number | null;
}
```

## Theming & Accessibility
- **Theme**: Follow system light/dark mode
- **Colors**:
  - Background: `theme.background`
  - Options: `theme.surface` with `theme.border`
  - Selected checkmark: `theme.accentPrimary`
- **Touch Targets**: Full row is tappable (minimum 44pt height)
- **Accessibility**: 
  - Options announce label and selection state
  - Screen reader users hear "selected" for current choice

## i18n Keys
```
reminders.title: "Reminders"
reminders.interval: "Remind me if I haven't logged anything in:"
reminders.off: "Off"
reminders.hours: "{count} hours"  // with proper pluralization
reminders.notificationTitle: "Log Reminder"
reminders.notificationBody: "Haven't logged in a while. Tap to add an entry."
```

## Design Rationale

### Why Preset Intervals?
- **Simplicity**: No custom time picker needed
- **Reasonable Defaults**: 1-12 hours covers all use cases
- **Story Aligned**: "1-12 hours, or Off"

### Why No Save Button?
- **Settings Pattern**: Single-selection settings typically auto-save
- **Immediate Feedback**: User sees checkmark; no doubt about saved state
- **Reduced Friction**: One less tap

### Why Include Future Enhancements?
- **Transparency**: Shows app is evolving
- **Sets Expectations**: Users know more is coming
- **Placeholder Pattern**: Common in MVP apps

## Component Reuse
- **Theme Hook**: `useTheme()` for current palette
- **i18n Hook**: `useT()` for all UI strings
- **Radio List Pattern**: Similar to other single-select settings

## Open Questions / Future Enhancements
- **Quiet Hours**: Don't notify at night
- **Smart Reminders**: AI-based timing based on patterns
- **Meal-time Reminders**: Specific times for breakfast/lunch/dinner
- **Custom Messages**: User-defined notification text

---

**Status**: Fresh consolidation
**Last Updated**: 2025-12-03

