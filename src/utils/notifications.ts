import notifee, { TriggerType, RepeatFrequency, TimestampTrigger, AndroidImportance, AuthorizationStatus } from '@notifee/react-native';
import { Alert, Platform } from 'react-native';
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
    } catch (error: unknown) {
        console.warn('Notification permission request failed:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        Alert.alert('Notification Error', `Failed to configure notifications: ${message}`);
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
                title: 'Expense Friend',
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
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Scheduling daily reminder failed:', error);
        Alert.alert('Notification Error', `Failed to schedule reminder: ${message}`);
    }
};

export const startBackgroundService = async (): Promise<boolean> => {
    // Background service removed at user request to get rid of sticky notification
    return false;
};

export const stopBackgroundService = async (): Promise<boolean> => {
    return false;
};
