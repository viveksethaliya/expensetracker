import React from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, PieChart, Settings, Repeat } from 'lucide-react-native';

import { ExpenseProvider, ExpenseContext } from './src/context/ExpenseContext';
import HomeScreen from './src/screens/HomeScreen';
import AddExpenseScreen from './src/screens/AddExpenseScreen';
import AddIncomeScreen from './src/screens/AddIncomeScreen';
import AddQuickScreen from './src/screens/AddQuickScreen';
import AddSubscriptionScreen from './src/screens/AddSubscriptionScreen';
import EditTransactionScreen from './src/screens/EditTransactionScreen';
import ManageCategoriesScreen from './src/screens/ManageCategoriesScreen';
import SubscriptionsScreen from './src/screens/SubscriptionsScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

import { RootStackParamList, MainTabParamList } from './src/navigation/types';

// ═══════════════════════════════════════════════════════════════
// ── Bottom Tab Navigator ──────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabNavigator() {
  const { settings } = React.useContext(ExpenseContext);
  const isDark = settings.theme === 'dark';
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: isDark ? '#1f1f1f' : '#6200ee' },
        headerTintColor: '#fff',
        tabBarActiveTintColor: isDark ? '#bb86fc' : '#6200ee',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: [
          styles.tabBar,
          isDark && { backgroundColor: '#1e1e1e', borderTopColor: '#333' },
          { height: 60 + insets.bottom, paddingBottom: 6 + insets.bottom }
        ],
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Expense Friend',
          tabBarIcon: ({ color, size }) => (
            <Home color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Subscriptions"
        component={SubscriptionsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Repeat color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <PieChart color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── Root Stack (Tabs + Modal Screens) ─────────────────────────
// ═══════════════════════════════════════════════════════════════
const RootStack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator() {
  const { settings, hasLaunched } = React.useContext(ExpenseContext);
  const isDark = settings.theme === 'dark';

  return (
    <NavigationContainer>
      <RootStack.Navigator
        screenOptions={{
          presentation: 'modal',
          headerStyle: { backgroundColor: isDark ? '#1f1f1f' : '#6200ee' },
          headerTintColor: '#fff',
        }}
      >
        {!hasLaunched ? (
          <RootStack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <RootStack.Screen
            name="MainTabs"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
        )}
        <RootStack.Screen
          name="AddExpense"
          component={AddExpenseScreen}
          options={{ title: 'Add Expense' }}
        />
        <RootStack.Screen
          name="AddIncome"
          component={AddIncomeScreen}
          options={{ title: 'Add Income' }}
        />
        <RootStack.Screen
          name="AddQuick"
          component={AddQuickScreen}
          options={{ title: 'Quick Add' }}
        />
        <RootStack.Screen
          name="EditTransaction"
          component={EditTransactionScreen}
          options={{ title: 'Edit Transaction' }}
        />
        <RootStack.Screen
          name="AddSubscription"
          component={AddSubscriptionScreen}
          options={{ title: 'Add Auto-Subscription' }}
        />
        <RootStack.Screen
          name="ManageCategories"
          component={ManageCategoriesScreen}
          options={{ title: 'Manage Categories' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ExpenseProvider>
        <RootNavigator />
        <ProcessingOverlay />
      </ExpenseProvider>
    </SafeAreaProvider>
  );
}

function ProcessingOverlay() {
  const { isProcessing, settings } = React.useContext(ExpenseContext);
  if (!isProcessing) return null;
  const isDark = settings.theme === 'dark';

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]}>
      <View style={[styles.processingBox, isDark && styles.processingBoxDark]}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={[styles.processingText, isDark && styles.processingTextDark]}>Processing...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    paddingTop: 6,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    elevation: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  processingBox: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  processingBoxDark: {
    backgroundColor: '#2c2c2c',
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  processingTextDark: {
    color: '#efefef',
  },
});
