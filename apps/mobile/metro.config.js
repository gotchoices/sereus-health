const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withCadreMetro } = require('@serfab/cadre-rn/metro');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

// Workspace root (the ser/ directory holding health, sereus, optimystic, ...)
const workspaceRoot = path.resolve(__dirname, '../../..');

// Stack mode is derived from package.json — the same file `use-stack.sh` edits.
// In `local` mode the ser packages are portal:'d to local clones and we alias
// them to source below; in `npm` mode they come from node_modules like any other
// dependency and these aliases/watch-folders must NOT be applied.
const appPkg = require('./package.json');
const localStack = String(
  (appPkg.dependencies && appPkg.dependencies['@serfab/cadre-core']) || '',
).startsWith('portal:');

/**
 * Health's own Metro settings.  Everything the sereus stack needs from Metro
 * — Node built-in shims (os, crypto, net, tls, stream, buffer), one copy of each
 * native module, `@babel/runtime` helpers resolved to CJS, and the Hermes-safe
 * `browser` variants of @libp2p/crypto + @libp2p/webrtc — now comes from
 * `withCadreMetro` (below), which replaced the hand-maintained copies that used
 * to live here.  What remains is specific to this app.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const healthConfig = {
  watchFolders: [
    // The health project root: shared mock data (`health/mock/data/*`) and the
    // canonical schema (`design/specs/domain/schema.qsql`) live outside the app.
    path.resolve(__dirname, '../..'),
    // Workspace root, so Metro can follow monorepo symlinks (e.g. portal deps).
    workspaceRoot,
  ],
  transformer: {
    // Loads `.qsql` schema files as strings.
    babelTransformerPath: require.resolve('./metro.transformer.js'),
  },
  resolver: {
    unstable_enablePackageExports: true,
    // Condition names are the app's call (the kit leaves them alone).
    unstable_conditionNames: ['import', 'require', 'default'],
    unstable_conditionsByPlatform: {
      ios: ['react-native', 'import', 'require', 'default'],
      android: ['react-native', 'import', 'require', 'default'],
    },
    assetExts: defaultConfig.resolver.assetExts.filter(ext => ext !== 'qsql'),
    sourceExts: [...defaultConfig.resolver.sourceExts, 'qsql'],
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    extraNodeModules: {
      // Local-stack only: resolve the ser packages from source.
      ...(localStack
        ? {
            '@optimystic/quereus-plugin-crypto': path.resolve(workspaceRoot, 'optimystic/packages/quereus-plugin-crypto'),
            '@optimystic/quereus-plugin-optimystic': path.resolve(workspaceRoot, 'optimystic/packages/quereus-plugin-optimystic'),
            '@optimystic/db-core': path.resolve(workspaceRoot, 'optimystic/packages/db-core'),
            '@optimystic/db-p2p': path.resolve(workspaceRoot, 'optimystic/packages/db-p2p'),
            'p2p-fret': path.resolve(workspaceRoot, 'fret/packages/fret'),
            '@serfab/cadre-core': path.resolve(workspaceRoot, 'sereus/packages/cadre-core'),
            '@serfab/cadre-rn': path.resolve(workspaceRoot, 'sereus/packages/cadre-rn'),
            '@quereus/quereus': path.resolve(workspaceRoot, 'quereus/packages/quereus'),
            '@quereus/isolation': path.resolve(workspaceRoot, 'quereus/packages/quereus-isolation'),
            '@quereus/store': path.resolve(workspaceRoot, 'quereus/packages/quereus-store'),
          }
        : {}),
      // Health-local shared packages (source), in both stack modes.
      '@serfab/ai-models': path.resolve(__dirname, '../../packages/ai-models'),
    },
  },
};

module.exports = withCadreMetro(mergeConfig(defaultConfig, healthConfig), {
  projectRoot: __dirname,
  // Local-stack only: watch the ser checkouts and search their node_modules.
  linkedRoots: localStack
    ? ['sereus', 'optimystic', 'quereus', 'fret'].map(d => path.resolve(workspaceRoot, d))
    : [],
});
