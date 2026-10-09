/**
 * Node-code inbox: catches a node code opened from outside the app (the system
 * camera, a tapped `sereus-join:` link, …) and holds it until the app's add-node UI
 * is ready to show the approval prompt.
 *
 * Reusable by any Sereus RN app — a candidate for `@serfab/cadre-rn`.  React Native's
 * `Linking` is passed in (only `getInitialURL` and `addEventListener` are used), so
 * this file imports nothing from React Native and runs under jest as is.
 *
 * Why an inbox instead of handling the link where it lands:
 * - A cold-start link arrives before the node is up and before any screen is mounted.
 * - The app may need to navigate to its add-node screen first.
 * - One code at a time: a newer link replaces an untaken one (the user acted on the
 *   newer link most recently), but the screen decides what to do with a code that
 *   arrives while a prompt is already open or a claim is running.
 *
 * The held code carries a claim secret: it lives in memory only, is never logged, and
 * is dropped once taken.
 *
 * Usage:
 *   // once, at app start (index.js or the root component):
 *   nodeCodeInbox.start(Linking);
 *   // root: navigate to the add-node screen when a code arrives
 *   useEffect(() => nodeCodeInbox.subscribe(() => navigate('SereusConnections')), []);
 *   // add-node screen: take it when ready
 *   const code = nodeCodeInbox.take();
 */

import { nodeCodeFromUrl } from './nodeCodeLink';

/** The subset of React Native's `Linking` the inbox needs. */
export interface LinkSource {
  getInitialURL(): Promise<string | null>;
  addEventListener(type: 'url', handler: (event: { url: string }) => void): { remove(): void };
}

type Listener = () => void;

export class NodeCodeInbox {
  private pending: string | null = null;
  private listeners = new Set<Listener>();
  private stopLinks: (() => void) | null = null;

  /** Listen for links.  Idempotent; returns a stop function. */
  start(linking: LinkSource): () => void {
    if (this.stopLinks) return this.stopLinks;
    const sub = linking.addEventListener('url', ({ url }) => this.offerUrl(url));
    linking
      .getInitialURL()
      .then((url) => this.offerUrl(url))
      .catch(() => {});
    this.stopLinks = () => {
      sub.remove();
      this.stopLinks = null;
    };
    return this.stopLinks;
  }

  /** Offer an opened URL.  True when it carried a node code (now pending). */
  offerUrl(url: string | null | undefined): boolean {
    const code = nodeCodeFromUrl(url);
    if (!code) return false;
    this.pending = code;
    for (const listener of [...this.listeners]) {
      try {
        listener();
      } catch {
        // a listener's failure must not stop the others
      }
    }
    return true;
  }

  /** Whether a code is waiting. */
  hasPending(): boolean {
    return this.pending !== null;
  }

  /** Take the waiting code, if any; the inbox is empty afterwards. */
  take(): string | null {
    const code = this.pending;
    this.pending = null;
    return code;
  }

  /** Called whenever a code arrives (take it with {@link take}).  Returns an unsubscribe. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

/** The app-wide inbox. */
export const nodeCodeInbox = new NodeCodeInbox();
