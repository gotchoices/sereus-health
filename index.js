/**
 * @format
 */

// Polyfill for structuredClone (needed by Quereus in React Native)
// structuredClone is a Web/Node.js 17+ global API not available in RN
// Using @ungap/structured-clone for robust deep cloning
import structuredClone from '@ungap/structured-clone';
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = structuredClone;
}

// Enable Quereus debug logging in development
// The 'debug' library is used by Quereus for internal logging
// We need to enable it on QUEREUS's debug instance (not health's)
if (__DEV__) {
  try {
    // Get the debug instance that Quereus uses (from its node_modules)
    // This is necessary because portal: keeps quereus's dependencies separate
    const quereusDebug = require('../quereus/node_modules/debug');
    
    // Force debug to use console.log (console.debug may be filtered in RN)
    quereusDebug.log = console.log.bind(console);
    
    // Enable all Quereus logs, or be more selective:
    // 'quereus:vtab:memory' - memory table operations
    // 'quereus:runtime' - VDBE execution (very verbose)
    // 'quereus:*' - everything
    quereusDebug.enable('quereus:*');
    
    // Verify it's working
    const testLog = quereusDebug('quereus:test');
    testLog('Debug logging test from Quereus debug instance');
    console.log('[Debug] Quereus debug logging enabled');
  } catch (e) {
    console.warn('[Debug] Could not enable Quereus debug logging:', e);
  }
}

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
