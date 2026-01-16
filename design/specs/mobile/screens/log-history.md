# LogHistory Screen Spec

## Purpose

Show the user’s log entries over time and provide fast entry creation, editing, cloning, and export.

## Layout

- Header: title “History”
  - Optional search/filter toggle (see `design/specs/mobile/global/general.md` filter rules)
- Content: scrollable list of log entries (newest first)
- Bottom tab bar: see `design/specs/mobile/navigation.md`

## Primary actions

- **Tap entry**: open entry details/edit flow (screen name TBD)
- **New entry**: create a new log entry (primary CTA)
- **Clone entry**: duplicate an entry as a starting point for a new one
- **Graphs**: navigate to graphs/analysis (if/when implemented)

## Entry card (compact)

Each entry card uses a compact 3-line layout:

- **Line 1 (header row)**:
  - left: Type badge (Activity / Condition / Outcome; semantic color)
  - center-left: timestamp (local display)
  - right: Clone icon/button
- **Line 2 (items)**:
  - comma-separated item list
  - if more than 3 items, truncate and show “+N more”
- **Line 3 (comment, optional)**:
  - single-line snippet, truncated

Interaction rules:
- Clone icon has a comfortable touch target (don’t require pixel-perfect taps).

## Empty state (required)

When there are no log entries:

- Show “No entries yet” and a primary “Get started” path:
  - **Import minimal starter categories (built-in)** (see `design/specs/mobile/global/general.md`)
  - **Browse more catalogs (online)** (see `design/specs/mobile/global/general.md`)
  - **Create your first entry**

## Import / export (data portability)

- Expose **Export logs** from LogHistory.
  - Export supports **filtered subset** (if a filter is active) and **all entries**.
  - Export format: **CSV** per `design/specs/domain/import-export.md`.
- If we expose **Import logs** from LogHistory, it must accept only **canonical YAML/JSON** (no direct CSV import), with preview-before-commit per `design/specs/domain/import-export.md`.

## Navigation (summary)

- This is the **Home** tab root: `LogHistory` (see `design/specs/mobile/navigation.md`).

