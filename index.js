/**
 * @format
 */

// Polyfill for structuredClone (needed by Quereus in React Native)
// structuredClone is a Web/Node.js 17+ global API not available in RN
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = function structuredClone(obj) {
    // Simple deep clone using JSON parse/stringify
    // Works for Quereus's use case (cloning SqlValue types in B-tree nodes)
    return JSON.parse(JSON.stringify(obj));
  };
}

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
