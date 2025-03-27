module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Required for expo-router
      'expo-router/babel',
      // Enable reanimated's babel plugin
      'react-native-reanimated/plugin',
    ],
  };
};