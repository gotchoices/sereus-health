/**
 * @format
 */

// Polyfill for crypto.getRandomValues (needed for UUIDv4 generation on RN/Hermes)
import 'react-native-get-random-values';

// Polyfill for structuredClone (needed by Quereus in React Native)
import structuredClone from '@ungap/structured-clone';
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = structuredClone;
}

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
