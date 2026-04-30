import { Transaction } from '../context/ExpenseContext';

// ── Route Parameter Types ──────────────────────────────────────────
export type RootStackParamList = {
    MainTabs: undefined;
    AddExpense: undefined;
    AddIncome: undefined;
    AddQuick: undefined;
    AddSubscription: undefined;
    EditTransaction: { transaction: Transaction };
    ManageCategories: { defaultTab?: 'expense' | 'income' } | undefined;
};

export type MainTabParamList = {
    Home: undefined;
    Subscriptions: undefined;
    Reports: undefined;
    Settings: undefined;
};
