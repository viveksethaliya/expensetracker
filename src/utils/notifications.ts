import notifee, { TriggerType, RepeatFrequency, TimestampTrigger, AndroidImportance, AuthorizationStatus } from '@notifee/react-native';
import { Alert, Platform } from 'react-native';
import BackgroundService from 'react-native-background-actions';
import { processSubscriptions } from './processSubscriptions';

export const configureNotifications = async (): Promise<boolean> => {
    try {
        const settings = await notifee.requestPermission();
        if (settings.authorizationStatus === AuthorizationStatus.AUTHORIZED || settings.authorizationStatus === AuthorizationStatus.PROVISIONAL) {
            return true;
        } else {
            Alert.alert('Permission needed', 'Please enable notifications in your settings so we can remind you to log expenses.');
            return false;
        }
    } catch (error: any) {
        console.warn('Notification permission request failed:', error);
        Alert.alert('Notification Error', `Failed to configure notifications: ${error?.message || 'Unknown error'}`);
        return false;
    }
};

export const checkNotificationHealth = async (): Promise<boolean> => {
    try {
        const settings = await notifee.getNotificationSettings();
        if (settings.authorizationStatus === AuthorizationStatus.AUTHORIZED || settings.authorizationStatus === AuthorizationStatus.PROVISIONAL) {
            return true;
        }
        return false;
    } catch (e) {
        return false;
    }
};

export const scheduleDailyReminder = async (enabled: boolean, hour: number = 20, minute: number = 0) => {
    try {
        // Always clear existing first
        await notifee.cancelNotification('daily-reminder');

        if (!enabled) return;

        // Create a channel (required for Android)
        const channelId = await notifee.createChannel({
            id: 'reminders',
            name: 'Daily Reminders',
            importance: AndroidImportance.HIGH,
        });

        const date = new Date(Date.now());
        date.setHours(hour);
        date.setMinutes(minute);
        date.setSeconds(0);
        date.setMilliseconds(0);

        // If the time has already passed today, schedule for tomorrow
        if (date.getTime() <= Date.now()) {
            date.setDate(date.getDate() + 1);
        }

        const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: date.getTime(),
            repeatFrequency: RepeatFrequency.DAILY,
        };

        await notifee.createTriggerNotification(
            {
                id: 'daily-reminder', // Fixed ID so it replaces itself
                title: 'Expense Tracker',
                body: 'Did you spend anything today? Don\'t forget to log it!',
                android: {
                    channelId,
                    // Dedicated monochrome status-bar icon for Android notifications.
                    smallIcon: 'ic_launcher',
                    pressAction: {
                        id: 'default',
                    },
                },
            },
            trigger,
        );
    } catch (error: any) {
        console.warn('Scheduling daily reminder failed:', error);
        Alert.alert('Notification Error', `Failed to schedule reminder: ${error?.message || 'Unknown error'}`);
    }
};

const sleep = (time: any) => new Promise<void>((resolve) => setTimeout(() => resolve(), time));

// Robust background task management for auto-subscriptions and recurring processes
export const startBackgroundService = async (): Promise<boolean> => {
    if (Platform.OS === 'android' && !BackgroundService.isRunning()) {
        try {
            await BackgroundService.start(async (taskDataArguments) => {
                await new Promise(async (resolve) => {
                    // Process immediately on start, then every 15 minutes
                    while (BackgroundService.isRunning()) {
                        try {
                            await processSubscriptions();
                        } catch (e) {
                            console.warn('[BackgroundService] processSubscriptions error:', e);
                        }
                        await sleep(900000); // Check every 15 minutes
                    }
                });
            }, {
                taskName: 'ExpenseTrackerTask',
                taskTitle: 'Expense Tracker Sync',
                taskDesc: 'Syncing recurring expenses in background',
                taskIcon: {
                    name: 'ic_launcher',
                    type: 'mipmap',
                },
                color: '#6200ee',
                linkingURI: 'expensetracker://', // Adjust if using deep links
                parameters: {
                    delay: 1000,
                },
            });
            return true;
        } catch (error: any) {
            console.warn('Failed to start background service:', error);
            Alert.alert('Background Task Failed', 'Could not run background service. Please ensure permissions are enabled.');
            return false;
        }
    }
    return BackgroundService.isRunning();
};

export const stopBackgroundService = async (): Promise<boolean> => {
    if (Platform.OS === 'android' && BackgroundService.isRunning()) {
        try {
            await BackgroundService.stop();
            return false;
        } catch (error) {
            console.warn('Failed to stop background service:', error);
            return true;
        }
    }
    return false;
};
