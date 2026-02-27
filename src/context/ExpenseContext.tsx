import React, { createContext, useState, useEffect } from 'react';
import { getItem, setItem, STORAGE_KEYS } from '../utils/storage';
import { scheduleDailyReminder } from '../utils/notifications';
import { database } from '../database';
import WatermelonTransaction from '../database/models/Transaction';
import WatermelonCategory from '../database/models/Category';
import WatermelonTransactionTemplate from '../database/models/TransactionTemplate';
import WatermelonAutoSubscription from '../database/models/AutoSubscription';
import { migrateFromAsyncStorage } from '../database/migration';
import { processSubscriptions } from '../utils/processSubscriptions';

// ═══════════════════════════════════════════════════════════════
// ── Type definitions ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

export type TransactionType = 'income' | 'expense';

export interface Transaction {
    id: string;
    type: TransactionType;
    title: string;
    amount: number;
    categoryId: string;
    date: string;          // ISO-8601 string for easy serialisation
    notes: string;
}

export interface TransactionTemplate {
    id: string;
    type: TransactionType;
    title: string;
    amount: number;
    categoryId: string;
    notes: string;
}

export type SubscriptionInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface AutoSubscription {
    id: string;
    type: TransactionType;
    title: string;
    amount: number;
    categoryId: string;
    interval: SubscriptionInterval;
    nextBillingDate: string; // ISO string 
    notes: string;
    anchorDay?: number | null;
    anchorMonth?: number | null;
}

export interface Category {
    id: string;
    name: string;
    type: TransactionType;
    icon: string;
}

export type ThemeMode = 'light' | 'dark';

export interface AppSettings {
    currency: string;
    theme: ThemeMode;
    dailyReminder: boolean;
}

export const DEFAULT_CATEGORIES: Category[] = [
    { id: 'cat_food', name: 'Food', type: 'expense', icon: '🍔' },
    { id: 'cat_transport', name: 'Transport', type: 'expense', icon: '🚗' },
    { id: 'cat_shopping', name: 'Shopping', type: 'expense', icon: '🛒' },
    { id: 'cat_bills', name: 'Bills', type: 'expense', icon: '🧾' },
    { id: 'cat_entertainment', name: 'Entertainment', type: 'expense', icon: '🎬' },
    { id: 'cat_health', name: 'Health', type: 'expense', icon: '🏥' },
    { id: 'cat_education', name: 'Education', type: 'expense', icon: '📚' },
    { id: 'cat_other_exp', name: 'Other', type: 'expense', icon: '📦' },
    { id: 'cat_salary', name: 'Salary', type: 'income', icon: '💰' },
    { id: 'cat_freelance', name: 'Freelance', type: 'income', icon: '💼' },
    { id: 'cat_investment', name: 'Investment', type: 'income', icon: '📈' },
    { id: 'cat_other_inc', name: 'Other', type: 'income', icon: '🏷️' },
];

export const DEFAULT_SETTINGS: AppSettings = {
    currency: '₹',
    theme: 'light',
    dailyReminder: false,
};

// ═══════════════════════════════════════════════════════════════
// ── Context type ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

export interface ExpenseContextType {
    // ── Database Operations ──
    addTransaction: (txn: Omit<Transaction, 'id'>) => Promise<void>;
    updateTransaction: (txn: Transaction) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;

    addCategory: (cat: Omit<Category, 'id'>) => Promise<void>;
    updateCategory: (cat: Category) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;

    addTemplate: (tpl: Omit<TransactionTemplate, 'id'>) => Promise<void>;
    deleteTemplate: (id: string) => Promise<void>;

    addSubscription: (sub: Omit<AutoSubscription, 'id'>) => Promise<void>;
    deleteSubscription: (id: string) => Promise<void>;

    // ── Settings ──
    settings: AppSettings;
    updateSettings: (patch: Partial<AppSettings>) => void;

    // ── Loading state ──
    isLoading: boolean;
}

const noop = async () => { };

export const ExpenseContext = createContext<ExpenseContextType>({
    addTransaction: noop,
    updateTransaction: noop,
    deleteTransaction: noop,
    addCategory: noop,
    updateCategory: noop,
    deleteCategory: noop,
    addTemplate: noop,
    deleteTemplate: noop,
    addSubscription: noop,
    deleteSubscription: noop,
    settings: DEFAULT_SETTINGS,
    updateSettings: () => { },
    isLoading: true,
});

// ═══════════════════════════════════════════════════════════════
// ── Provider component ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

