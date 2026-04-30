import React, { useState, useContext, useMemo, useCallback, useLayoutEffect, useRef } from 'react';
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
    KeyboardAvoidingView,
    Platform,
    Keyboard,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { ExpenseContext, Category, TransactionTemplate } from '../context/ExpenseContext';
import {
    validateTitle,
    validateAmount,
    validateCategory,
} from '../utils/validation';
import { ChevronRight, Tag } from 'lucide-react-native';
import Toast from '../components/Toast';

export default function AddExpenseScreen({
    navigation,
}: {
    navigation: NativeStackNavigationProp<RootStackParamList, 'AddExpense'>;
}) {
    const { addTransaction, settings, addTemplate } = useContext(ExpenseContext);
    const categories = useCategories();
    const templates = useTemplates();

    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [saveAsRecurring, setSaveAsRecurring] = useState(false);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const titleRef = useRef<TextInput>(null);

    const expenseCategories = useMemo(() => categories.filter((c: Category) => c.type === 'expense'), [categories]);
    const expenseTemplates = useMemo(() => templates.filter((t: TransactionTemplate) => t.type === 'expense'), [templates]);

    // Check if the form has any user-entered content
    const hasUnsavedContent = title.trim() !== '' || amount.trim() !== '' || notes.trim() !== '' || selectedCategoryId !== '';

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setToastVisible(true);
    };

    const resetForm = () => {
        setTitle('');
        setAmount('');
        setNotes('');
        setSelectedCategoryId('');
        setSaveAsRecurring(false);
        // Re-focus the title field for the next entry
        setTimeout(() => titleRef.current?.focus(), 100);
    };

    const handleQuickAdd = async (tpl: TransactionTemplate) => {
        Keyboard.dismiss();
        await addTransaction({
            type: 'expense',
            title: tpl.title,
            amount: tpl.amount,
            categoryId: tpl.categoryId,
            date: new Date().toISOString(),
            notes: tpl.notes,
        });
        showToast(`✓ ${tpl.title} logged`);
    };

    const handleCategorySelect = (catId: string) => {
        Keyboard.dismiss();
        setSelectedCategoryId(catId);
    };

    const handleAdd = useCallback(async () => {
        const titleCheck = validateTitle(title);
        if (!titleCheck.valid) { showToast(titleCheck.message ?? 'Enter a title'); return; }

        const amountCheck = validateAmount(amount);
        if (!amountCheck.valid) { showToast(amountCheck.message ?? 'Enter an amount'); return; }

        const catCheck = validateCategory(selectedCategoryId);
        if (!catCheck.valid) { showToast(catCheck.message ?? 'Pick a category'); return; }

        await addTransaction({
            type: 'expense',
            title: title.trim(),
            amount: parseFloat(amount),
            categoryId: selectedCategoryId,
            date: new Date().toISOString(),
            notes: notes.trim(),
        });

        if (saveAsRecurring) {
            await addTemplate({
                type: 'expense',
                title: title.trim(),
                amount: parseFloat(amount),
                categoryId: selectedCategoryId,
                notes: notes.trim(),
            });
        }

        showToast('✓ Expense saved');
        resetForm();
    }, [title, amount, selectedCategoryId, notes, saveAsRecurring, addTransaction, addTemplate]);

    const handleBack = useCallback(() => {
        if (hasUnsavedContent) {
            Alert.alert(
                'Discard changes?',
                'You have unsaved content. Are you sure you want to go back?',
                [
                    { text: 'Stay', style: 'cancel' },
                    { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
                ]
            );
        } else {
            navigation.goBack();
        }
    }, [hasUnsavedContent, navigation]);

    const isDark = settings.theme === 'dark';

    useLayoutEffect(() => {
        navigation.setOptions({
            headerLeft: () => (
                <TouchableOpacity onPress={handleBack} style={{ paddingHorizontal: 10 }}>
                    <Text style={{ color: '#ffffff', fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
            ),
            headerRight: () => (
                <TouchableOpacity onPress={handleAdd} style={{ paddingHorizontal: 10 }}>
                    <Text style={{ color: isDark ? '#b388ff' : '#ffffff', fontSize: 16, fontWeight: '700' }}>Save</Text>
                </TouchableOpacity>
            ),
        });
    }, [navigation, handleAdd, handleBack, isDark]);

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
                style={[styles.container, isDark && styles.containerDark]}
                contentContainerStyle={{ paddingBottom: 100 }}
                keyboardShouldPersistTaps="handled"
            >

                {/* ── Quick Add Recurring ── */}
                {expenseTemplates.length > 0 && (
                    <View style={styles.recurringSection}>
                        <Text style={[styles.label, isDark && styles.labelDark]}>Quick Add Recurring</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recurringScroll} keyboardShouldPersistTaps="handled">
                            {expenseTemplates.map((tpl: TransactionTemplate) => (
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

                {/* ── Title ── */}
                <Text style={[styles.label, isDark && styles.labelDark]}>Expense Title</Text>
                <TextInput
                    ref={titleRef}
                    autoFocus={true}
                    placeholder="e.g. Lunch at café, Uber ride"
                    placeholderTextColor={isDark ? '#555' : '#999'}
                    value={title}
                    onChangeText={setTitle}
                    style={[styles.input, isDark && styles.inputDark]}
                />

                {/* ── Amount ── */}
                <Text style={[styles.label, isDark && styles.labelDark]}>Amount Spent</Text>
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
                    {expenseCategories.map((cat: Category) => {
                        const isActive = selectedCategoryId === cat.id;
                        return (
                            <TouchableOpacity
                                key={cat.id}
                                onPress={() => handleCategorySelect(cat.id)}
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
                <TouchableOpacity
                    style={[styles.row, isDark && styles.rowDark]}
                    onPress={() => navigation.navigate('ManageCategories', { defaultTab: 'expense' })}
                >
                    <View style={styles.rowLeft}>
                        <Tag color={isDark ? '#efefef' : '#333'} size={20} style={{ marginRight: 12 }} />
                        <Text style={[styles.rowLabel, isDark && styles.textDark]}>Manage Categories</Text>
                    </View>
                    <ChevronRight color="#888" size={20} />
                </TouchableOpacity>

                {/* ── Save as Recurring ── */}
                <View style={[styles.toggleRow, isDark && styles.toggleRowDark]}>
                    <View>
                        <Text style={[styles.toggleLabel, isDark && styles.textDark]}>Save as Recurring</Text>
                        <Text style={[styles.toggleSub, isDark && styles.subTextDark]}>Add to quick-add templates</Text>
                    </View>
                    <Switch
                        value={saveAsRecurring}
                        onValueChange={setSaveAsRecurring}
                        trackColor={{ false: '#ccc', true: '#6200ee' }}
                        thumbColor={isDark ? '#fff' : '#f4f3f4'}
                    />
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

            </ScrollView>
            <Toast message={toastMessage} visible={toastVisible} onHide={() => setToastVisible(false)} />
        </KeyboardAvoidingView>
    );
}

// ═══════════════════════════════════════════════════════════════
// ── Styles ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

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
    recurringChipAmount: { fontSize: 16, color: '#6200ee', fontWeight: '700' },

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
});
