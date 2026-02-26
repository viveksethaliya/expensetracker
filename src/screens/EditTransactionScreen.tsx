import React, { useState, useContext, useMemo } from 'react';
import { useCategories } from '../hooks/useData';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Trash2 } from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { ExpenseContext, Category } from '../context/ExpenseContext';
import {
    validateTitle,
    validateAmount,
    validateCategory,
} from '../utils/validation';

type Props = NativeStackScreenProps<RootStackParamList, 'EditTransaction'>;

export default function EditTransactionScreen({ route, navigation }: Props) {
    const { transaction } = route.params;
    const { updateTransaction, deleteTransaction, settings } = useContext(ExpenseContext);
    const categories = useCategories();

    const [title, setTitle] = useState(transaction.title);
    const [amount, setAmount] = useState(transaction.amount.toString());
    const [notes, setNotes] = useState(transaction.notes);
    const [selectedCategoryId, setSelectedCategoryId] = useState(transaction.categoryId);

    const isExpense = transaction.type === 'expense';
    const filteredCategories = useMemo(() => categories.filter((c: any) => c.type === transaction.type), [categories, transaction.type]);

    const handleUpdate = () => {
        const titleCheck = validateTitle(title);
        if (!titleCheck.valid) { Alert.alert('Validation', titleCheck.message); return; }

        const amountCheck = validateAmount(amount);
        if (!amountCheck.valid) { Alert.alert('Validation', amountCheck.message); return; }

        const catCheck = validateCategory(selectedCategoryId);
        if (!catCheck.valid) { Alert.alert('Validation', catCheck.message); return; }

        updateTransaction({
            ...transaction,
            title: title.trim(),
            amount: parseFloat(amount),
            categoryId: selectedCategoryId,
            notes: notes.trim(),
        });

        navigation.goBack();
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Entry',
            'Are you sure you want to delete this transaction?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        deleteTransaction(transaction.id);
                        navigation.goBack();
                    }
                },
            ]
        );
    };

    const isDark = settings.theme === 'dark';

    return (
        <ScrollView style={[styles.container, isDark && styles.containerDark]} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* ── Header banner ── */}
            <View style={[
                styles.banner,
                isExpense ? (isDark ? styles.bannerExpenseDark : styles.bannerExpense) : (isDark ? styles.bannerIncomeDark : styles.bannerIncome)
            ]}>
                <Text style={styles.bannerIcon}>{isExpense ? '🧾' : '💰'}</Text>
                <Text style={[
                    styles.bannerTitle,
                    isExpense ? (isDark ? styles.bannerTitleExpenseDark : styles.bannerTitleExpense) : (isDark ? styles.bannerTitleIncomeDark : styles.bannerTitleIncome)
                ]}>Edit {isExpense ? 'Expense' : 'Income'}</Text>
                <Text style={[
                    styles.bannerSub,
                    isExpense ? (isDark ? styles.bannerSubExpenseDark : styles.bannerSubExpense) : (isDark ? styles.bannerSubIncomeDark : styles.bannerSubIncome)
                ]}>Update your entry details</Text>
            </View>

            {/* ── Title ── */}
            <Text style={[styles.label, isDark && styles.labelDark]}>Title</Text>
            <TextInput
                placeholder="e.g. Coffee, Salary"
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

            {/* ── Category picker ── */}
            <Text style={[styles.label, isDark && styles.labelDark]}>Category</Text>
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

            {/* ── Actions ── */}
            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={[styles.deleteBtn, isDark && styles.deleteBtnDark]}
                    onPress={handleDelete}
                >
                    <Trash2 color={isDark ? "#ff8a80" : "#d32f2f"} size={22} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.submitBtn, isDark && styles.submitBtnDark]}
                    onPress={handleUpdate}
                >
                    <Text style={styles.submitText}>Save Changes</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', padding: 20 },
    containerDark: { backgroundColor: '#121212' },

    // ── Banners ──
    banner: {
        borderRadius: 14,
        padding: 20,
        alignItems: 'center',
        marginBottom: 24,
    },
    bannerExpense: { backgroundColor: '#fce4ec' },
    bannerExpenseDark: { backgroundColor: '#311019' },
    bannerIncome: { backgroundColor: '#e8f5e9' },
    bannerIncomeDark: { backgroundColor: '#0f2913' },

    bannerIcon: { fontSize: 36, marginBottom: 6 },

    bannerTitle: { fontSize: 20, fontWeight: '700' },
    bannerTitleExpense: { color: '#c62828' },
    bannerTitleExpenseDark: { color: '#ff8a80' },
    bannerTitleIncome: { color: '#2e7d32' },
    bannerTitleIncomeDark: { color: '#81c784' },

    bannerSub: { fontSize: 13, marginTop: 4 },
    bannerSubExpense: { color: '#ef5350' },
    bannerSubExpenseDark: { color: '#e57373' },
    bannerSubIncome: { color: '#66bb6a' },
    bannerSubIncomeDark: { color: '#a5d6a7' },

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
    categoryChipActive: {
        borderColor: '#6200ee',
        backgroundColor: '#ede7f6',
    },
    categoryChipActiveDark: {
        borderColor: '#b388ff',
        backgroundColor: '#311b92',
    },
    categoryIcon: { fontSize: 18, marginRight: 6 },
    categoryName: { fontSize: 14, color: '#555' },
    categoryNameDark: { color: '#ccc' },
    categoryNameActive: { color: '#6200ee', fontWeight: '600' },
    categoryNameActiveDark: { color: '#b388ff' },

    // ── Actions ──
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    deleteBtn: {
        width: 56,
        height: 56,
        backgroundColor: '#ffebee',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteBtnDark: {
        backgroundColor: '#311019',
    },
    submitBtn: {
        flex: 1,
        backgroundColor: '#6200ee',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        elevation: 3,
    },
    submitBtnDark: { backgroundColor: '#4527a0' },
    submitText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
