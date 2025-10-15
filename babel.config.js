// babel.config.js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // MUST come before other plugins that transform imports
      "expo-router/babel",

      // keep your other plugins here (e.g. react-native-reanimated plugin)
      "react-native-reanimated/plugin"
      // ...other plugins
    ],
  };
};
