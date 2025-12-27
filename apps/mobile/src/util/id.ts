function hex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i]!.toString(16).padStart(2, '0');
  }
  return out;
}

/**
 * UUIDv4 generator.
 *
 * - Prefers `crypto.randomUUID()` when available.
 * - Falls back to `crypto.getRandomValues()` and formats RFC 4122 v4.
 */
export function newUuid(): string {
  const c = (globalThis as any).crypto as undefined | { randomUUID?: () => string; getRandomValues?: (a: Uint8Array) => Uint8Array };
  if (c?.randomUUID) return c.randomUUID();

  if (!c?.getRandomValues) {
    throw new Error('crypto.getRandomValues is not available (needed for UUIDv4)');
  }

  const b = c.getRandomValues(new Uint8Array(16));
  // Per RFC 4122 §4.4
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10

  const h = hex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}


