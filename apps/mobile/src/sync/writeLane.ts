/**
 * One lane for every database write (design/specs/mobile/global/async-activity.md → Sync status).
 *
 * The health database is one Quereus connection, and a write is `BEGIN … COMMIT` across several
 * awaited statements. Once saves run in the background (src/sync/pendingChanges.ts), two writes
 * could otherwise overlap and interleave inside one open transaction. Every write — background
 * saves and the catalog / import / clear writes the UI still awaits — runs through `withWrite`,
 * one at a time, in submission order. Reads are not serialized.
 *
 * Wrap write *entry points* only. A function already running in the lane must not call another
 * `withWrite`-wrapped function: the inner call would wait for the outer one and never start. The
 * db-layer write functions come in two forms for this reason — `fooTx` (unwrapped, for code that is
 * already in the lane) and `foo` (wrapped).
 */
let tail: Promise<unknown> = Promise.resolve();
let depth = 0;

/** Run `fn` after every earlier write has settled; resolves or rejects with its result. */
export function withWrite<T>(fn: () => Promise<T>): Promise<T> {
  const run = tail.then(
    async () => {
      depth += 1;
      try {
        return await fn();
      } finally {
        depth -= 1;
      }
    },
  );
  // The lane continues after a failed write: the next one waits only for this one to settle.
  tail = run.catch(() => undefined);
  return run;
}

/** Whether a write is running in the lane right now (diagnostics). */
export function writeInProgress(): boolean {
  return depth > 0;
}
