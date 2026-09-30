/* global globalThis */
/**
 * TextDecoder `{ fatal: true }` fix — the one patch health needs that
 * `@serfab/cadre-rn/polyfills` does not provide.
 *
 * Bare RN 0.82 Hermes ships a NATIVE TextDecoder that rejects the standard
 * `{ fatal: true }` option.  The kit's decoder polyfill (like the reference
 * app's before it) only installs when `TextDecoder` is undefined, so it skips a
 * present-but-incomplete native one.  @optimystic/db-core does
 * `new TextDecoder('utf-8', { fatal: true })` at module scope, so a broken
 * native decoder aborts the whole db-core barrel.  We feature-detect `fatal`
 * support and install a lossy, fatal-ignoring UTF-8 decoder when it's missing.
 *
 * Imported from index.js immediately after the kit's polyfills and before any
 * library code.  Worth upstreaming into cadre-rn (a feature check rather than
 * an existence check), at which point this file can go.
 */
(function ensureFatalCapableTextDecoder() {
  const Native = globalThis.TextDecoder;
  if (typeof Native === 'function') {
    try { new Native('utf-8', { fatal: true }); return; } catch { /* fall through */ }
  }
  class TextDecoderPolyfill {
    constructor(label = 'utf-8') {
      const enc = String(label).toLowerCase().replace('_', '-');
      if (enc !== 'utf-8' && enc !== 'utf8') {
        throw new RangeError(`TextDecoder polyfill only supports UTF-8 (got "${label}")`);
      }
      this.encoding = 'utf-8';
      this.fatal = false;
      this.ignoreBOM = false;
    }
    decode(input) {
      if (input == null) return '';
      const bytes = input instanceof Uint8Array
        ? input
        : ArrayBuffer.isView(input)
          ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
          : new Uint8Array(input);
      if (bytes.length === 0) return '';
      let i = 0;
      let str = '';
      if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) i = 3;
      while (i < bytes.length) {
        const b = bytes[i++];
        if (b < 0x80) {
          str += String.fromCharCode(b);
        } else if (b < 0xC0) {
          str += '�';
        } else if (b < 0xE0) {
          str += String.fromCharCode(((b & 0x1F) << 6) | (bytes[i++] & 0x3F));
        } else if (b < 0xF0) {
          str += String.fromCharCode(
            ((b & 0x0F) << 12) | ((bytes[i++] & 0x3F) << 6) | (bytes[i++] & 0x3F),
          );
        } else {
          let cp = ((b & 0x07) << 18)
            | ((bytes[i++] & 0x3F) << 12)
            | ((bytes[i++] & 0x3F) << 6)
            | (bytes[i++] & 0x3F);
          cp -= 0x10000;
          str += String.fromCharCode(0xD800 + (cp >> 10), 0xDC00 + (cp & 0x3FF));
        }
      }
      return str;
    }
  }
  globalThis.TextDecoder = TextDecoderPolyfill;
})();
