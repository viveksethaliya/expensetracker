module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-safe-area-context|react-native-screens|react-native-svg|react-native-gesture-handler|react-native-reanimated|react-native-chart-kit|@notifee/react-native|@react-native-async-storage)/)',
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
};
