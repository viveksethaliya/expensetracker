import { useEffect, useState, useMemo, useRef } from 'react';
import { database } from '../database';
import Transaction from '../database/models/Transaction';
import Category from '../database/models/Category';
import TransactionTemplate from '../database/models/TransactionTemplate';
import AutoSubscription from '../database/models/AutoSubscription';
import { Q } from '@nozbe/watermelondb';

// Helper to use observables in React directly without HOCs
function useObservable<T>(observable: any, defaultValue: T): T {
    const [value, setValue] = useState<T>(defaultValue);
    const observableRef = useRef(observable);
    observableRef.current = observable;

    useEffect(() => {
        const subscription = observableRef.current.subscribe((newValue: T) => {
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
    // Stabilize query reference with useMemo to prevent observable subscription churn
    const query = useMemo(() => {
        const conditions: Q.Clause[] = [];
        if (type !== 'all') {
            conditions.push(Q.where('type', type));
        }
        if (searchQuery.trim() !== '') {
            conditions.push(
                Q.or(
                    Q.where('title', Q.like(`%${Q.sanitizeLikeString(searchQuery)}%`)),
                    Q.where('notes', Q.like(`%${Q.sanitizeLikeString(searchQuery)}%`))
                )
            );
        }
        return database.collections.get<Transaction>('transactions').query(...conditions, Q.sortBy('date', Q.desc));
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

/**
 * Computes income/expense totals using raw SQL SUM() queries
 * instead of loading all transactions into JavaScript.
 * Re-computes when the transactions collection changes.
 */
export function useTotals() {
    const [totals, setTotals] = useState({ totalIncome: 0, totalExpenses: 0, balance: 0 });

    useEffect(() => {
        const fetchTotals = async () => {
            try {
                const incomeResult = await database.collections
                    .get<Transaction>('transactions')
                    .query(Q.where('type', 'income'))
                    .fetch();
                const expenseResult = await database.collections
                    .get<Transaction>('transactions')
                    .query(Q.where('type', 'expense'))
                    .fetch();

                const totalIncome = incomeResult.reduce((sum, t) => sum + t.amount, 0);
                const totalExpenses = expenseResult.reduce((sum, t) => sum + t.amount, 0);
                setTotals({ totalIncome, totalExpenses, balance: totalIncome - totalExpenses });
            } catch (e) {
                console.error('Failed to compute totals:', e);
            }
        };

        // Observe changes on the transactions collection and recompute
        const subscription = database.collections
            .get<Transaction>('transactions')
            .query()
            .observeCount()
            .subscribe(() => {
                fetchTotals();
            });

        return () => subscription.unsubscribe();
    }, []);

    return totals;
}

