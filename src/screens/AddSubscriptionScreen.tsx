import React, { useState, useContext } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { ExpenseContext, Category, TransactionType, SubscriptionInterval } from '../context/ExpenseContext';
import { ChevronRight, Tag } from 'lucide-react-native';
import { validateTitle, validateAmount, validateCategory } from '../utils/validation';

const INTERVALS: { label: string; value: SubscriptionInterval }[] = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Yearly', value: 'yearly' },
];

const WEEK_DAYS = [
    { label: 'Sun', value: 0 }, { label: 'Mon', value: 1 }, { label: 'Tue', value: 2 },
    { label: 'Wed', value: 3 }, { label: 'Thu', value: 4 }, { label: 'Fri', value: 5 }, { label: 'Sat', value: 6 }
];

const MONTHS = [
    { label: 'Jan', value: 0 }, { label: 'Feb', value: 1 }, { label: 'Mar', value: 2 },
    { label: 'Apr', value: 3 }, { label: 'May', value: 4 }, { label: 'Jun', value: 5 },
    { label: 'Jul', value: 6 }, { label: 'Aug', value: 7 }, { label: 'Sep', value: 8 },
    { label: 'Oct', value: 9 }, { label: 'Nov', value: 10 }, { label: 'Dec', value: 11 }
];

const getDaysInMonth = (year: number, month: number): number =>
    new Date(year, month + 1, 0).getDate();

const clampDayInMonth = (year: number, month: number, day: number): number =>
    Math.min(Math.max(day, 1), getDaysInMonth(year, month));

const createNoonDate = (year: number, month: number, day: number): Date =>
    new Date(year, month, clampDayInMonth(year, month, day), 12, 0, 0, 0);

const normalizeDayInput = (input: string): number => {
    const parsed = parseInt(input, 10);
    if (!Number.isFinite(parsed)) return 1;
    return Math.min(Math.max(parsed, 1), 31);
};

