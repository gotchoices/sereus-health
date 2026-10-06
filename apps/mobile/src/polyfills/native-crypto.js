/**
 * Native SHA digests and Ed25519 for the Sereus stack, through react-native-quick-crypto.
 *
 * `@serfab/cadre-rn/polyfills` gives Hermes `crypto.subtle.digest` in pure JavaScript
 * (@noble/hashes), and @libp2p/crypto falls back to pure-JS Ed25519 when WebCrypto has none.
 * Optimystic hashes every block it stores or compares (`canonicalBlockHash`) and verifies commit
 * proofs on its reads, so both run constantly.  sereus-chat measured the cost on device: 47% of
 * all JS time in the digest, the JS thread blocked up to 43 s at a stretch, 169 ms per Ed25519
 * verify on a Galaxy S7 (0.72 ms native), and a two-phone exchange taking minutes instead of
 * about a second.  After the fix, `reserveRelays` on an S7 went 18 s -> 6.6 s.  A blocked thread
 * is not just slow here: it can outlast the relay reservation the phone is reachable through.
 *
 * This is chat's fix, adopted via ser/taleus (`apps/mobile/src/polyfills/native-crypto.js`).
 * The kit's backlog ticket `sereus/tickets/backlog/feat-rn-kit-native-digest.md` would move it
 * into `@serfab/cadre-rn/polyfills` — when that lands, delete this file and the index.js import.
 *
 * Imported AFTER the kit's polyfills: requiring quick-crypto loads its readable-stream, which
 * reads globals the kit installs.  The native digest is trusted only after it reproduces a known
 * vector; on any mismatch or error the kit's JS digest stays, with a warning.
 */
/* global globalThis -- @react-native's eslint env predates es2020; `globalThis` is
   present on Hermes.  Declared here rather than in .eslintrc so this file stays
   self-contained for the move into @serfab/cadre-rn. */
const quickCrypto = require('react-native-quick-crypto');

const qc = quickCrypto.default ?? quickCrypto;

/** Ed25519 through native WebCrypto: only the methods libp2p's path calls, only where absent. */
function installEd25519() {
  const native = qc.subtle;
  if (!native) return;
  for (const method of ['generateKey', 'importKey', 'exportKey', 'sign', 'verify']) {
    if (typeof globalThis.crypto.subtle[method] !== 'function') {
      globalThis.crypto.subtle[method] = native[method].bind(native);
    }
  }
}

const SHA256_OF_ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const ALGORITHMS = { 'SHA-256': 'sha256', 'SHA-512': 'sha512' };

function nativeDigest(name, bytes) {
  return new Uint8Array(qc.createHash(name).update(bytes).digest());
}

function nativeDigestWorks() {
  try {
    const hex = Array.from(
      nativeDigest('sha256', new Uint8Array([0x61, 0x62, 0x63])),
      (b) => b.toString(16).padStart(2, '0'),
    ).join('');
    return hex === SHA256_OF_ABC;
  } catch (error) {
    console.warn('[native-crypto] native digest failed its check:', error);
    return false;
  }
}

function asBytes(data) {
  if (data instanceof Uint8Array) return data;
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  return new Uint8Array(data);
}

/** SHA-256/512 through native code; any other algorithm stays with the JS digest. */
function installDigest() {
  if (typeof qc.createHash !== 'function' || !nativeDigestWorks()) {
    console.warn(
      '[native-crypto] native SHA digest unavailable: block hashing runs in pure JS and will be slow',
    );
    return;
  }
  const jsDigest = globalThis.crypto.subtle.digest;
  globalThis.crypto.subtle.digest = function digest(algorithm, data) {
    const name = ALGORITHMS[typeof algorithm === 'string' ? algorithm : algorithm?.name];
    if (!name) return jsDigest.call(this, algorithm, data);
    try {
      const out = nativeDigest(name, asBytes(data));
      return Promise.resolve(out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength));
    } catch (error) {
      return Promise.reject(error);
    }
  };
}

installEd25519();
installDigest();
