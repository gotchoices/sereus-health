/**
 * Development-only query timing.  Off unless `HEALTH_PERF=1` is set before the app
 * loads (see src/debug-bootstrap.js).  When on, every `eval` / `exec` / `get` on the
 * health database logs one line:
 *
 *   [perf] sql <ms> rows=<n> <first 90 chars of the SQL>
 *
 * and App.tsx logs `[perf] screen <Route>` on every screen change, so a run of
 * screen-to-screen moves can be totalled per screen from logcat
 * (scripts/perf/screen-timings.sh).  Parameters are never logged.
 */
import type { Database } from '@quereus/quereus';

export const PERF_ENABLED: boolean =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.HEALTH_PERF === '1';

const instrumented = new WeakSet<object>();

/** `performance.now()` where present (Hermes has it), else `Date.now()`. */
const now: () => number = (() => {
  const perf = (globalThis as { performance?: { now(): number } }).performance;
  return perf ? () => perf.now() : () => Date.now();
})();

function shortSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim().slice(0, 90);
}

/** Log one timed query (also used for control-DB reads outside the health database). */
export function perfSql(ms: number, rows: number | string, sql: string): void {
  if (PERF_ENABLED) report(ms, rows, sql);
}

function report(ms: number, rows: number | string, sql: string): void {
  console.info(`[perf] sql ${ms.toFixed(0)} rows=${rows} ${shortSql(sql)}`);
}

export function perfMark(label: string): void {
  if (PERF_ENABLED) console.info(`[perf] ${label}`);
}

/** Wrap the database's query methods with timing (idempotent; no-op unless enabled). */
export function instrumentDatabase(db: Database): Database {
  if (!PERF_ENABLED || instrumented.has(db)) return db;
  instrumented.add(db);

  const origEval = db.eval.bind(db);
  db.eval = ((sql: string, ...rest: unknown[]) => {
    const iterator = (origEval as (...a: unknown[]) => AsyncIterableIterator<Record<string, unknown>>)(sql, ...rest);
    const start = now();
    let rows = 0;
    let reported = false;
    const done = (suffix = '') => {
      if (reported) return;
      reported = true;
      report(now() - start, `${rows}${suffix}`, sql);
    };
    const wrapped: AsyncIterableIterator<Record<string, unknown>> = {
      async next() {
        try {
          const r = await iterator.next();
          if (r.done) done();
          else rows++;
          return r;
        } catch (err) {
          done('!err');
          throw err;
        }
      },
      async return(value?: unknown) {
        done('+early');
        return iterator.return ? iterator.return(value) : { done: true, value: undefined };
      },
      [Symbol.asyncIterator]() {
        return wrapped;
      },
    };
    return wrapped;
  }) as Database['eval'];

  const origExec = db.exec.bind(db);
  db.exec = (async (sql: string, ...rest: unknown[]) => {
    const start = now();
    try {
      return await (origExec as (...a: unknown[]) => Promise<void>)(sql, ...rest);
    } finally {
      report(now() - start, 'exec', sql);
    }
  }) as Database['exec'];

  const origGet = db.get.bind(db);
  db.get = (async (sql: string, ...rest: unknown[]) => {
    const start = now();
    try {
      return await (origGet as (...a: unknown[]) => Promise<unknown>)(sql, ...rest);
    } finally {
      report(now() - start, 'get', sql);
    }
  }) as Database['get'];

  return db;
}
