import React, { useContext } from 'react';
import { useSubscriptions } from '../hooks/useData';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CreditCard, Plus, Trash2 } from 'lucide-react-native';
import { ExpenseContext } from '../context/ExpenseContext';
import AutoSubscription from '../database/models/AutoSubscription';
import { RootStackParamList, MainTabParamList } from '../navigation/types';

type SubscriptionScreenNavigationProp = CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'Subscriptions'>,
    NativeStackNavigationProp<RootStackParamList>
>;

export default function SubscriptionsScreen({ navigation }: { navigation: SubscriptionScreenNavigationProp }) {
    const { settings, deleteSubscription } = useContext(ExpenseContext);
    const subscriptions = useSubscriptions();
    const isDark = settings.theme === 'dark';

    const handleDelete = (id: string, title: string) => {
        Alert.alert('Delete Subscription', `Are you sure you want to stop tracking "${title}"?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteSubscription(id) }
        ]);
    };

    return (
        <ScrollView style={[styles.container, isDark && styles.containerDark]} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* ── Header ── */}
            <View style={[styles.banner, isDark && styles.bannerDark]}>
                <CreditCard color={isDark ? '#bb86fc' : '#6200ee'} size={32} style={{ marginBottom: 8 }} />
                <Text style={[styles.bannerTitle, isDark && styles.textDark]}>Subscriptions & Recurring</Text>
                <Text style={styles.bannerSub}>Manage your regular payments</Text>
            </View>

            {/* ── Empty State ── */}
            {subscriptions.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, isDark && styles.textDark]}>No subscriptions tracking yet.</Text>
                    <Text style={styles.emptySub}>Set up auto-adding incomes or expenses.</Text>
                </View>
            ) : (
                <>
                    <Text style={[styles.sectionTitle, isDark && styles.textDark]}>Active Subscriptions</Text>
                    <View style={styles.list}>
                        {subscriptions.map((sub: AutoSubscription) => (
                            <View key={sub.id} style={[styles.card, isDark && styles.cardDark]}>
                                <View style={styles.cardHeader}>
                                    <View>
                                        <Text style={[styles.cardTitle, isDark && styles.textDark]}>{sub.title}</Text>
                                        <Text style={styles.cardType}>
                                            {sub.type === 'expense' ? '💸 Expense' : '💰 Income'} • {sub.interval.charAt(0).toUpperCase() + sub.interval.slice(1)}
                                        </Text>
                                    </View>
                                    <View style={styles.cardRight}>
                                        <Text style={[styles.cardAmount, { color: sub.type === 'income' ? (isDark ? '#81c784' : '#2e7d32') : (isDark ? '#e57373' : '#c62828') }]}>
                                            {sub.type === 'income' ? '+' : '-'}{settings.currency}{sub.amount.toFixed(0)}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.cardFooter}>
                                    <Text style={styles.cardNotes}>Next: {new Date(sub.nextBillingDate).toLocaleDateString()}</Text>
                                    <TouchableOpacity
                                        onPress={() => handleDelete(sub.id, sub.title)}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Delete subscription ${sub.title}`}
                                    >
                                        <Trash2 color="#ef5350" size={18} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                </>
            )}

            {/* ── Add New ── */}
            <TouchableOpacity
                style={[styles.addButton, isDark && styles.addButtonDark]}
                onPress={() => navigation.navigate('AddSubscription')} // Reverted to onPress for TouchableOpacity, assuming a typo in the instruction for `renderItem`
            >
                <Plus color="#fff" size={24} style={{ marginRight: 8 }} />
                <Text style={styles.addButtonText}>Add New Auto-Subscription</Text>
            </TouchableOpacity>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfc', padding: 16 },
    containerDark: { backgroundColor: '#121212' },

    banner: {
        backgroundColor: '#f3e5f5',
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 20,
    },
    bannerDark: { backgroundColor: '#2d1b36' },
    bannerTitle: { fontSize: 20, fontWeight: '700', color: '#4a148c', textAlign: 'center' },
    bannerSub: { fontSize: 13, color: '#7b1fa2', marginTop: 4 },
    textDark: { color: '#efefef' },

    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginBottom: 12,
        marginLeft: 4,
    },

    list: { marginBottom: 20 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#eef',
        elevation: 2,
    },
    cardDark: { backgroundColor: '#1e1e1e', borderColor: '#333' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 2 },
    cardType: { fontSize: 12, color: '#888', fontWeight: '500' },
    cardRight: { alignItems: 'flex-end' },
    cardAmount: { fontSize: 18, fontWeight: '800' },

    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    cardNotes: { fontSize: 13, color: '#888', fontStyle: 'italic', flex: 1 },

    emptyState: { alignItems: 'center', marginTop: 40, padding: 20 },
    emptyText: { fontSize: 16, fontWeight: '600', color: '#555', marginBottom: 8 },
    emptySub: { fontSize: 14, color: '#888', textAlign: 'center' },

    addButton: {
        flexDirection: 'row',
        backgroundColor: '#6200ee',
        padding: 16,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    addButtonDark: { backgroundColor: '#bb86fc' },
    addButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
