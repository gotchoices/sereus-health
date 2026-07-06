/**
 * Global async-activity store (design/specs/mobile/global/async-activity.md).
 *
 * A tiny module-level store of the number of in-flight operations. Any code —
 * screens or data adapters — can `track()` a promise; a single global indicator
 * subscribes and shows while the count is > 0. Decoupled from React so it is
 * callable anywhere, not just inside components.
 */
type Listener = () => void;

let pending = 0;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((l) => l());
}

export function beginActivity(): void {
  pending += 1;
  emit();
}

export function endActivity(): void {
  pending = Math.max(0, pending - 1);
  emit();
}

/** Track a promise's lifetime in the global activity indicator. Returns the same promise. */
export function track<T>(p: Promise<T>): Promise<T> {
  beginActivity();
  return p.finally(endActivity);
}

/** Subscribe to pending-count changes; returns an unsubscribe fn. */
export function subscribeActivity(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPendingCount(): number {
  return pending;
}
