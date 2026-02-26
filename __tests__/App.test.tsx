/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@react-navigation/native', () => {
  const ReactLib = require('react');
  return {
    NavigationContainer: ({children}: {children: React.ReactNode}) =>
      ReactLib.createElement(ReactLib.Fragment, null, children),
  };
});

jest.mock('@react-navigation/native-stack', () => {
  const ReactLib = require('react');
  return {
    createNativeStackNavigator: () => ({
      Navigator: ({children}: {children: React.ReactNode}) =>
        ReactLib.createElement(ReactLib.Fragment, null, children),
      Screen: () => null,
    }),
  };
});

jest.mock('@react-navigation/bottom-tabs', () => {
  const ReactLib = require('react');
  return {
    createBottomTabNavigator: () => ({
      Navigator: ({children}: {children: React.ReactNode}) =>
        ReactLib.createElement(ReactLib.Fragment, null, children),
      Screen: () => null,
    }),
  };
});

import App from '../App';

test('renders correctly', async () => {
  let app: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    app = ReactTestRenderer.create(<App />);
    await Promise.resolve();
  });
  expect(app).toBeTruthy();
});
