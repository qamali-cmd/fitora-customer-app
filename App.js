// App.js
// Ito ang root ng buong app. Dito nakatakda ang navigation:
//   - Kung hindi naka-login: Login/Register screens
//   - Kung naka-login: Bottom tabs (Home, Orders, Notifications, Me)

import './src/webSetup'; // (first on purpose) in a browser, keeps the app the width of a phone
import React from 'react';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text, Platform } from 'react-native';
import { WEB_MAX_WIDTH } from './src/webSetup';
import { StatusBar } from 'expo-status-bar';
import Icon from './src/components/Icon';
import { COLORS, TAB_BAR_STYLE } from './src/theme';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { NotificationProvider, useNotifications } from './src/context/NotificationContext';
import { MessageProvider } from './src/context/MessageContext';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import AccountSettingsScreen from './src/screens/AccountSettingsScreen';
import HelpCentreScreen from './src/screens/HelpCentreScreen';
import LegalScreen from './src/screens/LegalScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import CartScreen from './src/screens/CartScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import OrderHistoryScreen from './src/screens/OrderHistoryScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import RefundRequestScreen from './src/screens/RefundRequestScreen';
import AccountScreen from './src/screens/AccountScreen';
import MeScreen from './src/screens/MeScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import AddressesScreen from './src/screens/AddressesScreen';
import AddressFormScreen from './src/screens/AddressFormScreen';
import WriteReviewScreen from './src/screens/WriteReviewScreen';
import { DialogHost } from './src/utils/dialogs';
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
      <HomeStack.Screen name="Search" component={SearchScreen} />
      <HomeStack.Screen name="Messages" component={MessagesScreen} />
      <HomeStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <HomeStack.Screen name="Cart" component={CartScreen} />
      <HomeStack.Screen name="Checkout" component={CheckoutScreen} />
      <HomeStack.Screen name="Addresses" component={AddressesScreen} options={{ headerShown: true, title: 'My addresses' }} />
      <HomeStack.Screen name="AddressForm" component={AddressFormScreen} options={{ headerShown: true, title: 'Delivery address' }} />
      <HomeStack.Screen name="OrderHistory" component={OrderHistoryScreen} />
      <HomeStack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ headerShown: true, title: 'Order details' }} />
      <HomeStack.Screen name="WriteReview" component={WriteReviewScreen} options={{ headerShown: true, title: 'Rate product' }} />
    </HomeStack.Navigator>
  );
}

// Orders tab (may sarili ring stack para sa OrderDetail)
function OrdersStackScreen() {
  return (
    <OrdersStack.Navigator screenOptions={{ headerShown: false }}>
      <OrdersStack.Screen name="OrderHistoryMain" component={OrderHistoryScreen} />
      <OrdersStack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ headerShown: true, title: 'Order details' }} />
      <OrdersStack.Screen name="WriteReview" component={WriteReviewScreen} options={{ headerShown: true, title: 'Rate product' }} />
      <OrdersStack.Screen name="RefundRequest" component={RefundRequestScreen} />
    </OrdersStack.Navigator>
  );
}

// Me tab: the profile header and menu, with the profile, password and developers pages inside it
function MeStackScreen() {
  return (
    <MeStack.Navigator screenOptions={{ headerShown: false }}>
      <MeStack.Screen name="MeMain" component={MeScreen} />
      <MeStack.Screen name="Profile" component={EditProfileScreen} options={{ headerShown: true, title: 'Edit Profile' }} />
      <MeStack.Screen name="AccountSettings" component={AccountSettingsScreen} options={{ headerShown: true, title: 'Account Settings' }} />
      <MeStack.Screen name="Messages" component={MessagesScreen} />
      <MeStack.Screen name="HelpCentre" component={HelpCentreScreen} options={{ headerShown: true, title: 'Help Centre' }} />
      <MeStack.Screen name="Legal" component={LegalScreen} options={{ headerShown: true, title: 'Terms and Privacy' }} />
      <MeStack.Screen name="Addresses" component={AddressesScreen} options={{ headerShown: true, title: 'My addresses' }} />
      <MeStack.Screen name="AddressForm" component={AddressFormScreen} options={{ headerShown: true, title: 'Delivery address' }} />
      <MeStack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: true, title: 'Change password' }} />
      <MeStack.Screen name="Developers" component={DevelopersScreen} options={{ headerShown: true, title: 'Developers' }} />
    </MeStack.Navigator>
  );
}

// The icons of the bottom bar: a line icon that turns solid pink, with a soft glow, when its tab is open
const TAB_ICONS = {
  Home: ['home', 'home-outline'],
  Orders: ['receipt', 'receipt-outline'],
  Notifications: ['notifications', 'notifications-outline'],
  Me: ['person', 'person-outline'],
};

function TabIcon({ routeName, focused }) {
  const [solid, line] = TAB_ICONS[routeName] || ['ellipse', 'ellipse-outline'];
  return (
    <View style={{ width: 54, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: focused ? 'rgba(252,64,140,0.20)' : 'transparent' }}>
      <Icon name={focused ? solid : line} size={22} color={focused ? COLORS.primary : '#8d8d99'} />
    </View>
  );
}

// EDIT DITO: kung gusto mong palitan ang itsura ng bottom tabs (kulay, bilog na gilid, atbp.)
function MainTabs() {
  const { unreadCount } = useNotifications();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarLabelPosition: 'below-icon', // the names stay under the icons, even in a wide browser window
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#8d8d99',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginBottom: 2 },
        // the bottom bar is hidden on the page of a product and in the chat (they have their own bar at the bottom)
        tabBarStyle: ['ProductDetail', 'Messages'].includes(getFocusedRouteNameFromRoute(route)) ? { display: 'none' } : TAB_BAR_STYLE,
        tabBarBadgeStyle: { backgroundColor: COLORS.primary, color: '#fff', fontSize: 10, fontWeight: '800' },
        tabBarIcon: ({ focused }) => <TabIcon routeName={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeStackScreen} />
      <Tab.Screen name="Orders" component={OrdersStackScreen} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ tabBarBadge: unreadCount > 0 ? unreadCount : undefined }}
      />
      <Tab.Screen name="Me" component={MeStackScreen} />
    </Tab.Navigator>
  );
}

// Mga screens na makikita BAGO mag-login
function AuthStackScreen() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function RootNavigator() {
  const { token, customer, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#fc408c" />
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

// In a browser the app is shown like a phone in the middle of the window (on a phone this does nothing)
function PhoneFrame({ children }) {
  if (Platform.OS !== 'web') return children;
  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a1d', alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: WEB_MAX_WIDTH, backgroundColor: '#fff', overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

export default function App() {
  return (
    <PhoneFrame>
      <AuthProvider>
        <CartProvider>
          <NotificationProvider>
            <MessageProvider>
              <StatusBar style="dark" />
              <RootNavigator />
              <DialogHost />
            </MessageProvider>
          </NotificationProvider>
        </CartProvider>
      </AuthProvider>
    </PhoneFrame>
  );
}