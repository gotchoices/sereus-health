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

### Sync status

Saves follow the domain write model ([domain/cadre.md](../../domain/cadre.md) →
Write Outcomes and Sync Status): a save is done when it is stored on this device, and
syncing to the cadre continues in the background. The UI shows where each change stands
without making the user wait for it.

- **Saving never waits for the cadre.** The editor closes and the new record appears as
  soon as the change is stored on this device; the global activity indicator is not held
  open by syncing.
- **Per record:** a small, unobtrusive marker on a record that is *on this device only*
  (history list and record detail). A *synced* record shows no marker — the normal case
  looks clean. The marker updates in place when the record becomes synced.
- **App-wide:** one quiet status line while anything is unsynced (e.g. "3 changes waiting
  to sync"), with the detail — what is waiting, since when, and whether cadre nodes are
  reachable — on Sereus Connections. Nothing is shown when everything is synced. A user
  with no cadre nodes sees no per-record markers and no waiting count; Sereus Connections
  says once that data is only on this device.
- **Not saved:** a change the cadre refused is reported as a message naming what was not
  saved and why, from whichever screen is open (or on next open, if it happened while the
  app was closed). The record disappears from the data as the domain contract says; the
  message offers to re-enter it. This is rare and is the only sync state that asks the
  user for anything.
- **Restart:** markers and the waiting count come back as they were after the app
  restarts; nothing pending is forgotten.

### Out of scope

- Long, user-initiated operations (large catalog import, backup/restore) may *also* show
  their own determinate progress or preview flow — see the relevant screen spec. The
  global indicator still applies underneath.

> Implementation (consolidation, not this spec): an app-level activity store owning the
> pending count + the single indicator, a `track(promise)` helper that
> registers/deregisters, and a `useLiveResult` hook that applies results only when still
> in context.
