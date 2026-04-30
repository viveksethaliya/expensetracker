import React, { useContext, useCallback } from 'react';
import { useTransactions, useTotals, useCategories } from '../hooks/useData';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react-native';
import { ExpenseContext, Transaction } from '../context/ExpenseContext';
import Category from '../database/models/Category';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { Zap } from 'lucide-react-native';

type HomeScreenNavigationProp = CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'Home'>,
    NativeStackNavigationProp<RootStackParamList>
>;

export default function HomeScreen({ navigation }: { navigation: HomeScreenNavigationProp }) {
    const { settings } = useContext(ExpenseContext);

    const categories = useCategories();
    const allTransactions = useTransactions();
    const { totalIncome, totalExpenses, balance } = useTotals();

    const getCategoryById = useCallback((id: string) => {
        return categories.find((c: Category) => c.id === id);
    }, [categories]);

    const isDark = settings.theme === 'dark';

    const recentTransactions = allTransactions.slice(0, 10);

    const renderItem = ({ item }: { item: Transaction }) => {
        const category = getCategoryById(item.categoryId);
        const isExpense = item.type === 'expense';

        return (
            <TouchableOpacity
                style={[styles.card, isDark && styles.cardDark]}
                onPress={() => navigation.navigate('EditTransaction', {
                    transaction: {
                        id: item.id,
                        type: item.type as 'income' | 'expense',
                        title: item.title,
                        amount: item.amount,
                        categoryId: item.categoryId,
                        date: item.date,
                        notes: item.notes,
                    }
                })}
            >
                <View style={styles.cardLeft}>
                    <Text style={styles.cardIcon}>{category?.icon ?? '📌'}</Text>
                    <View>
                        <Text style={[styles.cardTitle, isDark && styles.textDark]}>{item.title}</Text>
                        <Text style={styles.cardSub}>
                            {category?.name ?? 'Uncategorized'} · {new Date(item.date).toLocaleDateString()}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardRight}>
                    <Text
                        style={[
                            styles.cardAmount,
                            { color: isExpense ? '#ef9a9a' : '#a5d6a7' },
                        ]}
                    >
                        {isExpense ? '-' : '+'}{settings.currency}{item.amount.toFixed(2)}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            {/* ── Summary header ─────────────────────────────── */}
            <View style={styles.header}>
                <View style={styles.summaryRow}>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryLabel}>Income</Text>
                        <Text style={[styles.summaryValue, { color: '#a5d6a7' }]}>
                            +{settings.currency}{totalIncome.toFixed(0)}
                        </Text>
                    </View>
                    <View style={styles.summaryBox}>
                        <Text style={styles.balanceLabel}>Balance</Text>
                        <Text style={styles.balanceValue}>
                            {settings.currency}{balance.toFixed(0)}
                        </Text>
                    </View>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryLabel}>Expenses</Text>
                        <Text style={[styles.summaryValue, { color: '#ef9a9a' }]}>
                            -{settings.currency}{totalExpenses.toFixed(0)}
                        </Text>
                    </View>
                </View>
            </View>

            {/* ── Recent transactions ────────────────────────── */}
            <Text style={[styles.sectionTitle, isDark && styles.textDark]}>Recent Transactions</Text>

            {recentTransactions.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                        No transactions yet — tap + to add one!
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={recentTransactions}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    initialNumToRender={10}
                    maxToRenderPerBatch={5}
                    windowSize={5}
                />
            )}

            {/* ── Action buttons ──────────────────────────────── */}
            <View style={styles.fabContainer}>
                <TouchableOpacity
                    style={[styles.fab, styles.fabQuick]}
                    onPress={() => navigation.navigate('AddQuick')}
                    accessibilityRole="button"
                    accessibilityLabel="Add Quick Transaction"
                >
                    <Zap color="#fff" size={20} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.fab, styles.fabIncome]}
                    onPress={() => navigation.navigate('AddIncome')}
                    accessibilityRole="button"
                    accessibilityLabel="Add Income"
                >
                    <ArrowDownCircle color="#fff" size={20} style={styles.fabIconSvg} />
                    <Text style={styles.fabLabel}>Income</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.fab, styles.fabExpense]}
                    onPress={() => navigation.navigate('AddExpense')}
                    accessibilityRole="button"
                    accessibilityLabel="Add Expense"
                >
                    <ArrowUpCircle color="#fff" size={20} style={styles.fabIconSvg} />
                    <Text style={styles.fabLabel}>Expense</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ═══════════════════════════════════════════════════════════════
// ── Styles ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    containerDark: { backgroundColor: '#121212' },

    // ── Header / Summary ──
    header: {
        backgroundColor: '#6200ee',
        paddingTop: 12,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    summaryRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    balanceLabel: { color: '#ddd', fontSize: 12, marginBottom: 2, textAlign: 'center' },
    balanceValue: { color: '#fff', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
    summaryBox: { alignItems: 'center' },
    summaryLabel: { color: '#ccc', fontSize: 12 },
    summaryValue: { fontSize: 16, fontWeight: '600', marginTop: 2 },

    // ── Section ──
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginTop: 16,
        marginLeft: 16,
        marginBottom: 8,
    },
    textDark: { color: '#efefef' },

    // ── Transaction card ──
    list: { paddingHorizontal: 12, paddingBottom: 80 },
    card: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 10,
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    cardDark: { backgroundColor: '#1e1e1e' },
    cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    cardIcon: { fontSize: 28, marginRight: 12 },
    cardTitle: { fontSize: 16, fontWeight: '600', color: '#222' },
    cardSub: { fontSize: 12, color: '#888', marginTop: 2 },
    cardRight: { alignItems: 'flex-end' },
    cardAmount: { fontSize: 16, fontWeight: 'bold' },

    // ── Empty state ──
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: 16, color: '#888' },

    // ── Action buttons ──
    fabContainer: {
        position: 'absolute',
        right: 16,
        bottom: 20,
        flexDirection: 'row',
        gap: 10,
    },
    fab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 28,
        elevation: 5,
    },
    fabIncome: { backgroundColor: '#2e7d32' },
    fabExpense: { backgroundColor: '#6200ee' },
    fabQuick: {
        backgroundColor: '#ff7300ff',
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 0,
        paddingVertical: 0,
        borderRadius: 24,
    },
    fabIconSvg: { marginRight: 6 },
    fabLabel: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
