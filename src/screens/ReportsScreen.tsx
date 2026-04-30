import React, { useContext, useMemo, useState, useCallback } from 'react';
import { useTransactions, useCategories } from '../hooks/useData';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, TextInput } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { ExpenseContext, Transaction } from '../context/ExpenseContext';
import TransactionModel from '../database/models/Transaction';
import Category from '../database/models/Category';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { Search } from 'lucide-react-native';

type ReportsNavigationProp = CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'Reports'>,
    NativeStackNavigationProp<RootStackParamList>
>;

const getCategoricalColor = (index: number) => {
    const colors = ['#6200ee', '#03dac6', '#bb86fc', '#cf6679', '#ffb300', '#00b0ff', '#f50057', '#00e676'];
    return colors[index % colors.length];
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ReportsScreen({ navigation }: { navigation: ReportsNavigationProp }) {
    const { settings } = useContext(ExpenseContext);
    const transactions = useTransactions();
    const categories = useCategories();
    const getCategoryById = useCallback((id: string) => categories.find((c: Category) => c.id === id), [categories]);
    const screenWidth = Dimensions.get('window').width;
    const isDark = settings.theme === 'dark';

    // Period state
    const [timePeriod, setTimePeriod] = useState<'month' | 'year' | 'all'>('month');
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());

    // Transaction list state
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

    // Compute available years from transactions
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        transactions.forEach((t: TransactionModel) => years.add(new Date(t.date).getFullYear()));
        if (years.size === 0) years.add(now.getFullYear());
        return Array.from(years).sort((a, b) => b - a);
    }, [transactions]);

    // Filter transactions by period
    const filteredTransactions = useMemo(() => {
        if (timePeriod === 'all') return transactions;
        return transactions.filter((t: TransactionModel) => {
            const d = new Date(t.date);
            if (timePeriod === 'year') return d.getFullYear() === selectedYear;
            return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
        });
    }, [transactions, timePeriod, selectedMonth, selectedYear]);

    // Totals
    const periodIncome = useMemo(() => filteredTransactions.filter((t: TransactionModel) => t.type === 'income').reduce((a: number, t: TransactionModel) => a + t.amount, 0), [filteredTransactions]);
    const periodExpenses = useMemo(() => filteredTransactions.filter((t: TransactionModel) => t.type === 'expense').reduce((a: number, t: TransactionModel) => a + t.amount, 0), [filteredTransactions]);
    const periodBalance = periodIncome - periodExpenses;

    // Expense chart data
    const expenseChartData = useMemo(() => {
        const expTxns = filteredTransactions.filter((t: TransactionModel) => t.type === 'expense');
        const map: Record<string, { total: number; name: string; icon: string }> = {};
        expTxns.forEach((t: TransactionModel) => {
            if (!map[t.categoryId]) {
                const cat = getCategoryById(t.categoryId);
                map[t.categoryId] = { total: 0, name: cat?.name ?? 'Other', icon: cat?.icon ?? '📦' };
            }
            map[t.categoryId].total += t.amount;
        });
        return Object.values(map).sort((a, b) => b.total - a.total).map((item, i) => ({
            ...item, color: getCategoricalColor(i), legendFontColor: isDark ? '#ccc' : '#555', legendFontSize: 13,
        }));
    }, [filteredTransactions, getCategoryById, isDark]);

    // Income chart data
    const incomeChartData = useMemo(() => {
        const incTxns = filteredTransactions.filter((t: TransactionModel) => t.type === 'income');
        const map: Record<string, { total: number; name: string; icon: string }> = {};
        incTxns.forEach((t: TransactionModel) => {
            if (!map[t.categoryId]) {
                const cat = getCategoryById(t.categoryId);
                map[t.categoryId] = { total: 0, name: cat?.name ?? 'Other', icon: cat?.icon ?? '💰' };
            }
            map[t.categoryId].total += t.amount;
        });
        return Object.values(map).sort((a, b) => b.total - a.total).map((item, i) => ({
            ...item, color: getCategoricalColor(i + 3), legendFontColor: isDark ? '#ccc' : '#555', legendFontSize: 13,
        }));
    }, [filteredTransactions, getCategoryById, isDark]);

    // Searchable transaction list
    const listTransactions = useMemo(() => {
        let list = filteredTransactions;
        if (typeFilter !== 'all') list = list.filter((t: TransactionModel) => t.type === typeFilter);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter((t: TransactionModel) => t.title.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q));
        }
        return list;
    }, [filteredTransactions, typeFilter, searchQuery]);

    const renderBreakdown = (data: typeof expenseChartData, totalAmount: number) => (
        <View style={[styles.breakdownList, isDark && styles.compDark]}>
            {data.map((cat, i) => {
                const pct = totalAmount > 0 ? (cat.total / totalAmount) * 100 : 0;
                return (
                    <View key={i} style={styles.barRow}>
                        <View style={styles.barLabel}>
                            <Text style={styles.barIcon}>{cat.icon}</Text>
                            <Text style={[styles.barName, isDark && styles.textDark]} numberOfLines={1}>{cat.name}</Text>
                        </View>
                        <View style={[styles.barTrack, isDark && styles.barTrackDark]}>
                            <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: cat.color }]} />
                        </View>
                        <View style={styles.barRight}>
                            <Text style={[styles.barAmount, isDark && styles.textDark]}>{settings.currency}{cat.total.toFixed(0)}</Text>
                            <Text style={[styles.barPct, isDark && styles.subTextDark]}>{pct.toFixed(0)}%</Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );

    const renderPieChart = (data: typeof expenseChartData) => (
        <View style={[styles.chartContainer, isDark && styles.compDark]}>
            <PieChart
                data={data.map(c => ({ name: c.name, population: c.total, color: c.color, legendFontColor: isDark ? '#ddd' : '#333', legendFontSize: 13 }))}
                width={screenWidth - 32} height={200}
                chartConfig={{ color: (o = 1) => `rgba(0,0,0,${o})` }}
                accessor="population" backgroundColor="transparent" paddingLeft="15" absolute
            />
        </View>
    );

    return (
        <ScrollView style={[styles.container, isDark && styles.containerDark]} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* ── Period Toggle ── */}
            <View style={styles.toggleRow}>
                {(['month', 'year', 'all'] as const).map((p) => (
                    <TouchableOpacity key={p} onPress={() => setTimePeriod(p)}
                        style={[styles.toggleBtn, isDark && styles.toggleBtnDark, timePeriod === p && (isDark ? styles.toggleBtnActiveDark : styles.toggleBtnActive)]}>
                        <Text style={[styles.toggleText, isDark && styles.toggleTextDark, timePeriod === p && (isDark ? styles.toggleTextActiveDark : styles.toggleTextActive)]}>
                            {p === 'month' ? 'Month' : p === 'year' ? 'Year' : 'All Time'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ── Date Range Picker ── */}
            {timePeriod !== 'all' && (
                <View style={styles.datePickerRow}>
                    {timePeriod === 'month' && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                            {MONTHS.map((m, i) => (
                                <TouchableOpacity key={m} onPress={() => setSelectedMonth(i)}
                                    style={[styles.dateChip, isDark && styles.dateChipDark, selectedMonth === i && styles.dateChipActive]}>
                                    <Text style={[styles.dateChipText, isDark && styles.dateChipTextDark, selectedMonth === i && styles.dateChipTextActive]}>{m}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {availableYears.map((y) => (
                            <TouchableOpacity key={y} onPress={() => setSelectedYear(y)}
                                style={[styles.dateChip, isDark && styles.dateChipDark, selectedYear === y && styles.dateChipActive]}>
                                <Text style={[styles.dateChipText, isDark && styles.dateChipTextDark, selectedYear === y && styles.dateChipTextActive]}>{y}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* ── Summary Cards ── */}
            <View style={styles.cardRow}>
                <View style={[styles.card, isDark ? styles.compDark : { backgroundColor: '#e8f5e9' }]}>
                    <Text style={[styles.cardLabel, isDark && styles.subTextDark]}>Income</Text>
                    <Text style={[styles.cardValue, { color: isDark ? '#a5d6a7' : '#2e7d32' }]}>{settings.currency}{periodIncome.toFixed(0)}</Text>
                </View>
                <View style={[styles.card, isDark ? styles.compDark : { backgroundColor: '#fce4ec' }]}>
                    <Text style={[styles.cardLabel, isDark && styles.subTextDark]}>Expenses</Text>
                    <Text style={[styles.cardValue, { color: isDark ? '#ef9a9a' : '#c62828' }]}>{settings.currency}{periodExpenses.toFixed(0)}</Text>
                </View>
            </View>

            <View style={[styles.balanceCard, periodBalance >= 0 ? (isDark ? styles.positiveDark : styles.positive) : (isDark ? styles.negativeDark : styles.negative)]}>
                <Text style={[styles.balanceLabel, isDark && styles.subTextDark]}>Net Balance</Text>
                <Text style={[styles.balanceValue, isDark && styles.textDark]}>{settings.currency}{periodBalance.toFixed(2)}</Text>
            </View>

            {/* ── Expense Breakdown ── */}
            <Text style={[styles.sectionTitle, isDark && styles.textDark]}>Spending Overview</Text>
            {expenseChartData.length === 0 ? (
                <View style={[styles.emptyContainer, isDark && styles.compDark]}><Text style={[styles.emptyText, isDark && styles.subTextDark]}>No expense data.</Text></View>
            ) : (<>{renderPieChart(expenseChartData)}<View style={{ height: 16 }} />{renderBreakdown(expenseChartData, periodExpenses)}</>)}

            {/* ── Income Breakdown ── */}
            <Text style={[styles.sectionTitle, isDark && styles.textDark, { marginTop: 24 }]}>Income Overview</Text>
            {incomeChartData.length === 0 ? (
                <View style={[styles.emptyContainer, isDark && styles.compDark]}><Text style={[styles.emptyText, isDark && styles.subTextDark]}>No income data.</Text></View>
            ) : (<>{renderPieChart(incomeChartData)}<View style={{ height: 16 }} />{renderBreakdown(incomeChartData, periodIncome)}</>)}

            {/* ── Full Transaction History ── */}
            <Text style={[styles.sectionTitle, isDark && styles.textDark, { marginTop: 24 }]}>Transaction History</Text>

            {/* Search */}
            <View style={[styles.searchBar, isDark && styles.searchBarDark]}>
                <Search color="#888" size={18} style={{ marginRight: 8 }} />
                <TextInput placeholder="Search transactions..." placeholderTextColor={isDark ? '#555' : '#999'}
                    value={searchQuery} onChangeText={setSearchQuery}
                    style={[styles.searchInput, isDark && { color: '#efefef' }]} />
            </View>

            {/* Type filter */}
            <View style={styles.filterRow}>
                {(['all', 'expense', 'income'] as const).map((f) => (
                    <TouchableOpacity key={f} onPress={() => setTypeFilter(f)}
                        style={[styles.filterChip, isDark && styles.filterChipDark, typeFilter === f && styles.filterChipActive]}>
                        <Text style={[styles.filterChipText, typeFilter === f && styles.filterChipTextActive]}>
                            {f === 'all' ? 'All' : f === 'expense' ? 'Expenses' : 'Income'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* List */}
            {listTransactions.length === 0 ? (
                <View style={[styles.emptyContainer, isDark && styles.compDark]}><Text style={[styles.emptyText, isDark && styles.subTextDark]}>No transactions found.</Text></View>
            ) : (
                <View style={{ marginHorizontal: 0 }}>
                    {listTransactions.map((item: TransactionModel) => {
                        const cat = getCategoryById(item.categoryId);
                        const isExp = item.type === 'expense';
                        return (
                            <TouchableOpacity key={item.id} style={[styles.txnCard, isDark && styles.compDark]}
                                onPress={() => navigation.navigate('EditTransaction', {
                                    transaction: { id: item.id, type: item.type as 'income' | 'expense', title: item.title, amount: item.amount, categoryId: item.categoryId, date: item.date, notes: item.notes }
                                })}>
                                <View style={styles.txnLeft}>
                                    <Text style={styles.txnIcon}>{cat?.icon ?? '📌'}</Text>
                                    <View>
                                        <Text style={[styles.txnTitle, isDark && styles.textDark]}>{item.title}</Text>
                                        <Text style={styles.txnSub}>{cat?.name ?? 'Uncategorized'} · {new Date(item.date).toLocaleDateString()}</Text>
                                    </View>
                                </View>
                                <Text style={[styles.txnAmount, { color: isExp ? '#ef9a9a' : '#a5d6a7' }]}>
                                    {isExp ? '-' : '+'}{settings.currency}{item.amount.toFixed(2)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfc', padding: 16 },
    containerDark: { backgroundColor: '#121212' },
    toggleRow: { flexDirection: 'row', backgroundColor: '#e0e0e0', borderRadius: 10, marginBottom: 12, padding: 4 },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    toggleBtnDark: { backgroundColor: 'transparent' },
    toggleBtnActive: { backgroundColor: '#fff', elevation: 1 },
    toggleBtnActiveDark: { backgroundColor: '#333' },
    toggleText: { fontSize: 14, fontWeight: '600', color: '#666' },
    toggleTextDark: { color: '#aaa' },
    toggleTextActive: { color: '#6200ee' },
    toggleTextActiveDark: { color: '#bb86fc' },

    datePickerRow: { marginBottom: 16 },
    dateChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#eee', marginRight: 8, marginBottom: 4 },
    dateChipDark: { backgroundColor: '#2a2a2a' },
    dateChipActive: { backgroundColor: '#6200ee' },
    dateChipText: { fontSize: 13, fontWeight: '600', color: '#555' },
    dateChipTextDark: { color: '#aaa' },
    dateChipTextActive: { color: '#fff' },

    cardRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    card: { flex: 1, borderRadius: 14, padding: 18, alignItems: 'center', elevation: 1 },
    cardLabel: { fontSize: 13, color: '#666', marginBottom: 4, fontWeight: '500' },
    cardValue: { fontSize: 24, fontWeight: '700' },
    balanceCard: { borderRadius: 14, padding: 22, alignItems: 'center', marginBottom: 32, elevation: 1 },
    positive: { backgroundColor: '#e8f5e9' }, negative: { backgroundColor: '#fce4ec' },
    positiveDark: { backgroundColor: '#1b5e20' }, negativeDark: { backgroundColor: '#b71c1c' },
    balanceLabel: { fontSize: 14, color: '#666', marginBottom: 4, fontWeight: '500' },
    balanceValue: { fontSize: 32, fontWeight: '800', color: '#111' },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#222', marginBottom: 16, marginLeft: 4 },
    textDark: { color: '#efefef' }, subTextDark: { color: '#bbb' },
    chartContainer: { backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', elevation: 2 },
    compDark: { backgroundColor: '#1e1e1e' },
    emptyContainer: { backgroundColor: '#fff', padding: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    emptyText: { color: '#888', fontSize: 15 },
    breakdownList: { backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 1 },
    barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    barLabel: { flexDirection: 'row', alignItems: 'center', width: 90 },
    barIcon: { fontSize: 18, marginRight: 8 },
    barName: { fontSize: 13, color: '#444', fontWeight: '500', flex: 1 },
    barTrack: { flex: 1, height: 8, backgroundColor: '#f0f0f0', borderRadius: 4, marginHorizontal: 16, overflow: 'hidden' },
    barTrackDark: { backgroundColor: '#333' },
    barFill: { height: '100%', borderRadius: 4 },
    barRight: { width: 60, alignItems: 'flex-end' },
    barAmount: { fontSize: 13, color: '#222', fontWeight: '600' },
    barPct: { fontSize: 11, color: '#888', marginTop: 2 },

    // Transaction history
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10, elevation: 1 },
    searchBarDark: { backgroundColor: '#1e1e1e' },
    searchInput: { flex: 1, fontSize: 15, color: '#333', padding: 0 },
    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#eee' },
    filterChipDark: { backgroundColor: '#2a2a2a' },
    filterChipActive: { backgroundColor: '#6200ee' },
    filterChipText: { fontSize: 13, fontWeight: '600', color: '#666' },
    filterChipTextActive: { color: '#fff' },
    txnCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 8, elevation: 1 },
    txnLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    txnIcon: { fontSize: 24, marginRight: 10 },
    txnTitle: { fontSize: 15, fontWeight: '600', color: '#222' },
    txnSub: { fontSize: 12, color: '#888', marginTop: 2 },
    txnAmount: { fontSize: 15, fontWeight: 'bold' },
});
