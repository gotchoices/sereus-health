module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    '@babel/plugin-transform-export-namespace-from',
    // react-native-reanimated v4's worklet transform. MUST be the last plugin.
    'react-native-worklets/plugin',
  ],
};
