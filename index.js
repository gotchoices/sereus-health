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
//!if (__DEV__) {
//!  // Import must be dynamic to avoid loading before polyfills
//!  const { enableLogging } = require('@quereus/quereus');
//!  
//!  // Enable selective Quereus logs (use console.log since console.debug may be filtered in RN)
//!  // Focus on database operations, runtime scan, and memory table - exclude optimizer/parser noise
//!  enableLogging(
//!    'quereus:core:database*,quereus:core:statement:debug,quereus:runtime:scan:debug,quereus:vtab:memory:*,quereus:schema:manager',
//!    console.log.bind(console)
//!  );
//!  console.log('[Debug] Quereus debug logging enabled');
//!}

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
