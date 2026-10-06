/**
 * @format
 *
 * Entry point.  Every polyfill runs before any library code: App.tsx pulls in
 * modules (libp2p, optimystic, quereus) that read these globals at module
 * scope, so a polyfill imported after the app tree has already run too late.
 *
 * The polyfills are the sereus kit's, not our own — `@serfab/cadre-rn/polyfills`
 * is the maintained account of what the sereus + optimystic + libp2p stack needs
 * from Hermes (sereus 1.6+).  It replaced a hand-rolled set here that was missing
 * several patches the stack depends on, notably `WebSocket.bufferedAmount`
 * (without it libp2p WebSocket writes never complete — sereus#11) and abort
 * reasons.  Fix gaps UPSTREAM rather than patching here; the one local
 * exception is documented in ./src/polyfills/textdecoder-fatal.js.
 */

// Debug namespaces.  Before the kit, which sets a DEBUG default only when
// nothing is set — so whatever this module chooses wins.
import './src/debug-bootstrap';

// 1. The kit's Hermes polyfills — first library import, always.
import '@serfab/cadre-rn/polyfills';
// 2. Native SHA-256/512 + Ed25519 (react-native-quick-crypto), replacing the
//    kit's pure-JS `crypto.subtle.digest`.  MUST come after the kit's polyfills
//    (quick-crypto's readable-stream reads globals they install).  Optimystic
//    hashes every block through this, so in pure JS it dominates the JS thread —
//    see the file header for the measurements.  Goes away when the kit's
//    `feat-rn-kit-native-digest` lands.
import './src/polyfills/native-crypto';
// 3. Health-specific: RN 0.82's native TextDecoder rejects `{ fatal: true }`.
import './src/polyfills/textdecoder-fatal';
// 4. react-native-webrtc's registerGlobals(), for @libp2p/webrtc.
import '@serfab/cadre-rn/polyfills/webrtc';
// 5. Dev-only audit of native/polyfilled/missing globals (logcat:
//    `[cadre-rn] polyfill audit`).  After every polyfill, before the app.
import '@serfab/cadre-rn/boot-check';

// notifee requires a background event handler registered at the top level. A reminder
// tapped while the app is backgrounded is routed on next foreground via
// getInitialNotification()/onForegroundEvent; here we just acknowledge the event.
// Guarded: if the native module isn't ready during bundle eval (bridgeless), a throw
// here must not abort AppRegistry.registerComponent below.
import notifee from '@notifee/react-native';
try {
  notifee.onBackgroundEvent(async () => {
    // No background work needed; navigation happens when the app returns to foreground.
  });
} catch (e) {
  console.warn('[reminders] background handler registration failed:', e);
}

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