export const ExpenseProvider = ({ children }: { children: React.ReactNode }) => {
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initDB = async () => {
            await migrateFromAsyncStorage();

            const storedSettings = await getItem<AppSettings>(STORAGE_KEYS.SETTINGS);
            if (storedSettings) setSettings(storedSettings);

            // Process any due subscriptions on app launch
            try { await processSubscriptions(); } catch (e) { console.warn('Startup subscription processing failed:', e); }

            setIsLoading(false);
        };
        initDB();
    }, []);

    const updateSettings = async (patch: Partial<AppSettings>) => {
        const newSettings = { ...settings, ...patch };
        setSettings(newSettings);
        await setItem(STORAGE_KEYS.SETTINGS, newSettings);

        if (patch.dailyReminder !== undefined) {
            try { scheduleDailyReminder(patch.dailyReminder); } catch (e) { }
        }
    };

    const addTransaction = async (txn: Omit<Transaction, 'id'>) => {
        await database.write(async () => {
            await database.collections.get<WatermelonTransaction>('transactions').create(record => {
                record.type = txn.type;
                record.title = txn.title;
                record.amount = txn.amount;
                record.categoryId = txn.categoryId;
                record.date = txn.date;
                record.notes = txn.notes;
            });
        });
    };

    const updateTransaction = async (txn: Transaction) => {
        await database.write(async () => {
            try {
                const record = await database.collections.get<WatermelonTransaction>('transactions').find(txn.id);
                await record.update(r => {
                    r.type = txn.type;
                    r.title = txn.title;
                    r.amount = txn.amount;
                    r.categoryId = txn.categoryId;
                    r.date = txn.date;
                    r.notes = txn.notes;
                });
            } catch (e) {
                console.error("Txn not found", e);
            }
        });
    };

    const deleteTransaction = async (id: string) => {
        await database.write(async () => {
            try {
                const record = await database.collections.get<WatermelonTransaction>('transactions').find(id);
                await record.markAsDeleted();
            } catch (e) { }
        });
    };

    const addCategory = async (cat: Omit<Category, 'id'>) => {
        await database.write(async () => {
            await database.collections.get<WatermelonCategory>('categories').create(record => {
                record.name = cat.name;
                record.type = cat.type;
                record.icon = cat.icon;
            });
        });
    };

    const updateCategory = async (cat: Category) => {
        await database.write(async () => {
            const record = await database.collections.get<WatermelonCategory>('categories').find(cat.id);
            await record.update(r => {
                r.name = cat.name;
                r.type = cat.type;
                r.icon = cat.icon;
            });
        });
    };

    const deleteCategory = async (id: string) => {
        await database.write(async () => {
            const record = await database.collections.get<WatermelonCategory>('categories').find(id);
            await record.markAsDeleted();
        });
    };

    const addTemplate = async (tpl: Omit<TransactionTemplate, 'id'>) => {
        await database.write(async () => {
            await database.collections.get<WatermelonTransactionTemplate>('templates').create(record => {
                record.type = tpl.type;
                record.title = tpl.title;
                record.amount = tpl.amount;
                record.categoryId = tpl.categoryId;
                record.notes = tpl.notes;
            });
        });
    };

    const deleteTemplate = async (id: string) => {
        await database.write(async () => {
            const record = await database.collections.get<WatermelonTransactionTemplate>('templates').find(id);
            await record.markAsDeleted();
        });
    };

    const addSubscription = async (sub: Omit<AutoSubscription, 'id'>) => {
        await database.write(async () => {
            await database.collections.get<WatermelonAutoSubscription>('subscriptions').create(record => {
                record.type = sub.type;
                record.title = sub.title;
                record.amount = sub.amount;
                record.categoryId = sub.categoryId;
                record.interval = sub.interval;
                record.nextBillingDate = sub.nextBillingDate;
                record.notes = sub.notes;
                record.anchorDay = sub.anchorDay ?? null;
                record.anchorMonth = sub.anchorMonth ?? null;
            });
        });
    };

    const deleteSubscription = async (id: string) => {
        await database.write(async () => {
            const record = await database.collections.get<WatermelonAutoSubscription>('subscriptions').find(id);
            await record.markAsDeleted();
        });
    };

    return (
        <ExpenseContext.Provider
            value={{
                addTransaction,
                updateTransaction,
                deleteTransaction,
                addCategory,
                updateCategory,
                deleteCategory,
                addTemplate,
                deleteTemplate,
                addSubscription,
                deleteSubscription,
                settings,
                updateSettings,
                isLoading,
            }}
        >
            {children}
        </ExpenseContext.Provider>
    );
};
