import React, { useContext, useCallback, useMemo, useState } from 'react';
import { useTransactions, useTotals, useCategories } from '../hooks/useData';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Modal,
    TextInput,
    Animated,
} from 'react-native';
import { SwipeListView } from 'react-native-swipe-list-view';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowDownCircle, ArrowUpCircle, Edit2, Copy, Trash2, Zap, Pencil, TrendingUp, AlertTriangle, Award } from 'lucide-react-native';
import { ExpenseContext, Transaction } from '../context/ExpenseContext';
import Category from '../database/models/Category';
import TransactionModel from '../database/models/Transaction';
import { RootStackParamList, MainTabParamList } from '../navigation/types';

type HomeScreenNavigationProp = CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'Home'>,
    NativeStackNavigationProp<RootStackParamList>
>;

export default function HomeScreen({ navigation }: { navigation: HomeScreenNavigationProp }) {
    const { settings, addTransaction, deleteTransaction, updateSettings } = useContext(ExpenseContext);

    const categories = useCategories();
    const allTransactions = useTransactions();
    const { totalIncome, totalExpenses, balance } = useTotals();

    const getCategoryById = useCallback((id: string) => {
        return categories.find((c: Category) => c.id === id);
    }, [categories]);

    const isDark = settings.theme === 'dark';

    const recentTransactions = allTransactions.slice(0, 10);

    const todayString = new Date().toISOString().split('T')[0];
    const spentToday = allTransactions
        .filter(t => t.type === 'expense' && t.date.startsWith(todayString))
        .reduce((sum, t) => sum + t.amount, 0);

    // ── Budget modal state ──
    const [budgetModalVisible, setBudgetModalVisible] = useState(false);
    const [budgetInput, setBudgetInput] = useState('');

    const openBudgetModal = () => {
        setBudgetInput(settings.monthlyBudget > 0 ? settings.monthlyBudget.toString() : '');
        setBudgetModalVisible(true);
    };

    const saveBudget = () => {
        const trimmed = budgetInput.trim();
        if (trimmed === '') {
            updateSettings({ monthlyBudget: 0 });
        } else {
            const val = parseFloat(trimmed);
            if (!isNaN(val) && val >= 0) {
                updateSettings({ monthlyBudget: val });
            }
        }
        setBudgetModalVisible(false);
    };

    const resetBudget = () => {
        updateSettings({ monthlyBudget: 0 });
        setBudgetModalVisible(false);
    };

    // ── Monthly data ──
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyExpenses = useMemo(() => {
        return allTransactions
            .filter((t: TransactionModel) => {
                const d = new Date(t.date);
                return t.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce((sum: number, t: TransactionModel) => sum + t.amount, 0);
    }, [allTransactions, currentMonth, currentYear]);

    const budgetPct = settings.monthlyBudget > 0 ? Math.min((monthlyExpenses / settings.monthlyBudget) * 100, 100) : 0;
    const budgetRemaining = settings.monthlyBudget - monthlyExpenses;
    const isOverBudget = budgetRemaining < 0;

    // ── Insights ──
    const topCategory = useMemo(() => {
        const monthlyExp = allTransactions.filter((t: TransactionModel) => {
            const d = new Date(t.date);
            return t.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        const map: Record<string, { total: number; name: string; icon: string }> = {};
        monthlyExp.forEach((t: TransactionModel) => {
            if (!map[t.categoryId]) {
                const cat = getCategoryById(t.categoryId);
                map[t.categoryId] = { total: 0, name: cat?.name ?? 'Other', icon: cat?.icon ?? '📦' };
            }
            map[t.categoryId].total += t.amount;
        });
        const sorted = Object.values(map).sort((a, b) => b.total - a.total);
        return sorted.length > 0 ? sorted[0] : null;
    }, [allTransactions, currentMonth, currentYear, getCategoryById]);

    const highestTransaction = useMemo(() => {
        const monthlyExp = allTransactions.filter((t: TransactionModel) => {
            const d = new Date(t.date);
            return t.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        if (monthlyExp.length === 0) return null;
        return monthlyExp.reduce((max: TransactionModel, t: TransactionModel) => t.amount > max.amount ? t : max, monthlyExp[0]);
    }, [allTransactions, currentMonth, currentYear]);

    const handleDuplicate = async (item: Transaction) => {
        await addTransaction({
            type: item.type,
            title: item.title,
            amount: item.amount,
            categoryId: item.categoryId,
            date: new Date().toISOString(),
            notes: item.notes,
        });
    };

    const handleDelete = (id: string) => {
        Alert.alert('Delete', 'Are you sure you want to delete this transaction?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteTransaction(id) }
        ]);
    };

    const renderItem = ({ item }: { item: Transaction }) => {
        const category = getCategoryById(item.categoryId);
        const isExpense = item.type === 'expense';

        return (
            <View style={[styles.card, isDark && styles.cardDark]}>
                <View style={styles.cardLeft}>
                    <Text style={styles.cardIcon}>{category?.icon ?? '📌'}</Text>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, isDark && styles.textDark]} numberOfLines={1} ellipsizeMode="tail">{item.title}</Text>
                        <Text style={styles.cardSub} numberOfLines={1} ellipsizeMode="tail">
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
                    <Text style={styles.cardSub}>swipe left to edit</Text>
                </View>
            </View>
        );
    };

    const renderHiddenItem = ({ item }: { item: Transaction }) => {
        return (
            <View style={[styles.hiddenContainer, isDark && styles.hiddenContainerDark]}>
                <TouchableOpacity style={[styles.hiddenBtn, styles.hiddenEdit]} onPress={() => navigation.navigate('EditTransaction', { transaction: item })}>
                    <Edit2 color="#fff" size={18} />
                    <Text style={styles.hiddenBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.hiddenBtn, styles.hiddenDuplicate]} onPress={() => handleDuplicate(item)}>
                    <Copy color="#fff" size={18} />
                    <Text style={styles.hiddenBtnText}>Copy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.hiddenBtn, styles.hiddenDelete]} onPress={() => handleDelete(item.id)}>
                    <Trash2 color="#fff" size={18} />
                    <Text style={styles.hiddenBtnText}>Delete</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const renderListHeader = () => (
        <>
            {/* ── Budget Card ─────────────────────────────────── */}
            <View style={[styles.budgetCard, isDark && styles.budgetCardDark]}>
                <View style={styles.budgetHeader}>
                    <Text style={[styles.budgetTitle, isDark && styles.textDark]}>
                        {monthNames[currentMonth]} Budget
                    </Text>
                    <TouchableOpacity onPress={openBudgetModal} style={styles.budgetEditBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Pencil color={isDark ? '#bb86fc' : '#6200ee'} size={16} />
                    </TouchableOpacity>
                </View>

                {settings.monthlyBudget > 0 ? (
                    <>
                        <View style={styles.budgetRow}>
                            <Text style={[styles.budgetSpent, isDark && styles.subTextDark]}>
                                Spent: {settings.currency}{monthlyExpenses.toFixed(0)}
                            </Text>
                            <Text style={[styles.budgetTotal, isDark && styles.subTextDark]}>
                                of {settings.currency}{settings.monthlyBudget.toFixed(0)}
                            </Text>
                        </View>
                        <View style={[styles.budgetTrack, isDark && styles.budgetTrackDark]}>
                            <View
                                style={[
                                    styles.budgetFill,
                                    {
                                        width: `${budgetPct}%`,
                                        backgroundColor: isOverBudget ? '#e53935' : budgetPct > 80 ? '#ff9800' : '#4caf50',
                                    },
                                ]}
                            />
                        </View>
                        <Text style={[
                            styles.budgetRemaining,
                            { color: isOverBudget ? '#e53935' : isDark ? '#a5d6a7' : '#2e7d32' }
                        ]}>
                            {isOverBudget
                                ? `Over budget by ${settings.currency}${Math.abs(budgetRemaining).toFixed(0)}`
                                : `${settings.currency}${budgetRemaining.toFixed(0)} remaining`
                            }
                        </Text>
                    </>
                ) : (
                    <TouchableOpacity onPress={openBudgetModal}>
                        <Text style={[styles.budgetPlaceholder, isDark && styles.subTextDark]}>
                            Tap to set your monthly budget
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* ── Insights ────────────────────────────────────── */}
            {(topCategory || highestTransaction) && (
                <View style={[styles.insightsCard, isDark && styles.insightsCardDark]}>
                    <Text style={[styles.insightsTitle, isDark && styles.textDark]}>💡 Insights</Text>

                    {topCategory && (
                        <View style={styles.insightRow}>
                            <TrendingUp color={isDark ? '#bb86fc' : '#6200ee'} size={16} style={{ marginRight: 8, marginTop: 2 }} />
                            <Text style={[styles.insightText, isDark && styles.subTextDark]}>
                                You spend more on <Text style={[styles.insightBold, isDark && styles.textDark]}>{topCategory.icon} {topCategory.name}</Text> this month — {settings.currency}{topCategory.total.toFixed(0)} total
                            </Text>
                        </View>
                    )}

                    {highestTransaction && (
                        <View style={styles.insightRow}>
                            <Award color={isDark ? '#ffb74d' : '#e65100'} size={16} style={{ marginRight: 8, marginTop: 2 }} />
                            <Text style={[styles.insightText, isDark && styles.subTextDark]}>
                                Your highest spend this month is <Text style={[styles.insightBold, isDark && styles.textDark]}>{highestTransaction.title}</Text> ({settings.currency}{highestTransaction.amount.toFixed(0)})
                            </Text>
                        </View>
                    )}

                    {isOverBudget && (
                        <View style={styles.insightRow}>
                            <AlertTriangle color="#e53935" size={16} style={{ marginRight: 8, marginTop: 2 }} />
                            <Text style={[styles.insightText, { color: '#e53935' }]}>
                                You've exceeded your budget! Consider cutting back.
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* ── Section title ───────────────────────────────── */}
            <Text style={[styles.sectionTitle, isDark && styles.textDark]}>Recent Transactions</Text>
        </>
    );

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
                        <Text style={styles.spentToday}>Spent today: {settings.currency}{spentToday.toFixed(0)}</Text>
                    </View>
                    <View style={styles.summaryBox}>
                        <Text style={styles.summaryLabel}>Expenses</Text>
                        <Text style={[styles.summaryValue, { color: '#ef9a9a' }]}>
                            -{settings.currency}{totalExpenses.toFixed(0)}
                        </Text>
                    </View>
                </View>
            </View>

            {/* ── Transactions list with header ───────────────── */}
            {recentTransactions.length === 0 ? (
                <View style={{ flex: 1 }}>
                    {renderListHeader()}
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, isDark && styles.emptyTextDark]}>
                            No transactions yet — tap + to add one!
                        </Text>
                    </View>
                </View>
            ) : (
                <SwipeListView
                    data={recentTransactions}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    renderHiddenItem={renderHiddenItem}
                    rightOpenValue={-180}
                    disableRightSwipe
                    closeOnScroll
                    closeOnRowPress
                    closeOnRowBeginSwipe
                    contentContainerStyle={styles.list}
                    initialNumToRender={10}
                    maxToRenderPerBatch={5}
                    windowSize={5}
                    ListHeaderComponent={renderListHeader}
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

            {/* ── Budget Edit Modal ───────────────────────────── */}
            <Modal
                visible={budgetModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setBudgetModalVisible(false)}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setBudgetModalVisible(false)}>
                    <View style={[styles.modalBox, isDark && styles.modalBoxDark]}>
                        <Text style={[styles.modalTitle, isDark && styles.textDark]}>Set Monthly Budget</Text>
                        <Text style={[styles.modalSub, isDark && styles.subTextDark]}>
                            This amount stays until you change it.
                        </Text>
                        <TextInput
                            style={[styles.modalInput, isDark && styles.modalInputDark]}
                            keyboardType="numeric"
                            placeholder="e.g. 20000"
                            placeholderTextColor={isDark ? '#666' : '#aaa'}
                            value={budgetInput}
                            onChangeText={setBudgetInput}
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            {settings.monthlyBudget > 0 && (
                                <TouchableOpacity onPress={resetBudget} style={styles.modalResetBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <Trash2 color="#e53935" size={18} />
                                </TouchableOpacity>
                            )}
                            <View style={{ flex: 1 }} />
                            <TouchableOpacity onPress={() => setBudgetModalVisible(false)} style={styles.modalCancelBtn}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={saveBudget} style={styles.modalSaveBtn}>
                                <Text style={styles.modalSaveText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
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
    spentToday: { color: '#ddd', fontSize: 11, marginTop: 4, fontWeight: '500' },

    // ── Budget Card ──
    budgetCard: {
        backgroundColor: '#fff',
        marginHorizontal: 12,
        marginTop: 14,
        borderRadius: 14,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    budgetCardDark: { backgroundColor: '#1e1e1e' },
    budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    budgetTitle: { fontSize: 15, fontWeight: '700', color: '#333' },
    budgetEditBtn: { padding: 4 },
    budgetRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    budgetSpent: { fontSize: 13, color: '#666' },
    budgetTotal: { fontSize: 13, color: '#666' },
    budgetTrack: { height: 10, backgroundColor: '#f0f0f0', borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
    budgetTrackDark: { backgroundColor: '#333' },
    budgetFill: { height: '100%', borderRadius: 5 },
    budgetRemaining: { fontSize: 13, fontWeight: '600' },
    budgetPlaceholder: { fontSize: 14, color: '#888', textAlign: 'center', paddingVertical: 8 },

    // ── Insights Card ──
    insightsCard: {
        backgroundColor: '#fff',
        marginHorizontal: 12,
        marginTop: 10,
        borderRadius: 14,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    insightsCardDark: { backgroundColor: '#1e1e1e' },
    insightsTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 12 },
    insightRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
    insightText: { flex: 1, fontSize: 13, color: '#555', lineHeight: 19 },
    insightBold: { fontWeight: '700', color: '#333' },

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
    subTextDark: { color: '#bbb' },

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

    // ── Hidden swipe actions ──
    hiddenContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        marginBottom: 10,
        marginRight: 5,
        borderRadius: 10,
        flex: 1,
        overflow: 'hidden'
    },
    hiddenContainerDark: { backgroundColor: '#121212' },
    hiddenBtn: {
        width: 60,
        alignSelf: 'stretch',
        justifyContent: 'center',
        alignItems: 'center',
        height: 61,
    },
    hiddenBtnText: { color: '#fff', fontSize: 9, marginTop: 3, fontWeight: '700', letterSpacing: 0.3 },
    hiddenEdit: { backgroundColor: '#5c6bc0', borderTopLeftRadius: 10, borderBottomLeftRadius: 10 },
    hiddenDuplicate: { backgroundColor: '#26a69a' },
    hiddenDelete: { backgroundColor: '#e53935', borderTopRightRadius: 10, borderBottomRightRadius: 10 },

    // ── Empty state ──
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { fontSize: 16, color: '#888' },
    emptyTextDark: { color: '#666' },

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
        backgroundColor: '#ff7300',
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

    // ── Budget Modal ──
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBox: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 24,
        width: '82%',
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
    },
    modalBoxDark: { backgroundColor: '#2a2a2a' },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#222', marginBottom: 4 },
    modalSub: { fontSize: 13, color: '#888', marginBottom: 18 },
    modalInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 18,
        fontWeight: '600',
        color: '#222',
        marginBottom: 20,
    },
    modalInputDark: { borderColor: '#444', color: '#efefef', backgroundColor: '#1e1e1e' },
    modalActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    modalResetBtn: { padding: 10 },
    modalCancelBtn: { paddingHorizontal: 18, paddingVertical: 10 },
    modalCancelText: { color: '#888', fontSize: 15, fontWeight: '600' },
    modalSaveBtn: { backgroundColor: '#6200ee', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
    modalSaveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
