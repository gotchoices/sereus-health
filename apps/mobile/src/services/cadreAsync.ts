/**
 * Small async utilities for the cadre layer.
 *
 * Control-network operations block indefinitely on a solo node with no cohort
 * (the control DB uses optimystic's `network` transactor, which has no quorum to
 * answer a consistent read). These helpers bound those waits so a caller — or the
 * boot path — never hangs forever. Mirrors chat/apps/mobile/src/cadre/async.ts.
 */

/** Bound the background authority-genesis attempt; never gates boot. */
export const AUTHORITY_GENESIS_TIMEOUT_MS = 20_000;

/** Bound a one-off control-network operation before failing fast (UI-triggered). */
export const CONTROL_OP_TIMEOUT_MS = 15_000;

/**
 * Reject with a clear error if `p` hasn't settled within `ms`. The underlying
 * promise is left to settle on its own (it can't be cancelled); this only stops
 * the caller from awaiting a control op that never acknowledges.
 */
export function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    p.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
