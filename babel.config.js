module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    // ...andere Plugins falls vorhanden
    'react-native-worklets/plugin', // muss als letztes stehen
  ],
};