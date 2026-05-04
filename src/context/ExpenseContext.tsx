import React, { createContext, useState, useEffect, useMemo } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { getItem, setItem, STORAGE_KEYS } from '../utils/storage';
import { database } from '../database';
import { Q } from '@nozbe/watermelondb';
import WatermelonTransaction from '../database/models/Transaction';
import WatermelonCategory from '../database/models/Category';
import WatermelonTransactionTemplate from '../database/models/TransactionTemplate';
import WatermelonAutoSubscription from '../database/models/AutoSubscription';
import { migrateFromAsyncStorage } from '../database/migration';
import { processSubscriptions } from '../utils/processSubscriptions';
import { AppBackupData } from '../utils/backup';

// ═══════════════════════════════════════════════════════════════
// ── Type definitions ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

// Re-export shared types from model layer (single source of truth)
export type { TransactionType } from '../database/models/Transaction';
import type { TransactionType } from '../database/models/Transaction';

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

// Re-export shared type from model layer
export type { SubscriptionInterval } from '../database/models/AutoSubscription';
import type { SubscriptionInterval } from '../database/models/AutoSubscription';

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
    monthlyBudget: number;
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
    monthlyBudget: 0,
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

    // ── Backup ──
    importData: (data: AppBackupData) => Promise<boolean>;

    // ── Settings ──
    settings: AppSettings;
    updateSettings: (patch: Partial<AppSettings>) => void;

    // ── App State ──
    hasLaunched: boolean;
    completeOnboarding: () => Promise<void>;

    // ── Loading state ──
    isLoading: boolean;
    isProcessing: boolean;
    setProcessing: (processing: boolean) => void;
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
    importData: async () => false,
    settings: DEFAULT_SETTINGS,
    updateSettings: () => { },
    hasLaunched: true,
    completeOnboarding: async () => { },
    isLoading: true,
    isProcessing: false,
    setProcessing: () => { },
});

// ═══════════════════════════════════════════════════════════════
// ── Provider component ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

