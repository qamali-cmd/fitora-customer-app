// App.js
// Ito ang root ng buong app. Dito nakatakda ang navigation:
//   - Kung hindi naka-login: Login/Register screens
//   - Kung naka-login: Bottom tabs (Home, Orders, Account)

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';

// BAGO: dahil localtunnel ang ginagamit natin, kailangan nating i-bypass
// ang warning page nila sa BAWAT request. Ginagawa natin ito nang isang
// beses lang dito, sa halip na sa bawat fetch() call sa buong app.
const originalFetch = global.fetch;
global.fetch = (url, options = {}) => {
  return originalFetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Bypass-Tunnel-Reminder': 'true', // para sa localtunnel
      'ngrok-skip-browser-warning': 'true', // para sa ngrok
    },
  });
};

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import CartScreen from './src/screens/CartScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import OrderHistoryScreen from './src/screens/OrderHistoryScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import AccountScreen from './src/screens/AccountScreen';
import DevelopersScreen from './src/screens/DevelopersScreen';

const AuthStack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();
const OrdersStack = createNativeStackNavigator();
const AccountStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Mga screens na makikita PAGKATAPOS mag-login (Shop tab)
function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ headerShown: true, title: '' }} />
      <HomeStack.Screen name="Cart" component={CartScreen} />
      <HomeStack.Screen name="Checkout" component={CheckoutScreen} />
      <HomeStack.Screen name="OrderHistory" component={OrderHistoryScreen} />
      <HomeStack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ headerShown: true, title: 'Order details' }} />
    </HomeStack.Navigator>
  );
}

// Orders tab (may sarili ring stack para sa OrderDetail)
function OrdersStackScreen() {
  return (
    <OrdersStack.Navigator screenOptions={{ headerShown: false }}>
      <OrdersStack.Screen name="OrderHistoryMain" component={OrderHistoryScreen} />
      <OrdersStack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ headerShown: true, title: 'Order details' }} />
    </OrdersStack.Navigator>
  );
}

// Account tab (may sarili ring stack para sa Developers' Profiles module)
function AccountStackScreen() {
  return (
    <AccountStack.Navigator screenOptions={{ headerShown: false }}>
      <AccountStack.Screen name="AccountMain" component={AccountScreen} />
      <AccountStack.Screen name="Developers" component={DevelopersScreen} options={{ headerShown: true, title: 'Developers' }} />
    </AccountStack.Navigator>
  );
}

// EDIT DITO: kung gusto mong palitan ang mga icons/labels ng bottom tabs
function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#6C5CE7' }}>
      <Tab.Screen name="Shop" component={HomeStackScreen} options={{ tabBarLabel: 'Shop' }} />
      <Tab.Screen name="Orders" component={OrdersStackScreen} options={{ tabBarLabel: 'Orders' }} />
      <Tab.Screen name="Account" component={AccountStackScreen} options={{ tabBarLabel: 'Account' }} />
    </Tab.Navigator>
  );
}

// Mga screens na makikita BAGO mag-login
function AuthStackScreen() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function RootNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {token ? <MainTabs /> : <AuthStackScreen />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </CartProvider>
    </AuthProvider>
  );
}