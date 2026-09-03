module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    '@babel/plugin-transform-export-namespace-from',
    // Static class blocks (`static { ... }`) — used by @optimystic/db-p2p 0.27
    // (e.g. storage/block-latch.js); not enabled by the RN preset by default.
    '@babel/plugin-transform-class-static-block',
    // react-native-reanimated v4's worklet transform. MUST be the last plugin.
    'react-native-worklets/plugin',
  ],
};
