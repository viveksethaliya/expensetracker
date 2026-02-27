import React, { useState, useContext, useMemo } from 'react';
import { useCategories, useTemplates } from '../hooks/useData';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    Switch,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { ChevronRight, Tag } from 'lucide-react-native';
import { ExpenseContext, Category, TransactionTemplate } from '../context/ExpenseContext';
import { validateTitle, validateAmount, validateCategory } from '../utils/validation';

export default function AddIncomeScreen({
    navigation,
}: {
    navigation: NativeStackNavigationProp<RootStackParamList, 'AddIncome'>;
}) {
    const { addTransaction, settings, addTemplate } = useContext(ExpenseContext);
    const categories = useCategories();
    const templates = useTemplates();

    const [source, setSource] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [saveAsRecurring, setSaveAsRecurring] = useState(false);

    const incomeCategories = useMemo(() => categories.filter((c: Category) => c.type === 'income'), [categories]);
    const incomeTemplates = useMemo(() => templates.filter((t: TransactionTemplate) => t.type === 'income'), [templates]);

    const handleQuickAdd = (tpl: TransactionTemplate) => {
        addTransaction({
            type: 'income',
            title: tpl.title,
            amount: tpl.amount,
            categoryId: tpl.categoryId,
            date: new Date().toISOString(),
            notes: tpl.notes,
        });
        Alert.alert('Success', `Logged recurring income: ${tpl.title}`);
        navigation.goBack();
    };

    const handleAdd = async () => {
        const sourceCheck = validateTitle(source);
        if (!sourceCheck.valid) { Alert.alert('Validation', sourceCheck.message); return; }

        const amountCheck = validateAmount(amount);
        if (!amountCheck.valid) { Alert.alert('Validation', amountCheck.message); return; }

        const catCheck = validateCategory(selectedCategoryId);
        if (!catCheck.valid) { Alert.alert('Validation', catCheck.message); return; }

        await addTransaction({
            type: 'income',
            title: source.trim(),
            amount: parseFloat(amount),
            categoryId: selectedCategoryId,
            date: new Date().toISOString(),
            notes: description.trim(),
        });

        if (saveAsRecurring) {
            await addTemplate({
                type: 'income',
                title: source.trim(),
                amount: parseFloat(amount),
                categoryId: selectedCategoryId,
                notes: description.trim(),
            });
        }

        navigation.goBack();
    };

    const isDark = settings.theme === 'dark';

    return (
        <ScrollView style={[styles.container, isDark && styles.containerDark]} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* ── Header banner ── */}
            <View style={[styles.banner, isDark && styles.bannerDark]}>
                <Text style={styles.bannerIcon}>💰</Text>
                <Text style={[styles.bannerTitle, isDark && styles.bannerTitleDark]}>Record Income</Text>
                <Text style={[styles.bannerSub, isDark && styles.bannerSubDark]}>Track your earnings & revenue</Text>
            </View>

            {/* ── Quick Add Recurring ── */}
            {incomeTemplates.length > 0 && (
                <View style={styles.recurringSection}>
                    <Text style={[styles.label, isDark && styles.labelDark]}>Quick Add Recurring</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recurringScroll}>
                        {incomeTemplates.map((tpl: TransactionTemplate) => (
                            <TouchableOpacity
                                key={tpl.id}
                                style={[styles.recurringChip, isDark && styles.recurringChipDark]}
                                onPress={() => handleQuickAdd(tpl)}
                            >
                                <Text style={[styles.recurringChipTitle, isDark && styles.textDark]}>{tpl.title}</Text>
                                <Text style={styles.recurringChipAmount}>
                                    {settings.currency}{tpl.amount.toFixed(0)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* ── Source ── */}
            <Text style={[styles.label, isDark && styles.labelDark]}>Income Source</Text>
            <TextInput
                placeholder="e.g. Monthly Salary, Freelance Project"
                placeholderTextColor={isDark ? '#555' : '#999'}
                value={source}
                onChangeText={setSource}
                style={[styles.input, isDark && styles.inputDark]}
            />

            {/* ── Amount ── */}
            <Text style={[styles.label, isDark && styles.labelDark]}>Amount Received</Text>
            <TextInput
                placeholder="0.00"
                placeholderTextColor={isDark ? '#555' : '#999'}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                style={[styles.input, isDark && styles.inputDark]}
            />

            {/* ── Category picker ── */}
            <Text style={[styles.label, isDark && styles.labelDark]}>Income Type</Text>
            <TouchableOpacity
                style={[styles.row, isDark && styles.rowDark]}
                onPress={() => navigation.navigate('ManageCategories', { defaultTab: 'income' })}
            >
                <View style={styles.rowLeft}>
                    <Tag color={isDark ? '#efefef' : '#333'} size={20} style={{ marginRight: 12 }} />
                    <Text style={[styles.rowLabel, isDark && styles.textDark]}>Manage Categories</Text>
                </View>
                <ChevronRight color="#888" size={20} />
            </TouchableOpacity>
            <View style={styles.categoryGrid}>
                {incomeCategories.map((cat: Category) => {
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

            {/* ── Description ── */}
            <Text style={[styles.label, isDark && styles.labelDark]}>Description (optional)</Text>
            <TextInput
                placeholder="e.g. February salary, client payment..."
                placeholderTextColor={isDark ? '#555' : '#999'}
                value={description}
                onChangeText={setDescription}
                multiline
                style={[styles.input, isDark && styles.inputDark, { height: 80, textAlignVertical: 'top' }]}
            />

            {/* ── Save as Recurring ── */}
            <View style={[styles.toggleRow, isDark && styles.toggleRowDark]}>
                <View>
                    <Text style={[styles.toggleLabel, isDark && styles.textDark]}>Save as Recurring</Text>
                    <Text style={[styles.toggleSub, isDark && styles.subTextDark]}>Add to quick-add templates</Text>
                </View>
                <Switch
                    value={saveAsRecurring}
                    onValueChange={setSaveAsRecurring}
                    trackColor={{ false: '#ccc', true: '#2e7d32' }}
                    thumbColor={isDark ? '#fff' : '#f4f3f4'}
                />
            </View>

            {/* ── Submit ── */}
            <TouchableOpacity style={[styles.submitBtn, isDark && styles.submitBtnDark]} onPress={handleAdd}>
                <Text style={styles.submitText}>Add Income</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

// ═══════════════════════════════════════════════════════════════
// ── Styles ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', padding: 20 },
    containerDark: { backgroundColor: '#121212' },
    // custom
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
    // ── Banner ──
    banner: {
        backgroundColor: '#e8f5e9',
        borderRadius: 14,
        padding: 20,
        alignItems: 'center',
        marginBottom: 24,
    },
    bannerDark: { backgroundColor: '#0f2913' }, // Extra dark green
    bannerIcon: { fontSize: 36, marginBottom: 6 },
    bannerTitle: { fontSize: 20, fontWeight: '700', color: '#2e7d32' },
    bannerTitleDark: { color: '#81c784' },
    bannerSub: { fontSize: 13, color: '#66bb6a', marginTop: 4 },
    bannerSubDark: { color: '#a5d6a7' },

    // ── Quick Add Recurring ──
    recurringSection: { marginBottom: 16 },
    recurringScroll: { flexDirection: 'row' },
    recurringChip: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#eee',
        padding: 12,
        borderRadius: 12,
        marginRight: 10,
        minWidth: 100,
        alignItems: 'center',
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 2 },
    },
    recurringChipDark: {
        backgroundColor: '#1e1e1e',
        borderColor: '#333',
    },
    recurringChipTitle: { fontSize: 13, color: '#444', fontWeight: '500', marginBottom: 4 },
    recurringChipAmount: { fontSize: 16, color: '#2e7d32', fontWeight: '700' },

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
        borderColor: '#2e7d32',
        backgroundColor: '#e8f5e9',
    },
    categoryChipActiveDark: {
        borderColor: '#66bb6a',
        backgroundColor: '#194d25',
    },
    categoryIcon: { fontSize: 18, marginRight: 6 },
    categoryName: { fontSize: 14, color: '#555' },
    categoryNameDark: { color: '#ccc' },
    categoryNameActive: { color: '#2e7d32', fontWeight: '600' },
    categoryNameActiveDark: { color: '#81c784' },

    // ── Save as Recurring Toggle ──
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#eee',
    },
    toggleRowDark: { backgroundColor: '#1e1e1e', borderColor: '#333' },
    toggleLabel: { fontSize: 16, fontWeight: '600', color: '#333' },
    toggleSub: { fontSize: 12, color: '#888', marginTop: 2 },
    subTextDark: { color: '#aaa' },

    // ── Submit ──
    submitBtn: {
        backgroundColor: '#2e7d32',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        elevation: 3,
    },
    submitBtnDark: { backgroundColor: '#1b5e20' },
    submitText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
