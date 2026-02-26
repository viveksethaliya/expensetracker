import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert } from 'react-native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Tag, ChevronRight, Trash2, Bell } from 'lucide-react-native';
import { ExpenseContext } from '../context/ExpenseContext';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { configureNotifications, scheduleDailyReminder } from '../utils/notifications';

const CURRENCIES = ['₹', '$', '€', '£', '¥'];

type SettingsScreenNavigationProp = CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'Settings'>,
    NativeStackNavigationProp<RootStackParamList>
>;

export default function SettingsScreen({ navigation }: { navigation: SettingsScreenNavigationProp }) {
    const { settings, updateSettings, templates, deleteTemplate } = useContext(ExpenseContext);

    const isDark = settings.theme === 'dark';

    const handleDeleteTemplate = (id: string, name: string) => {
        Alert.alert(
            'Delete Template',
            `Are you sure you want to delete the recurring template "${name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteTemplate(id) },
            ]
        );
    };

    const toggleDailyReminder = async (val: boolean) => {
        if (val) {
            await configureNotifications();
        }
        await scheduleDailyReminder(val, 20, 0); // 8:00 PM
        updateSettings({ dailyReminder: val });
    };

    return (
        <ScrollView style={[styles.container, isDark && styles.containerDark]}>
            {/* ── Currency ── */}
            <Text style={styles.sectionTitle}>Currency</Text>
            <View style={styles.chipRow}>
                {CURRENCIES.map((c) => (
                    <TouchableOpacity
                        key={c}
                        onPress={() => updateSettings({ currency: c })}
                        style={[
                            styles.chip,
                            isDark && styles.chipDark,
                            settings.currency === c && styles.chipActive,
                        ]}
                    >
                        <Text
                            style={[
                                styles.chipText,
                                isDark && styles.chipTextDark,
                                settings.currency === c && styles.chipTextActive,
                            ]}
                        >
                            {c}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ── Data ── */}
            <Text style={styles.sectionTitle}>Data</Text>
            <TouchableOpacity
                style={[styles.row, isDark && styles.rowDark]}
                onPress={() => navigation.navigate('ManageCategories')}
            >
                <View style={styles.rowLeft}>
                    <Tag color={isDark ? '#efefef' : '#333'} size={20} style={{ marginRight: 12 }} />
                    <Text style={[styles.rowLabel, isDark && styles.textDark]}>Manage Categories</Text>
                </View>
                <ChevronRight color="#888" size={20} />
            </TouchableOpacity>

            {/* ── Theme ── */}
            {templates.length > 0 && (
                <>
                    <Text style={styles.sectionTitle}>Recurring Templates</Text>
                    {templates.map(tpl => (
                        <View key={tpl.id} style={[styles.row, isDark && styles.rowDark]}>
                            <View style={styles.rowLeft}>
                                <Text style={[styles.rowLabel, isDark && styles.textDark, { marginRight: 8 }]}>
                                    {tpl.title}
                                </Text>
                                <Text style={styles.subText}>
                                    {settings.currency}{tpl.amount.toFixed(0)} ({tpl.type})
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => handleDeleteTemplate(tpl.id, tpl.title)}>
                                <Trash2 color="#ef5350" size={20} />
                            </TouchableOpacity>
                        </View>
                    ))}
                </>
            )}

            <Text style={styles.sectionTitle}>Notifications</Text>
            <View style={[styles.row, isDark && styles.rowDark]}>
                <View style={styles.rowLeft}>
                    <Bell color={isDark ? '#efefef' : '#333'} size={20} style={{ marginRight: 12 }} />
                    <View>
                        <Text style={[styles.rowLabel, isDark && styles.textDark]}>Daily Reminder</Text>
                        <Text style={styles.subText}>Get reminded to log expenses at 8:00 PM</Text>
                    </View>
                </View>
                <Switch
                    value={settings.dailyReminder || false}
                    onValueChange={toggleDailyReminder}
                    trackColor={{ false: '#ccc', true: '#6200ee' }}
                    thumbColor={(settings.dailyReminder || false) ? (isDark ? '#fff' : '#f4f3f4') : '#f4f3f4'}
                />
            </View>

            <Text style={styles.sectionTitle}>Appearance</Text>
            <View style={[styles.row, isDark && styles.rowDark]}>
                <Text style={[styles.rowLabel, isDark && styles.textDark]}>Dark Mode</Text>
                <Switch
                    value={isDark}
                    onValueChange={(val) =>
                        updateSettings({ theme: val ? 'dark' : 'light' })
                    }
                    trackColor={{ false: '#ccc', true: '#6200ee' }}
                    thumbColor={isDark ? '#fff' : '#f4f3f4'}
                />
            </View>

            {/* ── About ── */}
            <Text style={styles.sectionTitle}>About</Text>
            <View style={[styles.aboutBox, isDark && styles.rowDark]}>
                <Text style={[styles.aboutText, isDark && styles.textDark]}>Expense Tracker v1.0</Text>
                <Text style={styles.aboutSub}>Track your income & spending simply.</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
    containerDark: { backgroundColor: '#121212' },

    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 20,
        marginBottom: 10,
    },

    // ── Currency chips ──
    chipRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    chip: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    chipDark: { backgroundColor: '#333' },
    chipActive: {
        borderColor: '#6200ee',
        backgroundColor: '#ede7f6',
    },
    chipText: { fontSize: 22, color: '#333' },
    chipTextDark: { color: '#ccc' },
    chipTextActive: { fontWeight: '700', color: '#6200ee' },

    // ── Theme row ──
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
    subText: { fontSize: 13, color: '#888' },

    // ── About ──
    aboutBox: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
    },
    aboutText: { fontSize: 16, fontWeight: '600', color: '#333' },
    aboutSub: { fontSize: 13, color: '#888', marginTop: 4 },
});
