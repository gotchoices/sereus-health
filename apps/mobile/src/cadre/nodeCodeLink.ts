/**
 * Recognizing node codes in text and opened links — no dependencies at all, so
 * link routing (and its tests) can use it without loading cadre-core.  Part of the
 * reusable node-code kit (see nodeCode.ts); a candidate for `@serfab/cadre-rn`.
 *
 * SECURITY: a code carries a claim secret.  Never log the text or URL these look at.
 */

/** What every node code starts with, whatever its version.  Also its URI scheme. */
export const NODE_CODE_SCHEME = 'sereus-join:';

/** Cheap test for routing: does this text look like a node code at all? */
export function isNodeCode(text: string): boolean {
  return text.trim().startsWith(NODE_CODE_SCHEME);
}

/**
 * The node code inside an opened link, or null when the link carries none.
 *
 * - `sereus-join:1.…` — the code itself is the URI (system camera, a tapped link).
 * - Any other URL whose query or fragment carries one, percent-encoded or not, e.g.
 *   `https://sereus.org/join#sereus-join:1.…` or `myapp://claim?code=sereus-join%3A1.…`.
 *   That leaves room for a web landing page or an app-scheme wrapper later without
 *   changing this code.
 */
export function nodeCodeFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (isNodeCode(trimmed)) return trimmed;
  const decoded = safeDecode(trimmed);
  const at = decoded.indexOf(NODE_CODE_SCHEME);
  if (at <= 0) return null;
  // The code is base64url after its prefix, so it ends at the first character that
  // cannot be part of it (`&`, `#`, whitespace, …).
  const match = /^sereus-join:[A-Za-z0-9._~-]+/.exec(decoded.slice(at));
  return match ? match[0] : null;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