export const ExpenseProvider = ({ children }: { children: React.ReactNode }) => {
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setProcessing] = useState(false);
    const [hasLaunched, setHasLaunched] = useState(true);

    useEffect(() => {
        const initDB = async () => {
            await migrateFromAsyncStorage();

            const storedSettings = await getItem<AppSettings>(STORAGE_KEYS.SETTINGS);
            if (storedSettings) setSettings(storedSettings);

            const launched = await getItem<string>(STORAGE_KEYS.HAS_LAUNCHED);
            setHasLaunched(launched === 'true');

            // Process any due subscriptions on app launch
            try { await processSubscriptions(); } catch (e) { console.warn('Startup subscription processing failed:', e); }

            setIsLoading(false);
        };
        initDB();
    }, []);

    const completeOnboarding = async () => {
        await setItem(STORAGE_KEYS.HAS_LAUNCHED, 'true');
        setHasLaunched(true);
    };

    const updateSettings = async (patch: Partial<AppSettings>) => {
        const newSettings = { ...settings, ...patch };
        setSettings(newSettings);
        await setItem(STORAGE_KEYS.SETTINGS, newSettings);
    };

    const addTransaction = async (txn: Omit<Transaction, 'id'>) => {
        await database.write(async () => {
            try {
                await database.collections.get<WatermelonTransaction>('transactions').create(record => {
                    record.type = txn.type;
                    record.title = txn.title;
                    record.amount = txn.amount;
                    record.categoryId = txn.categoryId;
                    record.date = txn.date;
                    record.notes = txn.notes;
                });
            } catch (e) {
                console.error('Failed to add transaction', e);
            }
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
            } catch (e) { console.error('Failed to delete transaction', e); }
        });
    };

    const addCategory = async (cat: Omit<Category, 'id'>) => {
        await database.write(async () => {
            try {
                await database.collections.get<WatermelonCategory>('categories').create(record => {
                    record.name = cat.name;
                    record.type = cat.type;
                    record.icon = cat.icon;
                });
            } catch (e) {
                console.error('Failed to add category', e);
            }
        });
    };

    const updateCategory = async (cat: Category) => {
        await database.write(async () => {
            try {
                const record = await database.collections.get<WatermelonCategory>('categories').find(cat.id);
                await record.update(r => {
                    r.name = cat.name;
                    r.type = cat.type;
                    r.icon = cat.icon;
                });
            } catch (e) {
                console.error('Category not found for update', e);
            }
        });
    };

    const deleteCategory = async (id: string) => {
        await database.write(async () => {
            try {
                const categoryRecord = await database.collections.get<WatermelonCategory>('categories').find(id);
                const categoryType = categoryRecord.type;

                // Find or create a "General" fallback category of the same type
                const generalCats = await database.collections
                    .get<WatermelonCategory>('categories')
                    .query(Q.where('name', 'General'), Q.where('type', categoryType))
                    .fetch();

                let generalId: string;
                if (generalCats.length > 0) {
                    generalId = generalCats[0].id;
                } else {
                    const newGeneral = await database.collections.get<WatermelonCategory>('categories').create(r => {
                        r.name = 'General';
                        r.type = categoryType;
                        r.icon = '📌';
                    });
                    generalId = newGeneral.id;
                }

                // Reassign orphaned transactions to the fallback category
                const orphanedTxns = await database.collections
                    .get<WatermelonTransaction>('transactions')
                    .query(Q.where('category_id', id))
                    .fetch();
                for (const txn of orphanedTxns) {
                    await txn.update(r => { r.categoryId = generalId; });
                }

                // Delete templates referencing this category
                const orphanedTemplates = await database.collections
                    .get<WatermelonTransactionTemplate>('templates')
                    .query(Q.where('category_id', id))
                    .fetch();
                for (const tpl of orphanedTemplates) {
                    await tpl.markAsDeleted();
                }

                // Delete subscriptions referencing this category
                const orphanedSubs = await database.collections
                    .get<WatermelonAutoSubscription>('subscriptions')
                    .query(Q.where('category_id', id))
                    .fetch();
                for (const sub of orphanedSubs) {
                    await sub.markAsDeleted();
                }

                // Finally delete the category itself
                await categoryRecord.markAsDeleted();
            } catch (e) {
                console.error('Failed to delete category with cascade', e);
            }
        });
    };

    const addTemplate = async (tpl: Omit<TransactionTemplate, 'id'>) => {
        await database.write(async () => {
            try {
                await database.collections.get<WatermelonTransactionTemplate>('templates').create(record => {
                    record.type = tpl.type;
                    record.title = tpl.title;
                    record.amount = tpl.amount;
                    record.categoryId = tpl.categoryId;
                    record.notes = tpl.notes;
                });
            } catch (e) {
                console.error('Failed to add template', e);
            }
        });
    };

    const deleteTemplate = async (id: string) => {
        await database.write(async () => {
            try {
                const record = await database.collections.get<WatermelonTransactionTemplate>('templates').find(id);
                await record.markAsDeleted();
            } catch (e) {
                console.error('Template not found for delete', e);
            }
        });
    };

    const addSubscription = async (sub: Omit<AutoSubscription, 'id'>) => {
        await database.write(async () => {
            try {
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
            } catch (e) {
                console.error('Failed to add subscription', e);
            }
        });
    };

    const deleteSubscription = async (id: string) => {
        await database.write(async () => {
            try {
                const record = await database.collections.get<WatermelonAutoSubscription>('subscriptions').find(id);
                await record.markAsDeleted();
            } catch (e) {
                console.error('Subscription not found for delete', e);
            }
        });
    };

    const importData = async (data: AppBackupData): Promise<boolean> => {
        try {
            await database.write(async () => {
                const transactionsCollection = database.collections.get<WatermelonTransaction>('transactions');
                const categoriesCollection = database.collections.get<WatermelonCategory>('categories');
                const templatesCollection = database.collections.get<WatermelonTransactionTemplate>('templates');
                const subscriptionsCollection = database.collections.get<WatermelonAutoSubscription>('subscriptions');

                // Clear all existing data to prevent duplicates on import
                const allTxns = await transactionsCollection.query().fetch();
                const allCats = await categoriesCollection.query().fetch();
                const allTpls = await templatesCollection.query().fetch();
                const allSubs = await subscriptionsCollection.query().fetch();

                const deleteOps = [...allTxns, ...allCats, ...allTpls, ...allSubs].map(r => r.prepareDestroyPermanently());

                // Prepare new category inserts and build old→new ID mapping
                const categoryIdMap: Record<string, string> = {};
                const insertCats = data.categories.map((c, index) => {
                    const record = categoriesCollection.prepareCreate(r => {
                        r.name = c.name;
                        r.type = c.type;
                        r.icon = c.icon;
                    });
                    return record;
                });

                // We need to batch categories first to get their IDs, then map
                // Since prepareCreate generates the ID immediately, we can read it
                // Build mapping: use name+type as the lookup key from backup data
                const catLookup: Record<string, string> = {};
                insertCats.forEach((record, index) => {
                    const original = data.categories[index];
                    // Map by name+type for reliable matching
                    catLookup[`${original.name}__${original.type}`] = record.id;
                });

                // Also build a direct oldId → newId map using the default category IDs
                // This handles backup files that use well-known IDs like cat_salary
                const defaultCatNames: Record<string, { name: string; type: string }> = {
                    'cat_food': { name: 'Food', type: 'expense' },
                    'cat_transport': { name: 'Transport', type: 'expense' },
                    'cat_shopping': { name: 'Shopping', type: 'expense' },
                    'cat_bills': { name: 'Bills', type: 'expense' },
                    'cat_entertainment': { name: 'Entertainment', type: 'expense' },
                    'cat_health': { name: 'Health', type: 'expense' },
                    'cat_education': { name: 'Education', type: 'expense' },
                    'cat_other_exp': { name: 'Other', type: 'expense' },
                    'cat_salary': { name: 'Salary', type: 'income' },
                    'cat_freelance': { name: 'Freelance', type: 'income' },
                    'cat_investment': { name: 'Investment', type: 'income' },
                    'cat_other_inc': { name: 'Other', type: 'income' },
                };

                // For each old categoryId used in the backup, find the new ID
                const resolveCategory = (oldId: string): string => {
                    // Check if there's a direct match via default mapping
                    const defaultInfo = defaultCatNames[oldId];
                    if (defaultInfo) {
                        const newId = catLookup[`${defaultInfo.name}__${defaultInfo.type}`];
                        if (newId) return newId;
                    }
                    // Check if the oldId itself exists as a name+type key
                    if (catLookup[oldId]) return catLookup[oldId];
                    // Fallback: return the first category ID or the oldId itself
                    return insertCats.length > 0 ? insertCats[0].id : oldId;
                };

                const insertTxns = data.transactions.map(t => transactionsCollection.prepareCreate(r => {
                    r.type = t.type;
                    r.title = t.title;
                    r.amount = t.amount;
                    r.categoryId = resolveCategory(t.categoryId);
                    r.date = t.date;
                    r.notes = t.notes;
                }));

                const insertTpls = data.templates.map(tpl => templatesCollection.prepareCreate(r => {
                    r.type = tpl.type;
                    r.title = tpl.title;
                    r.amount = tpl.amount;
                    r.categoryId = resolveCategory(tpl.categoryId);
                    r.notes = tpl.notes;
                }));

                const insertSubs = data.subscriptions.map(sub => subscriptionsCollection.prepareCreate(r => {
                    r.type = sub.type;
                    r.title = sub.title;
                    r.amount = sub.amount;
                    r.categoryId = resolveCategory(sub.categoryId);
                    r.interval = sub.interval;
                    r.nextBillingDate = sub.nextBillingDate;
                    r.notes = sub.notes;
                    r.anchorDay = sub.anchorDay ?? null;
                    r.anchorMonth = sub.anchorMonth ?? null;
                }));

                // Batch everything
                await database.batch(...deleteOps, ...insertCats, ...insertTxns, ...insertTpls, ...insertSubs);
            });

            if (data.settings) {
                await updateSettings(data.settings);
            }

            return true;
        } catch (e) {
            console.error('Failed to import backup data', e);
            return false;
        }
    };

    const contextValue = useMemo(() => ({
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
        importData,
        settings,
        updateSettings,
        hasLaunched,
        completeOnboarding,
        isLoading,
        isProcessing,
        setProcessing,
    }), [
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
        importData,
        settings,
        updateSettings,
        hasLaunched,
        completeOnboarding,
        isLoading,
        isProcessing,
        setProcessing
    ]);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: settings.theme === 'dark' ? '#121212' : '#fff' }}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>💰</Text>
                <Text style={{ fontSize: 22, fontWeight: '700', color: settings.theme === 'dark' ? '#efefef' : '#333', marginBottom: 8 }}>
                    Expense Friend
                </Text>
                <ActivityIndicator size="large" color="#6200ee" />
            </View>
        );
    }


    return (
        <ExpenseContext.Provider value={contextValue}>
            {children}
        </ExpenseContext.Provider>
    );
};
