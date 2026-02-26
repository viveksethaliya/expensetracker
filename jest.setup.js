/* eslint-env jest */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock'),
);

jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
  screensEnabled: jest.fn(),
  Screen: ({children}) => children,
  ScreenContainer: ({children}) => children,
  NativeScreen: ({children}) => children,
  NativeScreenContainer: ({children}) => children,
}));

jest.mock('react-native-chart-kit', () => {
  const React = require('react');
  return {
    PieChart: () => React.createElement('View', null),
  };
});

jest.mock('lucide-react-native', () => {
  const React = require('react');
  return new Proxy(
    {},
    {
      get: (_target, iconName) => (props) =>
        React.createElement('Icon', {
          ...props,
          iconName: String(iconName),
        }),
    },
  );
});

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    requestPermission: jest.fn().mockResolvedValue({}),
    createChannel: jest.fn().mockResolvedValue('reminders'),
    createTriggerNotification: jest.fn().mockResolvedValue(undefined),
    cancelNotification: jest.fn().mockResolvedValue(undefined),
    onBackgroundEvent: jest.fn(),
  },
  TriggerType: {TIMESTAMP: 0},
  RepeatFrequency: {DAILY: 0},
  AndroidImportance: {HIGH: 4},
}));
