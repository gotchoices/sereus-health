const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * Allow importing shared workspace resources (e.g. `health/mock/data/*`)
 * while keeping `apps/mobile` as the RN app root.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [
    // Watch the health project root so Metro can resolve shared mock data.
    path.resolve(__dirname, '../..'),
    // Watch the workspace root so Metro can follow monorepo symlinks (e.g. portal deps).
    path.resolve(__dirname, '../../..'),
  ],
  transformer: {
    babelTransformerPath: require.resolve('./metro.transformer.js'),
  },
  resolver: {
    unstable_enableSymlinks: true,
    assetExts: defaultConfig.resolver.assetExts.filter(ext => ext !== 'qsql'),
    sourceExts: [...defaultConfig.resolver.sourceExts, 'qsql'],
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules'),
      path.resolve(__dirname, '../../../node_modules'),
    ],
  },
};

module.exports = mergeConfig(defaultConfig, config);
