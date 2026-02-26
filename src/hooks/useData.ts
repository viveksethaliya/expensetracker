import { useEffect, useState } from 'react';
import { database } from '../database';
import Transaction from '../database/models/Transaction';
import Category from '../database/models/Category';
import TransactionTemplate from '../database/models/TransactionTemplate';
import AutoSubscription from '../database/models/AutoSubscription';
import { Q } from '@nozbe/watermelondb';

// Helper to use observables in React directly without HOCs
function useObservable<T>(observable: any, defaultValue: T): T {
    const [value, setValue] = useState<T>(defaultValue);

    useEffect(() => {
        const subscription = observable.subscribe((newValue: T) => {
            setValue(newValue);
        });
        return () => subscription.unsubscribe();
    }, [observable]);

    return value;
}

export function useTransactions(type?: 'income' | 'expense') {
    const [query] = useState(() => {
        const t = database.collections.get<Transaction>('transactions');
        return type ? t.query(Q.where('type', type), Q.sortBy('date', Q.desc)) : t.query(Q.sortBy('date', Q.desc));
    });
    return useObservable<Transaction[]>(query.observe(), []);
}

export function useFilteredTransactions(searchQuery: string, type: 'all' | 'income' | 'expense') {
    const [query, setQuery] = useState(() => database.collections.get<Transaction>('transactions').query(Q.sortBy('date', Q.desc)));

    useEffect(() => {
        const conditions: Q.Clause[] = [];
        if (type !== 'all') {
            conditions.push(Q.where('type', type));
        }
        if (searchQuery.trim() !== '') {
            // Note: simple like query; for category names, you'd need a relation query
            conditions.push(
                Q.or(
                    Q.where('title', Q.like(`%${Q.sanitizeLikeString(searchQuery)}%`)),
                    Q.where('notes', Q.like(`%${Q.sanitizeLikeString(searchQuery)}%`))
                )
            );
        }
        setQuery(database.collections.get<Transaction>('transactions').query(...conditions, Q.sortBy('date', Q.desc)));
    }, [searchQuery, type]);

    return useObservable<Transaction[]>(query.observe(), []);
}

export function useCategories() {
    const [query] = useState(() => database.collections.get<Category>('categories').query());
    return useObservable<Category[]>(query.observe(), []);
}

export function useTemplates() {
    const [query] = useState(() => database.collections.get<TransactionTemplate>('templates').query());
    return useObservable<TransactionTemplate[]>(query.observe(), []);
}

export function useSubscriptions() {
    const [query] = useState(() => database.collections.get<AutoSubscription>('subscriptions').query());
    return useObservable<AutoSubscription[]>(query.observe(), []);
}

// SQL-like sums via reduce on the observed array (WatermelonDB doesn't have a direct sum() aggregate API out of the box in JS without raw raw queries, but observe() handles updates nicely, and the native bridge handles it faster).
// But we can optimize to observeWithColumns. For now it observes the collection.
export function useTotals() {
    const txns = useTransactions();
    let totalIncome = 0;
    let totalExpenses = 0;
    for (const t of txns) {
        if (t.type === 'income') totalIncome += t.amount;
        if (t.type === 'expense') totalExpenses += t.amount;
    }
    return { totalIncome, totalExpenses, balance: totalIncome - totalExpenses };
}
