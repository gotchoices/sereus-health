# Graphs Spec

## Purpose

Help the user find relationships between what they do/experience (inputs) and how they feel
(outcomes). See story `design/stories/mobile/07-graphing.md`.

Two **distinct** functions — keep them separate:

- **Graphing (UX, MVP)** — plot selected items over time so the user draws conclusions *visually*.
- **Correlation (computational, later)** — the app *computes* relationships (including lagged/causal
  hints, e.g. "stomach pain tracks apples with ~3h lag") and surfaces them as findings. Deferred; not
  part of the first iteration.

## Graphing — invariants

- The user selects one or more catalog items (inputs and/or outcomes) and a date range, and generates
  a graph.
- Series are **overlaid on a shared time axis**, each **scaled to its own range** (so items with very
  different units/magnitudes are comparable at a glance).
- Each series is color-coded, with a **legend**.
- Graphs are **named** and **persist**: they remain in a list the user can switch between, survive
  navigating away, and go away only when explicitly dismissed.
- A graph can be **shared as an image**, crisp enough to print.

## Correlation — deferred

- A later, separate computational function over the same data. It may propose relationships the eye
  would miss (strength, direction, lag). Its findings are advisory, never silently change data.
- Out of scope for the graphing iteration; specified when we take it on.

## Non-goals (for now)

- No statistical analysis, trend-fitting, or causality claims in the graphing function — that is the
  Correlation function's job.
