import React, { useContext, useMemo, useState, useCallback } from 'react';
import { useTransactions, useCategories } from '../hooks/useData';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { ExpenseContext } from '../context/ExpenseContext';
import Transaction from '../database/models/Transaction';
import Category from '../database/models/Category';

// ── Shared utility to generate consistent colours ──
const getCategoricalColor = (index: number) => {
    const colors = ['#6200ee', '#03dac6', '#bb86fc', '#cf6679', '#ffb300', '#00b0ff', '#f50057', '#00e676'];
    return colors[index % colors.length];
};

export default function ReportsScreen() {
    const { settings } = useContext(ExpenseContext);
    const transactions = useTransactions();
    const categories = useCategories();

    const getCategoryById = useCallback((id: string) => categories.find((c: Category) => c.id === id), [categories]);

    // Get screen width safely inside component (not strictly a hook but better practice)
    const screenWidth = Dimensions.get('window').width;

    const [timePeriod, setTimePeriod] = useState<'all' | 'month'>('month');

    const filteredTransactions = useMemo(() => {
        if (timePeriod === 'all') return transactions;

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        return transactions.filter((t: Transaction) => {
            const date = new Date(t.date);
            return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
        });
    }, [transactions, timePeriod]);

    const periodIncome = useMemo(() =>
        filteredTransactions.filter((t: Transaction) => t.type === 'income').reduce((acc: number, t: Transaction) => acc + t.amount, 0),
        [filteredTransactions]
    );
    const periodExpenses = useMemo(() =>
        filteredTransactions.filter((t: Transaction) => t.type === 'expense').reduce((acc: number, t: Transaction) => acc + t.amount, 0),
        [filteredTransactions]
    );
    const periodBalance = periodIncome - periodExpenses;

    // ── Prepare Pie Chart Data ──
    const chartData = useMemo(() => {
        const expenseTxns = filteredTransactions.filter((t: Transaction) => t.type === 'expense');
        const map: Record<string, { total: number; name: string; icon: string }> = {};

        expenseTxns.forEach((t: Transaction) => {
            const key = t.categoryId;
            if (!map[key]) {
                const cat = getCategoryById(key);
                map[key] = {
                    total: 0,
                    name: cat?.name ?? 'Other',
                    icon: cat?.icon ?? '📦',
                };
            }
            map[key].total += t.amount;
        });

        // Convert map to array, sort by total descending
        const sorted = Object.values(map).sort((a, b) => b.total - a.total);

        // Map into pure data array for ChartKit
        return sorted.map((item, index) => ({
            name: item.name,
            total: item.total,
            color: getCategoricalColor(index),
            legendFontColor: '#555',
            legendFontSize: 13,
            icon: item.icon,
        }));
    }, [filteredTransactions, getCategoryById]);

    const isDark = settings.theme === 'dark';

    return (
        <ScrollView style={[styles.container, isDark && styles.containerDark]} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* ── Time Period Toggle ── */}
            <View style={styles.toggleRow}>
                {(['month', 'all'] as const).map((period) => (
                    <TouchableOpacity
                        key={period}
                        onPress={() => setTimePeriod(period)}
                        style={[
                            styles.toggleBtn,
                            isDark && styles.toggleBtnDark,
                            timePeriod === period && (isDark ? styles.toggleBtnActiveDark : styles.toggleBtnActive)
                        ]}
                    >
                        <Text style={[
                            styles.toggleText,
                            isDark && styles.toggleTextDark,
                            timePeriod === period && (isDark ? styles.toggleTextActiveDark : styles.toggleTextActive)
                        ]}>
                            {period === 'month' ? 'This Month' : 'All Time'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ── Summary Overview ── */}
            <View style={styles.cardRow}>
                <View style={[styles.card, isDark ? styles.compDark : { backgroundColor: '#e8f5e9' }]}>
                    <Text style={[styles.cardLabel, isDark && styles.subTextDark]}>Income</Text>
                    <Text style={[styles.cardValue, { color: isDark ? '#a5d6a7' : '#2e7d32' }]}>
                        {settings.currency}{periodIncome.toFixed(0)}
                    </Text>
                </View>
                <View style={[styles.card, isDark ? styles.compDark : { backgroundColor: '#fce4ec' }]}>
                    <Text style={[styles.cardLabel, isDark && styles.subTextDark]}>Expenses</Text>
                    <Text style={[styles.cardValue, { color: isDark ? '#ef9a9a' : '#c62828' }]}>
                        {settings.currency}{periodExpenses.toFixed(0)}
                    </Text>
                </View>
            </View>

            <View style={[
                styles.balanceCard,
                periodBalance >= 0 ? (isDark ? styles.positiveDark : styles.positive) : (isDark ? styles.negativeDark : styles.negative)
            ]}>
                <Text style={[styles.balanceLabel, isDark && styles.subTextDark]}>Net Balance</Text>
                <Text style={[styles.balanceValue, isDark && styles.textDark]}>
                    {settings.currency}{periodBalance.toFixed(2)}
                </Text>
            </View>

            {/* ── Visual Chart Section ── */}
            <Text style={[styles.sectionTitle, isDark && styles.textDark]}>Spending Overview</Text>

            {chartData.length === 0 ? (
                <View style={[styles.emptyContainer, isDark && styles.compDark]}>
                    <Text style={[styles.emptyText, isDark && styles.subTextDark]}>Not enough data to graph.</Text>
                </View>
            ) : (
                <View style={[styles.chartContainer, isDark && styles.compDark]}>
                    <PieChart
                        data={chartData.map(c => ({
                            name: c.name,
                            population: c.total,
                            color: c.color,
                            legendFontColor: isDark ? '#ddd' : '#333',
                            legendFontSize: 13,
                        }))}
                        width={screenWidth - 32} // Match container padding
                        height={220}
                        chartConfig={{
                            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        }}
                        accessor="population"
                        backgroundColor="transparent"
                        paddingLeft="15"
                        absolute
                    />
                </View>
            )}

            {/* ── Detailed Breakdown ── */}
            <Text style={[styles.sectionTitle, isDark && styles.textDark, { marginTop: 24 }]}>Category Breakdown</Text>

            <View style={[styles.breakdownList, isDark && styles.compDark]}>
                {chartData.map((cat, index) => {
                    const pct = periodExpenses > 0 ? (cat.total / periodExpenses) * 100 : 0;
                    return (
                        <View key={index} style={styles.barRow}>
                            <View style={styles.barLabel}>
                                <Text style={styles.barIcon}>{cat.icon}</Text>
                                <Text style={[styles.barName, isDark && styles.textDark]} numberOfLines={1}>{cat.name}</Text>
                            </View>

                            <View style={[styles.barTrack, isDark && styles.barTrackDark]}>
                                <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: cat.color }]} />
                            </View>

                            <View style={styles.barRight}>
                                <Text style={[styles.barAmount, isDark && styles.textDark]}>
                                    {settings.currency}{cat.total.toFixed(0)}
                                </Text>
                                <Text style={[styles.barPct, isDark && styles.subTextDark]}>{pct.toFixed(0)}%</Text>
                            </View>
                        </View>
                    );
                })}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfc', padding: 16 },
    containerDark: { backgroundColor: '#121212' },

    // ── Toggle ──
    toggleRow: {
        flexDirection: 'row',
        backgroundColor: '#e0e0e0',
        borderRadius: 10,
        marginBottom: 16,
        padding: 4,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    toggleBtnDark: { backgroundColor: 'transparent' },
    toggleBtnActive: { backgroundColor: '#fff', elevation: 1 },
    toggleBtnActiveDark: { backgroundColor: '#333' },
    toggleText: { fontSize: 14, fontWeight: '600', color: '#666' },
    toggleTextDark: { color: '#aaa' },
    toggleTextActive: { color: '#6200ee' },
    toggleTextActiveDark: { color: '#bb86fc' },

    // ── Cards ──
    cardRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    card: {
        flex: 1,
        borderRadius: 14,
        padding: 18,
        alignItems: 'center',
        elevation: 1,
    },
    cardLabel: { fontSize: 13, color: '#666', marginBottom: 4, fontWeight: '500' },
    cardValue: { fontSize: 24, fontWeight: '700' },

    balanceCard: {
        borderRadius: 14,
        padding: 22,
        alignItems: 'center',
        marginBottom: 32,
        elevation: 1,
    },
    positive: { backgroundColor: '#e8f5e9' },
    negative: { backgroundColor: '#fce4ec' },
    positiveDark: { backgroundColor: '#1b5e20' },
    negativeDark: { backgroundColor: '#b71c1c' },
    balanceLabel: { fontSize: 14, color: '#666', marginBottom: 4, fontWeight: '500' },
    balanceValue: { fontSize: 32, fontWeight: '800', color: '#111' },

    // ── Headers ──
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#222',
        marginBottom: 16,
        marginLeft: 4,
    },
    textDark: { color: '#efefef' },
    subTextDark: { color: '#bbb' },

    // ── Chart ──
    chartContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
    },
    compDark: { backgroundColor: '#1e1e1e' },
    emptyContainer: {
        backgroundColor: '#fff',
        padding: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: { color: '#888', fontSize: 15 },

    // ── Breakdown List ──
    breakdownList: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        elevation: 1,
    },
    barRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    barLabel: { flexDirection: 'row', alignItems: 'center', width: 90 },
    barIcon: { fontSize: 18, marginRight: 8 },
    barName: { fontSize: 13, color: '#444', fontWeight: '500', flex: 1 },

    barTrack: {
        flex: 1,
        height: 8,
        backgroundColor: '#f0f0f0',
        borderRadius: 4,
        marginHorizontal: 16,
        overflow: 'hidden',
    },
    barTrackDark: { backgroundColor: '#333' },
    barFill: {
        height: '100%',
        borderRadius: 4,
    },

    barRight: {
        width: 60,
        alignItems: 'flex-end',
    },
    barAmount: { fontSize: 13, color: '#222', fontWeight: '600' },
    barPct: { fontSize: 11, color: '#888', marginTop: 2 },
});
