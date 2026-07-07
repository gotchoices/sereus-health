const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

// Workspace root (monorepo)
const workspaceRoot = path.resolve(__dirname, '../../..');

// Stack mode is derived from package.json — the same file `use-stack.sh` edits.
// In `local` mode the ser packages are portal:'d to local clones and we alias
// them to source below; in `npm` mode they come from node_modules like any other
// dependency and these aliases/watch-folders must NOT be applied.
const appPkg = require('./package.json');
const localStack = String(
  (appPkg.dependencies && appPkg.dependencies['@serfab/cadre-core']) || '',
).startsWith('portal:');

// Node.js built-in stubs for libp2p transitive imports.
// Metro resolves all imports statically; these are never called at runtime.
// Remove each stub once the upstream package ships a proper "react-native"
// export condition (the existing "browser" field is ignored when "exports"
// is present in the package).
//
//   os       — @libp2p/utils  get-thin-waist-addresses.js
//   net, tls — @libp2p/websockets  listener.js
//   crypto   — @serfab/cadre-core  push-notifier-fcm.js (node:crypto.sign, FCM push).
//              Mapped to a real shim (createHash via @noble); sign() throws if the
//              unused FCM push path is ever invoked.
//   http2    — @serfab/cadre-core  push-notifier-apns.js (APNS push, Node-only; unused on device).
// (node:path / node:fs/promises are imported only by the `key-store-file` subpath,
//  which the RN app never imports, so they don't need stubbing.)
const emptyShim = path.resolve(__dirname, 'shims/empty.js');
const nodeCryptoShim = path.resolve(__dirname, 'shims/node-crypto.js');
const nodeBuiltinStubs = {
  os: emptyShim,
  'node:os': emptyShim,
  net: emptyShim,
  'node:net': emptyShim,
  tls: emptyShim,
  'node:tls': emptyShim,
  crypto: nodeCryptoShim,
  'node:crypto': nodeCryptoShim,
  http2: emptyShim,
  'node:http2': emptyShim,
};

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
    workspaceRoot,
    // Local-stack only: watch the ser package sources for direct resolution.
    ...(localStack
      ? [
          path.resolve(workspaceRoot, 'optimystic/packages'),
          path.resolve(workspaceRoot, 'sereus/packages'),
          path.resolve(workspaceRoot, 'fret/packages'),
        ]
      : []),
  ],
  transformer: {
    babelTransformerPath: require.resolve('./metro.transformer.js'),
  },
  resolver: {
    unstable_enableSymlinks: true,
    unstable_enablePackageExports: true,
    // Conditions for exports field resolution (order matters)
    unstable_conditionNames: ['import', 'require', 'default'],
    // Condition by platform
    unstable_conditionsByPlatform: {
      ios: ['react-native', 'import', 'require', 'default'],
      android: ['react-native', 'import', 'require', 'default'],
    },
    assetExts: defaultConfig.resolver.assetExts.filter(ext => ext !== 'qsql'),
    sourceExts: [...defaultConfig.resolver.sourceExts, 'qsql'],
    nodeModulesPaths: [
      // Mobile app's node_modules
      path.resolve(__dirname, 'node_modules'),
      // Health project root
      path.resolve(__dirname, '../../node_modules'),
      // Monorepo root (yarn workspaces hoists here)
      path.resolve(workspaceRoot, 'node_modules'),
      // Local-stack only: the ser workspaces' own node_modules (libp2p, etc.).
      ...(localStack
        ? [
            path.resolve(workspaceRoot, 'sereus/node_modules'),
            path.resolve(workspaceRoot, 'optimystic/node_modules'),
            path.resolve(workspaceRoot, 'quereus/node_modules'),
            path.resolve(workspaceRoot, 'fret/node_modules'),
          ]
        : []),
    ],
    // Map workspace packages to their actual locations (portal-like resolution).
    // Local-stack only — in npm mode these resolve from node_modules normally.
    extraNodeModules: {
      ...(localStack
        ? {
            // Optimystic packages (source)
            '@optimystic/quereus-plugin-crypto': path.resolve(workspaceRoot, 'optimystic/packages/quereus-plugin-crypto'),
            '@optimystic/quereus-plugin-optimystic': path.resolve(workspaceRoot, 'optimystic/packages/quereus-plugin-optimystic'),
            '@optimystic/db-core': path.resolve(workspaceRoot, 'optimystic/packages/db-core'),
            '@optimystic/db-p2p': path.resolve(workspaceRoot, 'optimystic/packages/db-p2p'),
            'p2p-fret': path.resolve(workspaceRoot, 'fret/packages/fret'),
            // Sereus packages (source)
            '@serfab/cadre-core': path.resolve(workspaceRoot, 'sereus/packages/cadre-core'),
            '@serfab/strand-proto': path.resolve(workspaceRoot, 'sereus/packages/strand-proto'),
            // Quereus packages (source)
            '@quereus/quereus': path.resolve(workspaceRoot, 'quereus/packages/quereus'),
            '@quereus/isolation': path.resolve(workspaceRoot, 'quereus/packages/quereus-isolation'),
            '@quereus/store': path.resolve(workspaceRoot, 'quereus/packages/quereus-store'),
          }
        : {}),
      // Health-local shared packages (source). Always aliased in both stack modes;
      // health/ is already a watchFolder, and package `exports` are honored
      // (unstable_enablePackageExports), so the `/chat` subpath resolves too.
      '@serfab/ai-models': path.resolve(__dirname, '../../packages/ai-models'),
      // Node.js built-in stubs (for libp2p transitive deps)
      ...nodeBuiltinStubs,
    },
    // Redirect Node-only packages to their RN-compatible entry points
    resolveRequest: (context, moduleName, platform) => {
      // Force @babel/runtime helpers to CJS.
      //
      // @babel/runtime's exports field lists conditions: node → import → default.
      // With 'import' active (needed for ESM-only packages like @libp2p/crypto),
      // Metro picks the ESM wrapper (export default), and require() receives
      // the module *object* instead of the helper *function*, causing:
      //   "TypeError: _interopRequireDefault is not a function (it is Object)"
      //
      // Node.js's require.resolve() uses the 'node' condition (first in the
      // exports map), so it always returns the CJS path.
      if (moduleName.startsWith('@babel/runtime/')) {
        try {
          return { type: 'sourceFile', filePath: require.resolve(moduleName) };
        } catch {
          // Fall through to default resolution
        }
      }

      // Note: @optimystic/db-p2p provides a "react-native" export condition
      // that resolves to ./dist/src/rn.js (no @libp2p/tcp).  Since
      // 'react-native' is in unstable_conditionsByPlatform, Metro resolves
      // this automatically — no manual redirect is needed.

      // Default resolution
      return context.resolveRequest(
        { ...context, resolveRequest: undefined },
        moduleName,
        platform,
      );
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
