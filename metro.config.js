const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * With hoistingLimits, health has local node_modules but needs to access workspace packages
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [
    // Watch workspace root so Metro can find @quereus/quereus and its dependencies
    path.resolve(__dirname, '..'),
  ],
  resolver: {
    // Also look in workspace root node_modules for quereus's dependencies
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../node_modules'),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
