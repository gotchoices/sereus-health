## Sereus Health – Async Activity & Loading (Mobile)

How the app behaves while data operations (queries, imports, saves) are in flight.
Cross-cutting: applies to every screen that reads or writes data. Individual screens
should not each invent their own blocking spinner for routine data access.

### Principles

- **Non-blocking.** The app never freezes waiting on a data operation. Input stays
  responsive and the user can navigate away at any time.
- **One global indicator.** A single, app-wide activity indicator (a thin progress
  bar along the top edge, or an unobtrusive corner spinner) is shown whenever one or
  more data operations are outstanding, and hidden when none are. It overlays nothing
  and blocks no input.
- **Work completes regardless of navigation.** Once started, an operation runs to
  completion and its side effects (writes, cache/index updates) always apply — even
  if the user has left the screen that launched it. Leaving a screen cancels only the
  *UI update*, never the *work*.
- **The UI reflects a result only if still relevant.** A screen applies a result only
  when it is still mounted and the result still matches its current context (same
  query, same params). Superseded or stale results are discarded *for display* only;
  the underlying work has still completed.

### Per-operation lifecycle

1. A screen or service launches an operation; it registers with the global activity
   tracker (pending count +1) and the indicator appears.
2. The app stays interactive; the user may navigate freely.
3. On completion (success or failure) the operation deregisters (pending count −1);
   the indicator hides when the count reaches zero.
4. Side effects apply unconditionally. UI reflection is conditional: the requesting
   screen updates only if still mounted and in-context; otherwise the result is
   simply not shown — no error, no crash.

### Screen contract

- Treat your own data loads as **cancellable for display**: guard state updates so a
  late result from a screen the user has already left is ignored (the `if (!alive)
  return` pattern, applied consistently to every async `setState`).
- Do not show a full-screen blocking spinner for routine queries. A lightweight inline
  placeholder (skeleton or “Loading…”) for a screen’s *own first load* is fine; the
  **global indicator** is the app-wide signal for everything else.
- Re-query on becoming visible again if the underlying data may have changed while the
  screen was backgrounded (e.g. after an import on another screen).

### Errors

- A failed operation deregisters like any other — the global indicator reflects
  *pending*, not error state.
- Errors surface in the requesting screen’s own context (inline message + retry) if it
  is still visible; otherwise they are logged and dropped (the work’s side effects, if
  any, still applied or rolled back atomically per the operation’s own contract).

### Out of scope (handled elsewhere)

- **Long, user-initiated operations with meaningful progress** (e.g. importing a large
  catalog, a backup/restore) may additionally show operation-specific progress
  (a determinate bar or a preview/confirmation flow) — see the relevant screen spec.
  The global indicator still applies underneath.

> Implementation note (belongs in a consolidation, not this spec): realize this as an
> app-level activity context/provider that owns the pending count and renders the single
> global indicator, plus a small `track(promise)` helper that registers/deregisters
> automatically and a `useLiveResult` hook that applies results only when still in
> context. See `design/generated/mobile/…`.
