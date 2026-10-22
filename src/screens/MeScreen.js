// src/screens/MeScreen.js
// The "Me" tab (Shopee-style): profile header, My Purchases shortcuts with counts, and menu.

import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { countByFilter } from '../utils/orderUtils';

const SHORTCUTS = [
  { key: 'toShip', label: 'To Ship', icon: '📦' },
  { key: 'toReceive', label: 'To Receive', icon: '🚚' },
  { key: 'completed', label: 'Completed', icon: '⭐' },
  { key: 'cancelled', label: 'Cancelled', icon: '↩️' },
];

export default function MeScreen({ navigation }) {
  const { customer, logout, refreshProfile } = useAuth();
  const { orders, refresh } = useNotifications();
  const counts = countByFilter(orders);

  // Refresh the profile and the order counts every time this tab is opened
  useFocusEffect(
    useCallback(() => {
      refreshProfile().catch(() => {});
      refresh();
    }, [])
  );

  function goToOrders(filter) {
    navigation.navigate('Orders', { screen: 'OrderHistoryMain', params: { filter, ts: Date.now() } });
  }

  function handleLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  }

  const verified = customer?.emailVerified !== false;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerRow} onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
          {customer?.profilePhoto ? (
            <Image source={{ uri: customer.profilePhoto }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{customer?.fullName?.charAt(0)?.toUpperCase() || '?'}</Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={1}>{customer?.fullName}</Text>
            <Text style={styles.username} numberOfLines={1}>
              {customer?.username ? `@${customer.username}` : customer?.email}
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{verified ? '✓ Email verified' : '! Email not verified'}</Text>
            </View>
          </View>
          <Text style={styles.gear}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* My Purchases */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>My Purchases</Text>
          <TouchableOpacity onPress={() => goToOrders('all')}>
            <Text style={styles.viewAll}>View all ›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.shortcutRow}>
          {SHORTCUTS.map((item) => (
            <TouchableOpacity key={item.key} style={styles.shortcut} onPress={() => goToOrders(item.key)}>
              <View>
                <Text style={styles.shortcutIcon}>{item.icon}</Text>
                {counts[item.key] > 0 ? (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{counts[item.key] > 99 ? '99+' : counts[item.key]}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.shortcutLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Menu */}
      <View style={styles.card}>
        <MenuRow icon="👤" label="My profile" onPress={() => navigation.navigate('Profile')} />
        <MenuRow icon="📍" label="My addresses" onPress={() => navigation.navigate('Addresses')} />
        <MenuRow icon="🔒" label="Change password" onPress={() => navigation.navigate('ChangePassword')} />
        <MenuRow icon="👥" label="About the Developers" onPress={() => navigation.navigate('Developers')} last />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function MenuRow({ icon, label, onPress, last }) {
  return (
    <TouchableOpacity style={[styles.menuRow, !last && styles.menuRowBorder]} onPress={onPress}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );
}

const PRIMARY = '#fc408c';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7' },
  content: { paddingBottom: 40 },

  header: { backgroundColor: PRIMARY, paddingTop: 64, paddingBottom: 26, paddingHorizontal: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#ddd', borderWidth: 2, borderColor: '#fff' },
  avatarText: { color: PRIMARY, fontSize: 26, fontWeight: 'bold' },
  headerText: { flex: 1, marginLeft: 14 },
  name: { color: '#fff', fontSize: 18, fontWeight: '700' },
  username: { color: '#ffd1e3', fontSize: 13, marginTop: 2 },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingVertical: 2, paddingHorizontal: 8, marginTop: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  gear: { fontSize: 22, marginLeft: 8 },

  card: { backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 14, marginTop: 14, paddingVertical: 6, paddingHorizontal: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111111' },
  viewAll: { fontSize: 13, color: '#888' },
  shortcutRow: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 12, paddingTop: 4 },
  shortcut: { flex: 1, alignItems: 'center' },
  shortcutIcon: { fontSize: 28, textAlign: 'center' },
  shortcutLabel: { fontSize: 12, color: '#444', marginTop: 6 },
  countBadge: {
    position: 'absolute', top: -6, right: -12, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#e74c3c', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  countText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  menuIcon: { fontSize: 18, width: 30 },
  menuLabel: { flex: 1, fontSize: 15, color: '#111111' },
  menuArrow: { fontSize: 20, color: '#bbb' },

  logoutButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e74c3c', marginHorizontal: 14, marginTop: 18, padding: 14, borderRadius: 10, alignItems: 'center' },
  logoutText: { color: '#e74c3c', fontSize: 15, fontWeight: '600' },
});