// App.js
// Ito ang root ng buong app. Dito nakatakda ang navigation:
//   - Kung hindi naka-login: Login/Register screens
//   - Kung naka-login: Bottom tabs (Home, Orders, Notifications, Me)

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { NotificationProvider, useNotifications } from './src/context/NotificationContext';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import CartScreen from './src/screens/CartScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import OrderHistoryScreen from './src/screens/OrderHistoryScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import AccountScreen from './src/screens/AccountScreen';
import MeScreen from './src/screens/MeScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import AddressesScreen from './src/screens/AddressesScreen';
import AddressFormScreen from './src/screens/AddressFormScreen';
import DevelopersScreen from './src/screens/DevelopersScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import VerifyEmailScreen from './src/screens/VerifyEmailScreen';

const AuthStack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();
const OrdersStack = createNativeStackNavigator();
const MeStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Mga screens na makikita PAGKATAPOS mag-login (Shop tab)
function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ headerShown: true, title: '' }} />
      <HomeStack.Screen name="Cart" component={CartScreen} />
      <HomeStack.Screen name="Checkout" component={CheckoutScreen} />
      <HomeStack.Screen name="Addresses" component={AddressesScreen} options={{ headerShown: true, title: 'My addresses' }} />
      <HomeStack.Screen name="AddressForm" component={AddressFormScreen} options={{ headerShown: true, title: 'Delivery address' }} />
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

// Me tab: the profile header and menu, with the profile, password and developers pages inside it
function MeStackScreen() {
  return (
    <MeStack.Navigator screenOptions={{ headerShown: false }}>
      <MeStack.Screen name="MeMain" component={MeScreen} />
      <MeStack.Screen name="Profile" component={AccountScreen} options={{ headerShown: true, title: 'My profile' }} />
      <MeStack.Screen name="Addresses" component={AddressesScreen} options={{ headerShown: true, title: 'My addresses' }} />
      <MeStack.Screen name="AddressForm" component={AddressFormScreen} options={{ headerShown: true, title: 'Delivery address' }} />
      <MeStack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: true, title: 'Change password' }} />
      <MeStack.Screen name="Developers" component={DevelopersScreen} options={{ headerShown: true, title: 'Developers' }} />
    </MeStack.Navigator>
  );
}

function TabIcon({ emoji, focused }) {
  return <Text style={{ fontSize: 21, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

// EDIT DITO: kung gusto mong palitan ang mga icons/labels ng bottom tabs
function MainTabs() {
  const { unreadCount } = useNotifications();
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#6C5CE7' }}>
      <Tab.Screen
        name="Home"
        component={HomeStackScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersStackScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🧾" focused={focused} /> }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔔" focused={focused} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tab.Screen
        name="Me"
        component={MeStackScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }}
      />
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
  const { token, customer, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  // A new account must confirm the code sent to its email before using the app
  const needsVerification = customer && customer.emailVerified === false;

  return (
    <NavigationContainer>
      {!token ? <AuthStackScreen /> : needsVerification ? <VerifyEmailScreen /> : <MainTabs />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <NotificationProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </NotificationProvider>
      </CartProvider>
    </AuthProvider>
  );
}