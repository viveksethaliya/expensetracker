import notifee, { TriggerType, RepeatFrequency, TimestampTrigger, AndroidImportance } from '@notifee/react-native';

export const configureNotifications = async () => {
    try {
        await notifee.requestPermission();
    } catch (error) {
        console.warn('Notification permission request failed:', error);
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
                    smallIcon: 'ic_stat_notification',
                    pressAction: {
                        id: 'default',
                    },
                },
            },
            trigger,
        );
    } catch (error) {
        console.warn('Scheduling daily reminder failed:', error);
    }
};