export default function AddSubscriptionScreen({
    navigation,
}: {
    navigation: NativeStackNavigationProp<RootStackParamList, 'AddSubscription'>;
}) {
    const { addSubscription, categories, settings } = useContext(ExpenseContext);

    const [type, setType] = useState<TransactionType>('expense');
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [interval, setInterval] = useState<SubscriptionInterval>('monthly');

    const [weekDay, setWeekDay] = useState<number>(new Date().getDay());
    const [monthDay, setMonthDay] = useState<string>(new Date().getDate().toString());
    const [yearMonth, setYearMonth] = useState<number>(new Date().getMonth());

    const filteredCategories = categories.filter((c) => c.type === type);

    const handleAdd = () => {
        const titleCheck = validateTitle(title);
        if (!titleCheck.valid) { Alert.alert('Validation', titleCheck.message); return; }

        const amountCheck = validateAmount(amount);
        if (!amountCheck.valid) { Alert.alert('Validation', amountCheck.message); return; }

        const catCheck = validateCategory(selectedCategoryId);
        if (!catCheck.valid) { Alert.alert('Validation', catCheck.message); return; }

        const now = new Date();
        let startBillingDate = new Date(now);
        startBillingDate.setHours(12, 0, 0, 0);

        let anchorDay: number | undefined;
        let anchorMonth: number | undefined;

        if (interval === 'weekly') {
            let diff = weekDay - now.getDay();
            if (diff < 0) diff += 7;
            startBillingDate.setDate(startBillingDate.getDate() + diff);
        } else if (interval === 'monthly') {
            const targetDay = normalizeDayInput(monthDay);
            anchorDay = targetDay;

            let candidate = createNoonDate(now.getFullYear(), now.getMonth(), targetDay);
            if (candidate.getTime() <= now.getTime()) {
                const nextMonthIndex = now.getMonth() + 1;
                const nextYear = now.getFullYear() + Math.floor(nextMonthIndex / 12);
                const nextMonth = nextMonthIndex % 12;
                candidate = createNoonDate(nextYear, nextMonth, targetDay);
            }
            startBillingDate = candidate;
        } else if (interval === 'yearly') {
            anchorMonth = yearMonth;
            anchorDay = 1;

            let candidate = createNoonDate(now.getFullYear(), yearMonth, anchorDay);
            if (candidate.getTime() <= now.getTime()) {
                candidate = createNoonDate(now.getFullYear() + 1, yearMonth, anchorDay);
            }
            startBillingDate = candidate;
        }

        addSubscription({
            type,
            title: title.trim(),
            amount: parseFloat(amount),
            categoryId: selectedCategoryId,
            interval,
            nextBillingDate: startBillingDate.toISOString(),
            notes: notes.trim(),
            anchorDay,
            anchorMonth,
        });

        navigation.goBack();
    };

    const isDark = settings.theme === 'dark';

    return (
        <ScrollView style={[styles.container, isDark && styles.containerDark]} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* ── Type Toggle ── */}
            <View style={styles.toggleRow}>
                <TouchableOpacity
                    style={[styles.toggleBtn, type === 'expense' ? styles.toggleActiveExp : undefined]}
                    onPress={() => { setType('expense'); setSelectedCategoryId(''); }}
                >
                    <Text style={[styles.toggleText, type === 'expense' && styles.toggleTextActive]}>Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleBtn, type === 'income' ? styles.toggleActiveInc : undefined]}
                    onPress={() => { setType('income'); setSelectedCategoryId(''); }}
                >
                    <Text style={[styles.toggleText, type === 'income' && styles.toggleTextActive]}>Income</Text>
                </TouchableOpacity>
            </View>

            {/* ── Title ── */}
            <Text style={[styles.label, isDark && styles.labelDark]}>Title</Text>
            <TextInput
                placeholder="e.g. Netflix, Rent, Salary..."
                placeholderTextColor={isDark ? '#555' : '#999'}
                value={title}
                onChangeText={setTitle}
                style={[styles.input, isDark && styles.inputDark]}
            />

            {/* ── Amount ── */}
            <Text style={[styles.label, isDark && styles.labelDark]}>Amount</Text>
            <TextInput
                placeholder="0.00"
                placeholderTextColor={isDark ? '#555' : '#999'}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                style={[styles.input, isDark && styles.inputDark]}
            />

            {/* ── Interval ── */}
            <Text style={[styles.label, isDark && styles.labelDark]}>Frequency</Text>
            <View style={styles.intervalGrid}>
                {INTERVALS.map(int => (
                    <TouchableOpacity
                        key={int.value}
                        style={[
                            styles.intervalChip,
                            isDark && styles.intervalChipDark,
                            interval === int.value && (isDark ? styles.intervalChipActiveDark : styles.intervalChipActive)
                        ]}
                        onPress={() => setInterval(int.value)}
                    >
                        <Text style={[
                            styles.intervalText,
                            isDark && styles.intervalTextDark,
                            interval === int.value && styles.intervalTextActive
                        ]}>
                            {int.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ── Start Details ── */}
            {interval === 'weekly' && (
                <>
                    <Text style={[styles.label, isDark && styles.labelDark]}>Starting Day of Week</Text>
                    <View style={styles.intervalGrid}>
                        {WEEK_DAYS.map(day => (
                            <TouchableOpacity
                                key={day.value}
                                style={[
                                    styles.intervalChip,
                                    isDark && styles.intervalChipDark,
                                    weekDay === day.value && (isDark ? styles.intervalChipActiveDark : styles.intervalChipActive)
                                ]}
                                onPress={() => setWeekDay(day.value)}
                            >
                                <Text style={[
                                    styles.intervalText,
                                    isDark && styles.intervalTextDark,
                                    weekDay === day.value && styles.intervalTextActive
                                ]}>{day.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </>
            )}

            {interval === 'monthly' && (
                <>
                    <Text style={[styles.label, isDark && styles.labelDark]}>Starting Day of Month (1-31)</Text>
                    <TextInput
                        placeholder="e.g. 1"
                        placeholderTextColor={isDark ? '#555' : '#999'}
                        keyboardType="numeric"
                        value={monthDay}
                        onChangeText={setMonthDay}
                        style={[styles.input, isDark && styles.inputDark]}
                    />
                </>
            )}

            {interval === 'yearly' && (
                <>
                    <Text style={[styles.label, isDark && styles.labelDark]}>Starting Month</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
                        {MONTHS.map(m => (
                            <TouchableOpacity
                                key={m.value}
                                style={[
                                    styles.intervalChip,
                                    { minWidth: 60, marginRight: 8 },
                                    isDark && styles.intervalChipDark,
                                    yearMonth === m.value && (isDark ? styles.intervalChipActiveDark : styles.intervalChipActive)
                                ]}
                                onPress={() => setYearMonth(m.value)}
                            >
                                <Text style={[
                                    styles.intervalText,
                                    isDark && styles.intervalTextDark,
                                    yearMonth === m.value && styles.intervalTextActive
                                ]}>{m.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </>
            )}

            {/* ── Category picker ── */}
            <Text style={[styles.label, isDark && styles.labelDark]}>Category</Text>
            <TouchableOpacity
                style={[styles.row, isDark && styles.rowDark]}
                onPress={() => navigation.navigate('ManageCategories', { defaultTab: type })}
            >
                <View style={styles.rowLeft}>
                    <Tag color={isDark ? '#efefef' : '#333'} size={20} style={{ marginRight: 12 }} />
                    <Text style={[styles.rowLabel, isDark && styles.textDark]}>Manage Categories</Text>
                </View>
                <ChevronRight color="#888" size={20} />
            </TouchableOpacity>
            <View style={styles.categoryGrid}>
                {filteredCategories.map((cat: Category) => {
                    const isActive = selectedCategoryId === cat.id;
                    return (
                        <TouchableOpacity
                            key={cat.id}
                            onPress={() => setSelectedCategoryId(cat.id)}
                            style={[
                                styles.categoryChip,
                                isDark && styles.categoryChipDark,
                                isActive && (isDark ? styles.categoryChipActiveDark : styles.categoryChipActive),
                            ]}
                        >
                            <Text style={styles.categoryIcon}>{cat.icon}</Text>
                            <Text
                                style={[
                                    styles.categoryName,
                                    isDark && styles.categoryNameDark,
                                    isActive && (isDark ? styles.categoryNameActiveDark : styles.categoryNameActive),
                                ]}
                            >
                                {cat.name}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* ── Notes ── */}
            <Text style={[styles.label, isDark && styles.labelDark]}>Notes (optional)</Text>
            <TextInput
                placeholder="Any extra details..."
                placeholderTextColor={isDark ? '#555' : '#999'}
                value={notes}
                onChangeText={setNotes}
                multiline
                style={[styles.input, isDark && styles.inputDark, { height: 80, textAlignVertical: 'top' }]}
            />

            {/* ── Submit ── */}
            <TouchableOpacity style={[styles.submitBtn, isDark && styles.submitBtnDark]} onPress={handleAdd}>
                <Text style={styles.submitText}>Save Auto-Subscription</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', padding: 20 },
    containerDark: { backgroundColor: '#121212' },

    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 10,
    },
    rowDark: { backgroundColor: '#1e1e1e' },
    rowLeft: { flexDirection: 'row', alignItems: 'center' },
    rowLabel: { fontSize: 16, color: '#333' },
    textDark: { color: '#efefef' },

    // ── Toggle ──
    toggleRow: {
        flexDirection: 'row',
        backgroundColor: '#e0e0e0',
        borderRadius: 10,
        marginBottom: 20,
        padding: 4,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    toggleActiveExp: { backgroundColor: '#ef5350', elevation: 1 },
    toggleActiveInc: { backgroundColor: '#66bb6a', elevation: 1 },
    toggleText: { fontSize: 14, fontWeight: '600', color: '#666' },
    toggleTextActive: { color: '#fff' },

    // ── Fields ──
    label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 6 },
    labelDark: { color: '#bbb' },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        marginBottom: 18,
    },
    inputDark: {
        backgroundColor: '#1e1e1e',
        borderColor: '#333',
        color: '#efefef',
    },

    // ── Interval Chips ──
    intervalGrid: {
        flexDirection: 'row',
        marginBottom: 18,
        gap: 8,
    },
    intervalChip: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    intervalChipDark: { backgroundColor: '#1e1e1e', borderColor: '#333' },
    intervalChipActive: { backgroundColor: '#ede7f6', borderColor: '#6200ee' },
    intervalChipActiveDark: { backgroundColor: '#311b92', borderColor: '#b388ff' },
    intervalText: { fontSize: 13, color: '#555', fontWeight: '500' },
    intervalTextDark: { color: '#ccc' },
    intervalTextActive: { color: '#6200ee', fontWeight: '700' },

    // ── Category chips ──
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 18,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    categoryChipDark: { backgroundColor: '#2a2a2a' },
    categoryChipActive: { borderColor: '#6200ee', backgroundColor: '#ede7f6' },
    categoryChipActiveDark: { borderColor: '#b388ff', backgroundColor: '#311b92' },
    categoryIcon: { fontSize: 18, marginRight: 6 },
    categoryName: { fontSize: 14, color: '#555' },
    categoryNameDark: { color: '#ccc' },
    categoryNameActive: { color: '#6200ee', fontWeight: '600' },
    categoryNameActiveDark: { color: '#b388ff' },

    // ── Submit ──
    submitBtn: {
        backgroundColor: '#6200ee',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        elevation: 3,
    },
    submitBtnDark: { backgroundColor: '#4527a0' },
    submitText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
