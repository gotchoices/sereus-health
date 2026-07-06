## Sereus Health – Async Activity & Loading (Mobile)

How the app behaves while data operations (queries, imports, saves) are in flight.
Cross-cutting: applies to every screen that reads or writes data.

### Contract

- **Non-blocking, one global indicator.** The app never freezes on a data operation;
  input stays responsive and the user can navigate away at any time. A single app-wide
  indicator (a thin top progress bar / unobtrusive spinner) shows whenever any operation
  is outstanding and hides when none are; it overlays and blocks nothing. Screens do not
  add their own blocking spinner for routine data access (a lightweight inline
  placeholder for a screen's *own first load* is fine).
- **Work is independent of the UI.** Once started, an operation runs to completion and
  its side effects (writes, cache/index updates) always apply — leaving a screen cancels
  the *UI update*, never the *work*.
- **Results update the UI only if still relevant.** A screen applies a result only when
  still mounted and matching its current context (same query/params); stale or superseded
  results are dropped *for display* only. Every async `setState` is guarded
  (`if (!alive) return`). A screen re-queries on becoming visible if the data may have
  changed while it was away.

### Errors

- A failed operation clears the indicator like any other (it reflects *pending*, not
  error). Errors surface in the requesting screen (inline message + retry) if it is still
  visible; otherwise they are logged — side effects still commit or roll back atomically
  per the operation's own contract.

### Out of scope

- Long, user-initiated operations (large catalog import, backup/restore) may *also* show
  their own determinate progress or preview flow — see the relevant screen spec. The
  global indicator still applies underneath.

> Implementation (consolidation, not this spec): an app-level activity store owning the
> pending count + the single indicator, a `track(promise)` helper that
> registers/deregisters, and a `useLiveResult` hook that applies results only when still
> in context.
