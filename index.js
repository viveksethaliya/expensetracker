/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

try {
    const notifee = require('@notifee/react-native').default;
    notifee.onBackgroundEvent(async () => { });
} catch (e) {
    // Notifee native module not available — skip silently
}

AppRegistry.registerComponent(appName, () => App);
