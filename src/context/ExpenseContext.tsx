import React, {
    createContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
} from 'react';
import { getItem, setItem, STORAGE_KEYS } from '../utils/storage';
import { scheduleDailyReminder } from '../utils/notifications';

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
    // Stable anchors for monthly/yearly recurrences.
    anchorDay?: number;
    anchorMonth?: number; // 0-11, used for yearly plans
}

export interface Category {
    id: string;
    name: string;
    type: TransactionType; // category is specific to income or expense
    icon: string;          // emoji or icon name
}

export type ThemeMode = 'light' | 'dark';

export interface AppSettings {
    currency: string;      // e.g. "₹", "$", "€"
    theme: ThemeMode;
    dailyReminder: boolean;
}

// ── Default categories ────────────────────────────────────────

export const DEFAULT_CATEGORIES: Category[] = [
    // Expense categories
    { id: 'cat_food', name: 'Food', type: 'expense', icon: '🍔' },
    { id: 'cat_transport', name: 'Transport', type: 'expense', icon: '🚗' },
    { id: 'cat_shopping', name: 'Shopping', type: 'expense', icon: '🛒' },
    { id: 'cat_bills', name: 'Bills', type: 'expense', icon: '🧾' },
    { id: 'cat_entertainment', name: 'Entertainment', type: 'expense', icon: '🎬' },
    { id: 'cat_health', name: 'Health', type: 'expense', icon: '🏥' },
    { id: 'cat_education', name: 'Education', type: 'expense', icon: '📚' },
    { id: 'cat_other_exp', name: 'Other', type: 'expense', icon: '📦' },
    // Income categories
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

const getDaysInMonth = (year: number, month: number): number =>
    new Date(year, month + 1, 0).getDate();

const clampDayInMonth = (year: number, month: number, day: number): number =>
    Math.min(Math.max(day, 1), getDaysInMonth(year, month));

const addMonthsWithAnchor = (date: Date, monthsToAdd: number, anchorDay: number): Date => {
    const totalMonths = date.getMonth() + monthsToAdd;
    const targetYear = date.getFullYear() + Math.floor(totalMonths / 12);
    const targetMonth = ((totalMonths % 12) + 12) % 12;
    const nextDate = new Date(date);
    nextDate.setFullYear(
        targetYear,
        targetMonth,
        clampDayInMonth(targetYear, targetMonth, anchorDay),
    );
    return nextDate;
};

const addYearsWithAnchor = (
    date: Date,
    yearsToAdd: number,
    anchorMonth: number,
    anchorDay: number,
): Date => {
    const normalizedMonth = ((anchorMonth % 12) + 12) % 12;
    const targetYear = date.getFullYear() + yearsToAdd;
    const nextDate = new Date(date);
    nextDate.setFullYear(
        targetYear,
        normalizedMonth,
        clampDayInMonth(targetYear, normalizedMonth, anchorDay),
    );
    return nextDate;
};

type StateUpdate<T> = T | ((prev: T) => T);

const resolveStateUpdate = <T,>(update: StateUpdate<T>, prev: T): T =>
    typeof update === 'function'
        ? (update as (prev: T) => T)(prev)
        : update;

// ═══════════════════════════════════════════════════════════════
// ── Context type ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

export interface ExpenseContextType {
    // ── Transactions ──
    transactions: Transaction[];
    addTransaction: (txn: Omit<Transaction, 'id'>) => void;
    updateTransaction: (txn: Transaction) => void;
    deleteTransaction: (id: string) => void;

    // ── Derived totals ──
    totalIncome: number;
    totalExpenses: number;
    balance: number;

    // ── Categories ──
    categories: Category[];
    addCategory: (cat: Omit<Category, 'id'>) => void;
    updateCategory: (cat: Category) => void;
    deleteCategory: (id: string) => void;

    // ── Templates ──
    templates: TransactionTemplate[];
    addTemplate: (tpl: Omit<TransactionTemplate, 'id'>) => void;
    deleteTemplate: (id: string) => void;

    // ── Auto Subscriptions ──
    subscriptions: AutoSubscription[];
    addSubscription: (sub: Omit<AutoSubscription, 'id'>) => void;
    deleteSubscription: (id: string) => void;

    // ── Settings ──
    settings: AppSettings;
    updateSettings: (patch: Partial<AppSettings>) => void;

    // ── Helpers ──
    getCategoryById: (id: string) => Category | undefined;
    getTransactionsByType: (type: TransactionType) => Transaction[];

    // ── Loading state ──
    isLoading: boolean;
}

const noop = () => { };

export const ExpenseContext = createContext<ExpenseContextType>({
    transactions: [],
    addTransaction: noop,
    updateTransaction: noop,
    deleteTransaction: noop,
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    categories: DEFAULT_CATEGORIES,
    addCategory: noop,
    updateCategory: noop,
    deleteCategory: noop,
    templates: [],
    addTemplate: noop,
    deleteTemplate: noop,
    subscriptions: [],
    addSubscription: noop,
    deleteSubscription: noop,
    settings: DEFAULT_SETTINGS,
    updateSettings: noop,
    getCategoryById: () => undefined,
    getTransactionsByType: () => [],
    isLoading: true,
});

// ═══════════════════════════════════════════════════════════════
// ── Provider component ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

export const ExpenseProvider = ({ children }: { children: React.ReactNode }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
    const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
    const [subscriptions, setSubscriptions] = useState<AutoSubscription[]>([]);
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);

    const transactionsRef = useRef<Transaction[]>([]);
    const categoriesRef = useRef<Category[]>(DEFAULT_CATEGORIES);
    const templatesRef = useRef<TransactionTemplate[]>([]);
    const subscriptionsRef = useRef<AutoSubscription[]>([]);
    const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS);
    const persistQueueRef = useRef<Promise<void>>(Promise.resolve());

    const enqueuePersist = useCallback(<T,>(key: string, value: T) => {
        persistQueueRef.current = persistQueueRef.current
            .catch(() => undefined)
            .then(() => setItem(key, value));
    }, []);

    // ── Auto-Process subscriptions ──
    const processSubscriptions = useCallback((txns: Transaction[], subs: AutoSubscription[]) => {
        let newTxns = [...txns];
        let newSubs = [...subs];
        let txnsChanged = false;
        let subsChanged = false;

        const now = new Date();

        newSubs = newSubs.map((sub) => {
            let billingDate = new Date(sub.nextBillingDate);
            if (Number.isNaN(billingDate.getTime())) {
                return sub;
            }

            const monthlyAnchorDay = sub.anchorDay ?? billingDate.getDate();
            const yearlyAnchorDay = sub.anchorDay ?? billingDate.getDate();
            const yearlyAnchorMonth = sub.anchorMonth ?? billingDate.getMonth();

            let currentSubChanged =
                (sub.interval === 'monthly' && sub.anchorDay == null) ||
                (sub.interval === 'yearly' && (sub.anchorDay == null || sub.anchorMonth == null));

            while (billingDate <= now) {
                newTxns.unshift({
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
                    type: sub.type,
                    title: sub.title,
                    amount: sub.amount,
                    categoryId: sub.categoryId,
                    date: billingDate.toISOString(),
                    notes: sub.notes || 'Auto-added subscription',
                });
                txnsChanged = true;
                currentSubChanged = true;

                let nextDate = new Date(billingDate);
                if (sub.interval === 'daily') {
                    nextDate.setDate(nextDate.getDate() + 1);
                } else if (sub.interval === 'weekly') {
                    nextDate.setDate(nextDate.getDate() + 7);
                } else if (sub.interval === 'monthly') {
                    nextDate = addMonthsWithAnchor(billingDate, 1, monthlyAnchorDay);
                } else if (sub.interval === 'yearly') {
                    nextDate = addYearsWithAnchor(billingDate, 1, yearlyAnchorMonth, yearlyAnchorDay);
                }

                billingDate = nextDate;
            }

            if (currentSubChanged) {
                subsChanged = true;
                const updatedSub: AutoSubscription = { ...sub, nextBillingDate: billingDate.toISOString() };
                if (sub.interval === 'monthly') {
                    updatedSub.anchorDay = monthlyAnchorDay;
                } else if (sub.interval === 'yearly') {
                    updatedSub.anchorDay = yearlyAnchorDay;
                    updatedSub.anchorMonth = yearlyAnchorMonth;
                }
                return updatedSub;
            }
            return sub;
        });

        return { newTxns, newSubs, txnsChanged, subsChanged };
    }, []);

    useEffect(() => {
        transactionsRef.current = transactions;
    }, [transactions]);

    useEffect(() => {
        subscriptionsRef.current = subscriptions;
    }, [subscriptions]);

    useEffect(() => {
        categoriesRef.current = categories;
    }, [categories]);

    useEffect(() => {
        templatesRef.current = templates;
    }, [templates]);

    useEffect(() => {
        settingsRef.current = settings;
    }, [settings]);

    // ── Load persisted data on mount ──────────────────────
    useEffect(() => {
        (async () => {
            const [savedTxns, savedCats, savedSettings, savedTemplates, savedSubs] = await Promise.all([
                getItem<Transaction[]>(STORAGE_KEYS.TRANSACTIONS),
                getItem<Category[]>(STORAGE_KEYS.CATEGORIES),
                getItem<AppSettings>(STORAGE_KEYS.SETTINGS),
                getItem<TransactionTemplate[]>(STORAGE_KEYS.TEMPLATES),
                getItem<AutoSubscription[]>(STORAGE_KEYS.SUBSCRIPTIONS),
            ]);

            let currentTxns = savedTxns || [];
            let currentSubs = savedSubs || [];

            if (currentSubs.length > 0) {
                const { newTxns, newSubs, txnsChanged, subsChanged } = processSubscriptions(currentTxns, currentSubs);
                if (txnsChanged) {
                    currentTxns = newTxns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    enqueuePersist(STORAGE_KEYS.TRANSACTIONS, currentTxns);
                }
                if (subsChanged) {
                    currentSubs = newSubs;
                    enqueuePersist(STORAGE_KEYS.SUBSCRIPTIONS, currentSubs);
                }
            }

            setTransactions(currentTxns);
            setSubscriptions(currentSubs);
            transactionsRef.current = currentTxns;
            subscriptionsRef.current = currentSubs;
            if (savedCats) {
                setCategories(savedCats);
                categoriesRef.current = savedCats;
            } else {
                categoriesRef.current = DEFAULT_CATEGORIES;
            }
            if (savedSettings) {
                setSettings(savedSettings);
                settingsRef.current = savedSettings;
                if (savedSettings.dailyReminder) {
                    try {
                        scheduleDailyReminder(savedSettings.dailyReminder, 20, 0);
                    } catch (e) {
                        console.warn('Failed to schedule daily reminder:', e);
                    }
                }
            } else {
                settingsRef.current = DEFAULT_SETTINGS;
            }
            if (savedTemplates) {
                setTemplates(savedTemplates);
                templatesRef.current = savedTemplates;
            } else {
                templatesRef.current = [];
            }
            setIsLoading(false);
        })();
    }, [enqueuePersist, processSubscriptions]);

    // ── Persist helpers ───────────────────────────────────
    const persistTransactions = useCallback((update: StateUpdate<Transaction[]>) => {
        const next = resolveStateUpdate(update, transactionsRef.current);
        transactionsRef.current = next;
        setTransactions(next);
        enqueuePersist(STORAGE_KEYS.TRANSACTIONS, next);
    }, [enqueuePersist]);

    const persistCategories = useCallback((update: StateUpdate<Category[]>) => {
        const next = resolveStateUpdate(update, categoriesRef.current);
        categoriesRef.current = next;
        setCategories(next);
        enqueuePersist(STORAGE_KEYS.CATEGORIES, next);
    }, [enqueuePersist]);

    const persistTemplates = useCallback((update: StateUpdate<TransactionTemplate[]>) => {
        const next = resolveStateUpdate(update, templatesRef.current);
        templatesRef.current = next;
        setTemplates(next);
        enqueuePersist(STORAGE_KEYS.TEMPLATES, next);
    }, [enqueuePersist]);

    const persistSubscriptions = useCallback((update: StateUpdate<AutoSubscription[]>) => {
        const next = resolveStateUpdate(update, subscriptionsRef.current);
        subscriptionsRef.current = next;
        setSubscriptions(next);
        enqueuePersist(STORAGE_KEYS.SUBSCRIPTIONS, next);
    }, [enqueuePersist]);

    const persistSettings = useCallback((update: StateUpdate<AppSettings>) => {
        const next = resolveStateUpdate(update, settingsRef.current);
        settingsRef.current = next;
        setSettings(next);
        enqueuePersist(STORAGE_KEYS.SETTINGS, next);
    }, [enqueuePersist]);

    // ── Transaction CRUD ──────────────────────────────────
    const addTransaction = useCallback(
        (txn: Omit<Transaction, 'id'>) => {
            const newTxn: Transaction = { ...txn, id: Date.now().toString() };
            persistTransactions((prev) => [newTxn, ...prev]);
        },
        [persistTransactions],
    );

    const updateTransaction = useCallback(
        (txn: Transaction) => {
            persistTransactions(
                (prev) => prev.map((t) => (t.id === txn.id ? txn : t)),
            );
        },
        [persistTransactions],
    );

    const deleteTransaction = useCallback(
        (id: string) => {
            persistTransactions((prev) => prev.filter((t) => t.id !== id));
        },
        [persistTransactions],
    );

    // ── Category CRUD ─────────────────────────────────────
    const addCategory = useCallback(
        (cat: Omit<Category, 'id'>) => {
            const newCat: Category = { ...cat, id: `cat_${Date.now()}` };
            persistCategories((prev) => [...prev, newCat]);
        },
        [persistCategories],
    );

    const updateCategory = useCallback(
        (cat: Category) => {
            persistCategories(
                (prev) => prev.map((c) => (c.id === cat.id ? cat : c)),
            );
        },
        [persistCategories],
    );

    const deleteCategory = useCallback(
        (id: string) => {
            persistCategories((prev) => prev.filter((c) => c.id !== id));
        },
        [persistCategories],
    );

    // ── Templates CRUD ────────────────────────────────────
    const addTemplate = useCallback(
        (tpl: Omit<TransactionTemplate, 'id'>) => {
            const newTpl: TransactionTemplate = { ...tpl, id: `tpl_${Date.now()}` };
            persistTemplates((prev) => [newTpl, ...prev]);
        },
        [persistTemplates],
    );

    const deleteTemplate = useCallback(
        (id: string) => {
            persistTemplates((prev) => prev.filter((t) => t.id !== id));
        },
        [persistTemplates],
    );

    // ── Auto Subscriptions CRUD ─────────────────────────────
    const addSubscription = useCallback(
        (sub: Omit<AutoSubscription, 'id'>) => {
            const newSub: AutoSubscription = { ...sub, id: `sub_${Date.now()}` };
            const currentTxns = transactionsRef.current;
            const currentSubs = subscriptionsRef.current;
            const nextSubs = [newSub, ...currentSubs];

            // Check if we need to process it right away
            const { newTxns, newSubs, txnsChanged, subsChanged } = processSubscriptions(currentTxns, nextSubs);

            if (txnsChanged) {
                persistTransactions(newTxns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            }
            if (subsChanged) {
                persistSubscriptions(newSubs);
            } else {
                persistSubscriptions(nextSubs);
            }
        },
        [persistSubscriptions, persistTransactions, processSubscriptions],
    );

    const deleteSubscription = useCallback(
        (id: string) => {
            persistSubscriptions((prev) => prev.filter((s) => s.id !== id));
        },
        [persistSubscriptions],
    );

    // ── Settings ──────────────────────────────────────────
    const updateSettings = useCallback(
        (patch: Partial<AppSettings>) => {
            persistSettings((prev) => ({ ...prev, ...patch }));
        },
        [persistSettings],
    );

    // ── Derived values ────────────────────────────────────
    const totalIncome = useMemo(
        () =>
            transactions
                .filter((t) => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0),
        [transactions],
    );

    const totalExpenses = useMemo(
        () =>
            transactions
                .filter((t) => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0),
        [transactions],
    );

    const balance = useMemo(
        () => totalIncome - totalExpenses,
        [totalIncome, totalExpenses],
    );

    // ── Helper functions ──────────────────────────────────
    const getCategoryById = useCallback(
        (id: string) => categories.find((c) => c.id === id),
        [categories],
    );

    const getTransactionsByType = useCallback(
        (type: TransactionType) => transactions.filter((t) => t.type === type),
        [transactions],
    );

    // ── Context value ─────────────────────────────────────
    const value = useMemo<ExpenseContextType>(
        () => ({
            transactions,
            addTransaction,
            updateTransaction,
            deleteTransaction,
            totalIncome,
            totalExpenses,
            balance,
            categories,
            addCategory,
            updateCategory,
            deleteCategory,
            templates,
            addTemplate,
            deleteTemplate,
            subscriptions,
            addSubscription,
            deleteSubscription,
            settings,
            updateSettings,
            getCategoryById,
            getTransactionsByType,
            isLoading,
        }),
        [
            transactions, addTransaction, updateTransaction, deleteTransaction,
            totalIncome, totalExpenses, balance,
            categories, addCategory, updateCategory, deleteCategory,
            templates, addTemplate, deleteTemplate,
            subscriptions, addSubscription, deleteSubscription,
            settings, updateSettings,
            getCategoryById, getTransactionsByType, isLoading,
        ],
    );

    return (
        <ExpenseContext.Provider value={value}>
            {children}
        </ExpenseContext.Provider>
    );
};
