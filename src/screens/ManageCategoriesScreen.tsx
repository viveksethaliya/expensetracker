import React, { useContext, useState, useMemo } from 'react';
import { useCategories } from '../hooks/useData';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Trash2, Plus } from 'lucide-react-native';
import { ExpenseContext, Category } from '../context/ExpenseContext';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ManageCategories'>;

export default function ManageCategoriesScreen({ route }: Props) {
    const { addCategory, deleteCategory, settings } = useContext(ExpenseContext);
    const categories = useCategories();
    const isDark = settings.theme === 'dark';

    const [activeTab, setActiveTab] = useState<'expense' | 'income'>(route.params?.defaultTab ?? 'expense');
    const [newCatName, setNewCatName] = useState('');
    const [newCatIcon, setNewCatIcon] = useState('');

    const filteredCategories = useMemo(
        () => categories.filter((c: Category) => c.type === activeTab),
        [categories, activeTab]
    );

    const handleAddCategory = () => {
        if (!newCatName.trim()) {
            Alert.alert('Validation', 'Please enter a category name');
            return;
        }
        if (!newCatIcon.trim()) {
            Alert.alert('Validation', 'Please enter an icon/emoji');
            return;
        }
        addCategory({
            name: newCatName.trim(),
            icon: newCatIcon.trim(),
            type: activeTab,
        });
        setNewCatName('');
        setNewCatIcon('');
    };

    const handleDeleteCategory = (id: string, name: string) => {
        Alert.alert(
            'Delete Category',
            `Are you sure you want to delete "${name}"? Transactions using this category will be reassigned to "General".`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteCategory(id)
                },
            ]
        );
    };

    const renderItem = ({ item }: { item: Category }) => (
        <View style={[styles.card, isDark && styles.cardDark]}>
            <View style={styles.cardLeft}>
                <Text style={styles.cardIcon}>{item.icon}</Text>
                <Text style={[styles.cardName, isDark && styles.textDark]}>{item.name}</Text>
            </View>
            <TouchableOpacity
                onPress={() => handleDeleteCategory(item.id, item.name)}
                style={styles.deleteBtn}
                accessibilityRole="button"
                accessibilityLabel={`Delete category ${item.name}`}
            >
                <Trash2 color={isDark ? "#ef5350" : "#d32f2f"} size={18} />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            {/* ── Tabs ── */}
            <View style={[styles.tabContainer, isDark && styles.tabContainerDark]}>
                <TouchableOpacity
                    style={[
                        styles.tabBtn,
                        activeTab === 'expense' && styles.tabActive,
                    ]}
                    onPress={() => setActiveTab('expense')}
                >
                    <Text
                        style={[
                            styles.tabText,
                            isDark && styles.tabTextDark,
                            activeTab === 'expense' && styles.tabTextActive,
                        ]}
                    >
                        Expenses
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.tabBtn,
                        activeTab === 'income' && styles.tabActive,
                    ]}
                    onPress={() => setActiveTab('income')}
                >
                    <Text
                        style={[
                            styles.tabText,
                            isDark && styles.tabTextDark,
                            activeTab === 'income' && styles.tabTextActive,
                        ]}
                    >
                        Income
                    </Text>
                </TouchableOpacity>
            </View>

            {/* ── List ── */}
            <FlatList
                data={filteredCategories}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                initialNumToRender={10}
                maxToRenderPerBatch={5}
                windowSize={5}
            />

            {/* ── Add Category Floating Footer ── */}
            <View style={[styles.addFooter, isDark && styles.addFooterDark]}>
                <Text style={[styles.addTitle, isDark && styles.textDark]}>Add New {activeTab === 'expense' ? 'Expense' : 'Income'} Category</Text>
                <View style={styles.inputRow}>
                    <TextInput
                        placeholder="Icon"
                        placeholderTextColor={isDark ? '#666' : '#999'}
                        value={newCatIcon}
                        onChangeText={setNewCatIcon}
                        maxLength={4}
                        style={[styles.input, styles.iconInput, isDark && styles.inputDark]}
                    />
                    <TextInput
                        placeholder="Category Name"
                        placeholderTextColor={isDark ? '#666' : '#999'}
                        value={newCatName}
                        onChangeText={setNewCatName}
                        style={[styles.input, styles.nameInput, isDark && styles.inputDark]}
                    />
                    <TouchableOpacity
                        style={[styles.addBtn, isDark && styles.addBtnDark]}
                        onPress={handleAddCategory}
                        accessibilityRole="button"
                        accessibilityLabel="Add category"
                    >
                        <Plus color="#fff" size={20} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfc' },
    containerDark: { backgroundColor: '#121212' },

    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tabContainerDark: { backgroundColor: '#1a1a1a', borderBottomColor: '#2a2a2a' },
    tabBtn: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
    },
    tabActive: {
        borderBottomColor: '#6200ee',
    },
    tabText: { fontSize: 15, fontWeight: '600', color: '#666' },
    tabTextDark: { color: '#bbb' },
    tabTextActive: { color: '#6200ee' },

    list: { padding: 16, paddingBottom: 160 },
    card: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 12,
        marginBottom: 10,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    cardDark: { backgroundColor: '#1e1e1e' },
    cardLeft: { flexDirection: 'row', alignItems: 'center' },
    cardIcon: { fontSize: 24, marginRight: 12 },
    cardName: { fontSize: 16, color: '#333', fontWeight: '500' },
    textDark: { color: '#efefef' },
    deleteBtn: { padding: 8, backgroundColor: '#ffebee', borderRadius: 8 },

    addFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: -2 },
    },
    addFooterDark: { backgroundColor: '#1a1a1a', borderTopColor: '#2a2a2a' },
    addTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12, color: '#333' },
    inputRow: { flexDirection: 'row', alignItems: 'center' },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        marginRight: 10,
    },
    inputDark: {
        backgroundColor: '#222',
        borderColor: '#333',
        color: '#efefef',
    },
    iconInput: { width: 70, textAlign: 'center' },
    nameInput: { flex: 1 },
    addBtn: {
        backgroundColor: '#6200ee',
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addBtnDark: { backgroundColor: '#4527a0' },
});
