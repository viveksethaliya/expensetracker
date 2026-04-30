import React, { useContext, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { ExpenseContext, TransactionTemplate } from '../context/ExpenseContext';
import { useTemplates, useCategories } from '../hooks/useData';
import Category from '../database/models/Category';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Zap } from 'lucide-react-native';
import Toast from '../components/Toast';

export default function AddQuickScreen({
    navigation,
}: {
    navigation: NativeStackNavigationProp<RootStackParamList, 'AddQuick'>;
}) {
    const { addTransaction, settings } = useContext(ExpenseContext);
    const templates = useTemplates();
    const categories = useCategories();
    const isDark = settings.theme === 'dark';
    const insets = useSafeAreaInsets();

    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const getCategoryById = (id: string) => categories.find((c: Category) => c.id === id);

    const handleQuickAdd = async (tpl: TransactionTemplate) => {
        await addTransaction({
            type: tpl.type,
            title: tpl.title,
            amount: tpl.amount,
            categoryId: tpl.categoryId,
            date: new Date().toISOString(),
            notes: tpl.notes,
        });
        setToastMessage(`✓ ${tpl.title} logged`);
        setToastVisible(true);
    };

    const expenseTemplates = templates.filter((t: TransactionTemplate) => t.type === 'expense');
    const incomeTemplates = templates.filter((t: TransactionTemplate) => t.type === 'income');

    const renderTemplate = (tpl: TransactionTemplate) => {
        const cat = getCategoryById(tpl.categoryId);
        const isExpense = tpl.type === 'expense';
        return (
            <TouchableOpacity
                key={tpl.id}
                style={[styles.card, isDark && styles.cardDark]}
                onPress={() => handleQuickAdd(tpl)}
            >
                <View style={styles.cardLeft}>
                    <Text style={styles.cardIcon}>{cat?.icon ?? '📌'}</Text>
                    <View>
                        <Text style={[styles.cardTitle, isDark && styles.textDark]}>{tpl.title}</Text>
                        <Text style={styles.cardSub}>{cat?.name ?? 'Uncategorized'}</Text>
                    </View>
                </View>
                <View style={styles.cardRight}>
                    <Text
                        style={[
                            styles.cardAmount,
                            { color: isExpense ? '#ef9a9a' : '#a5d6a7' },
                        ]}
                    >
                        {isExpense ? '-' : '+'}{settings.currency}{tpl.amount.toFixed(2)}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView style={[styles.container, isDark && styles.containerDark]} contentContainerStyle={{ paddingBottom: 40 + Math.max(insets.bottom, 0) }}>
                <View style={styles.headerBanner}>
                    <Zap color={isDark ? '#ffb74d' : '#ff7300'} size={32} style={{ marginBottom: 8 }} />
                    <Text style={[styles.bannerTitle, isDark && styles.textDark]}>Quick Add Shortcuts</Text>
                    <Text style={styles.bannerSub}>Tap any template to immediately log a transaction.</Text>
                </View>

                {templates.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No shortcuts found.</Text>
                        <Text style={styles.emptySubText}>
                            Save transactions as "Recurring" when adding an Expense or Income to see them here.
                        </Text>
                    </View>
                ) : (
                    <>
                        {expenseTemplates.length > 0 && (
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, isDark && styles.textDark]}>Expense Shortcuts</Text>
                                {expenseTemplates.map(renderTemplate)}
                            </View>
                        )}

                        {incomeTemplates.length > 0 && (
                            <View style={styles.section}>
                                <Text style={[styles.sectionTitle, isDark && styles.textDark]}>Income Shortcuts</Text>
                                {incomeTemplates.map(renderTemplate)}
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
            <Toast message={toastMessage} visible={toastVisible} onHide={() => setToastVisible(false)} />
        </View>
    );
}

// ═══════════════════════════════════════════════════════════════
// ── Styles ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    containerDark: { backgroundColor: '#121212' },

    headerBanner: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 20,
    },
    bannerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#222',
        marginBottom: 4,
    },
    bannerSub: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
    },

    section: {
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginBottom: 12,
    },
    textDark: { color: '#efefef' },

    card: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
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
    cardSub: { fontSize: 13, color: '#888', marginTop: 2 },
    cardRight: { alignItems: 'flex-end' },
    cardAmount: { fontSize: 16, fontWeight: 'bold' },

    emptyContainer: {
        paddingHorizontal: 32,
        paddingTop: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        lineHeight: 20,
    },
});
