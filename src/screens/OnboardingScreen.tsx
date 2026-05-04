import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { ExpenseContext } from '../context/ExpenseContext';

const CURRENCIES = ['$', '€', '£', '₹', '¥'];

export default function OnboardingScreen() {
    const { completeOnboarding, updateSettings, settings, addTransaction } = useContext(ExpenseContext);
    const [currency, setCurrency] = useState(settings.currency || '$');
    
    // First transaction state
    const [addFirst, setAddFirst] = useState(false);
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'expense' | 'income'>('expense');

    const handleComplete = async () => {
        await updateSettings({ currency });

        if (addFirst && title.trim() && amount.trim() && !isNaN(parseFloat(amount))) {
            await addTransaction({
                title: title.trim(),
                amount: parseFloat(amount),
                type,
                categoryId: type === 'expense' ? 'cat_other_exp' : 'cat_other_inc', // Fallback default categories
                date: new Date().toISOString(),
                notes: 'First transaction',
            });
        }

        await completeOnboarding();
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.scroll}>
                    <Text style={styles.header}>Welcome to Expense Friend! 👋</Text>
                    <Text style={styles.subtext}>Let's get you set up in just a few seconds.</Text>

                    {/* Currency Selection */}
                    <View style={styles.section}>
                        <Text style={styles.label}>1. Choose your currency</Text>
                        <View style={styles.currencyRow}>
                            {CURRENCIES.map(c => (
                                <TouchableOpacity 
                                    key={c} 
                                    style={[styles.currencyBtn, currency === c && styles.currencyBtnActive]}
                                    onPress={() => setCurrency(c)}
                                >
                                    <Text style={[styles.currencyText, currency === c && styles.currencyTextActive]}>{c}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* First Transaction */}
                    <View style={styles.section}>
                        <Text style={styles.label}>2. Add your first transaction (Optional)</Text>
                        
                        {!addFirst ? (
                            <TouchableOpacity style={styles.addFirstBtn} onPress={() => setAddFirst(true)}>
                                <Text style={styles.addFirstBtnText}>+ Add a transaction now</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.form}>
                                <View style={styles.typeRow}>
                                    <TouchableOpacity 
                                        style={[styles.typeBtn, type === 'expense' && styles.typeBtnExp]}
                                        onPress={() => setType('expense')}
                                    >
                                        <Text style={[styles.typeText, type === 'expense' && styles.typeTextActive]}>Expense</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.typeBtn, type === 'income' && styles.typeBtnInc]}
                                        onPress={() => setType('income')}
                                    >
                                        <Text style={[styles.typeText, type === 'income' && styles.typeTextActive]}>Income</Text>
                                    </TouchableOpacity>
                                </View>

                                <TextInput
                                    style={styles.input}
                                    placeholder="What was it for? (e.g. Coffee)"
                                    value={title}
                                    onChangeText={setTitle}
                                />
                                <View style={styles.amountContainer}>
                                    <Text style={styles.currencyPrefix}>{currency}</Text>
                                    <TextInput
                                        style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                        placeholder="0.00"
                                        keyboardType="numeric"
                                        value={amount}
                                        onChangeText={setAmount}
                                    />
                                </View>
                            </View>
                        )}
                    </View>

                    <View style={styles.spacer} />

                    {/* Complete Button */}
                    <TouchableOpacity style={styles.submitBtn} onPress={handleComplete}>
                        <Text style={styles.submitBtnText}>Get Started →</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfc' },
    scroll: { padding: 24, flexGrow: 1 },
    header: { fontSize: 28, fontWeight: '800', color: '#333', marginBottom: 8, marginTop: 40 },
    subtext: { fontSize: 16, color: '#666', marginBottom: 40 },
    section: { marginBottom: 32 },
    label: { fontSize: 16, fontWeight: '600', color: '#444', marginBottom: 12 },
    
    currencyRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    currencyBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
    currencyBtnActive: { backgroundColor: '#6200ee' },
    currencyText: { fontSize: 20, color: '#333' },
    currencyTextActive: { color: '#fff', fontWeight: 'bold' },

    addFirstBtn: { padding: 16, backgroundColor: '#f0f0f0', borderRadius: 12, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc' },
    addFirstBtnText: { color: '#555', fontWeight: '600' },
    
    form: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
    typeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    typeBtn: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: '#f5f5f5', alignItems: 'center' },
    typeBtnExp: { backgroundColor: '#ef9a9a' },
    typeBtnInc: { backgroundColor: '#a5d6a7' },
    typeText: { fontWeight: '600', color: '#555' },
    typeTextActive: { color: '#fff' },
    
    input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12 },
    amountContainer: { flexDirection: 'row', alignItems: 'center' },
    currencyPrefix: { fontSize: 20, fontWeight: 'bold', color: '#333', marginRight: 10, width: 30, textAlign: 'center' },

    spacer: { flex: 1 },
    submitBtn: { backgroundColor: '#6200ee', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
