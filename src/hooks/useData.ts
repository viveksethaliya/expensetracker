import { useEffect, useState, useMemo, useRef } from 'react';
import { database } from '../database';
import Transaction from '../database/models/Transaction';
import Category from '../database/models/Category';
import TransactionTemplate from '../database/models/TransactionTemplate';
import AutoSubscription from '../database/models/AutoSubscription';
import { Q } from '@nozbe/watermelondb';
import { Query, Model } from '@nozbe/watermelondb';

// Helper to use observables in React directly without HOCs and prevent subscription churn
function useObservableQuery<RecordType extends Model>(query: Query<RecordType>, defaultValue: RecordType[]): RecordType[] {
    const [value, setValue] = useState<RecordType[]>(defaultValue);
    const queryRef = useRef(query);

    // Keep the ref updated with the latest query
    useEffect(() => {
        queryRef.current = query;
    }, [query]);

    useEffect(() => {
        const subscription = queryRef.current.observe().subscribe((newValue: RecordType[]) => {
            setValue(newValue);
        });
        return () => subscription.unsubscribe();
    }, [query]);

    return value;
}

export function useTransactions(type?: 'income' | 'expense') {
    const [query] = useState(() => {
        const t = database.collections.get<Transaction>('transactions');
        return type ? t.query(Q.where('type', type), Q.sortBy('date', Q.desc)) : t.query(Q.sortBy('date', Q.desc));
    });
    return useObservableQuery<Transaction>(query, []);
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

    return useObservableQuery<Transaction>(query, []);
}

export function useCategories() {
    const [query] = useState(() => database.collections.get<Category>('categories').query());
    return useObservableQuery<Category>(query, []);
}

export function useTemplates() {
    const [query] = useState(() => database.collections.get<TransactionTemplate>('templates').query());
    return useObservableQuery<TransactionTemplate>(query, []);
}

export function useSubscriptions() {
    const [query] = useState(() => database.collections.get<AutoSubscription>('subscriptions').query());
    return useObservableQuery<AutoSubscription>(query, []);
}

/**
 * Computes income/expense totals reactively.
 * Observes the full transaction list so edits to amounts also trigger recalc.
 */
export function useTotals() {
    const [totals, setTotals] = useState({ totalIncome: 0, totalExpenses: 0, balance: 0 });

    useEffect(() => {
        const subscription = database.collections
            .get<Transaction>('transactions')
            .query()
            .observe()
            .subscribe((txns) => {
                let totalIncome = 0;
                let totalExpenses = 0;
                for (const t of txns) {
                    if (t.type === 'income') totalIncome += t.amount;
                    else if (t.type === 'expense') totalExpenses += t.amount;
                }
                setTotals({ totalIncome, totalExpenses, balance: totalIncome - totalExpenses });
            });

        return () => subscription.unsubscribe();
    }, []);

    return totals;
}

