import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Storage Keys ────────────────────────────────────────────────
export const STORAGE_KEYS = {
    TRANSACTIONS: '@expense_tracker/transactions',
    CATEGORIES: '@expense_tracker/categories',
    SETTINGS: '@expense_tracker/settings',
    TEMPLATES: '@expense_tracker/templates',
    SUBSCRIPTIONS: '@expense_tracker/subscriptions',
} as const;

// ── Generic helpers ─────────────────────────────────────────────

/**
 * Read a JSON value from AsyncStorage and parse it into type T.
 * Returns `null` when the key does not exist.
 */
export async function getItem<T>(key: string): Promise<T | null> {
    try {
        const raw = await AsyncStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
    } catch (error) {
        console.error(`[storage] Failed to read key "${key}"`, error);
        return null;
    }
}

/**
 * Serialise a value to JSON and persist it under the given key.
 */
export async function setItem<T>(key: string, value: T): Promise<void> {
    try {
        await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`[storage] Failed to write key "${key}"`, error);
    }
}

/**
 * Remove a key from AsyncStorage.
 */
export async function removeItem(key: string): Promise<void> {
    try {
        await AsyncStorage.removeItem(key);
    } catch (error) {
        console.error(`[storage] Failed to remove key "${key}"`, error);
    }
}
