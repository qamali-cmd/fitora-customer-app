// src/screens/MeScreen.js
// The "Me" tab (like a big shopping app): the profile on top (press it to EDIT the profile), the gear on the right (it opens
// the ACCOUNT SETTINGS, a different page), My Purchases with the numbers, and a short menu.
import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert, Platform, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useMessages } from '../context/MessageContext';
import { COLORS } from '../theme';
import Icon from '../components/Icon';
import { countByFilter } from '../utils/orderUtils';

const SHORTCUTS = [
  { key: 'toPay', label: 'To Pay', icon: 'card-outline' },
  { key: 'toShip', label: 'To Ship', icon: 'cube-outline' },
  { key: 'toReceive', label: 'To Receive', icon: 'car-outline' },
  { key: 'completed', label: 'Completed', icon: 'star-outline' },
  { key: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline' },
];

export default function MeScreen({ navigation }) {
  const { customer, logout, refreshProfile } = useAuth();
  const { orders, refresh } = useNotifications();
  const messageState = useMessages();
  const unreadMessages = (messageState && messageState.unread) || 0;
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.decoBig} pointerEvents="none" />
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Me</Text>
          <TouchableOpacity style={styles.gear} onPress={() => navigation.navigate('AccountSettings')} accessibilityLabel="Settings">
            <Icon name="settings-outline" size={23} color="#fff" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.profileRow} onPress={() => navigation.navigate('Profile')} activeOpacity={0.85} accessibilityLabel="Edit profile">
          {customer?.profilePhoto ? (
            <Image source={{ uri: customer.profilePhoto }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}><Text style={styles.avatarText}>{customer?.fullName?.charAt(0)?.toUpperCase() || '?'}</Text></View>
          )}
          <View style={styles.profileText}>
            <Text style={styles.name} numberOfLines={1}>{customer?.fullName}</Text>
            <Text style={styles.username} numberOfLines={1}>{customer?.username ? `@${customer.username}` : customer?.email}</Text>
            <View style={styles.badge}>
              <Icon name={verified ? 'checkmark-circle' : 'alert-circle-outline'} size={13} color="#fff" />
              <Text style={styles.badgeText}>{verified ? 'Email verified' : 'Email not verified'}</Text>
            </View>
          </View>
          <View style={styles.editHint}><Text style={styles.editHintText}>Edit profile</Text><Icon name="chevron-forward" size={14} color="#fff" /></View>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>My Purchases</Text>
          <TouchableOpacity style={styles.viewAllRow} onPress={() => goToOrders('all')} accessibilityLabel="View all orders">
            <Text style={styles.viewAll}>View all</Text><Icon name="chevron-forward" size={14} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.shortcutRow}>
          {SHORTCUTS.map((item) => (
            <TouchableOpacity key={item.key} style={styles.shortcut} onPress={() => goToOrders(item.key)} accessibilityLabel={item.label}>
              <View style={styles.shortcutIconBox}>
                <Icon name={item.icon} size={26} color={COLORS.primary} />
                {counts[item.key] > 0 ? <View style={styles.countBadge}><Text style={styles.countText}>{counts[item.key] > 99 ? '99+' : counts[item.key]}</Text></View> : null}
              </View>
              <Text style={styles.shortcutLabel} numberOfLines={1}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <MenuRow icon="chatbubble-ellipses-outline" label="Messages" badge={unreadMessages} onPress={() => navigation.navigate('Messages')} />
        <MenuRow icon="location-outline" label="My addresses" onPress={() => navigation.navigate('Addresses')} />
        <MenuRow icon="help-circle-outline" label="Help Centre" onPress={() => navigation.navigate('HelpCentre')} />
        <MenuRow icon="people-outline" label="About the Developers" onPress={() => navigation.navigate('Developers')} last />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} accessibilityLabel="Log out">
        <Icon name="log-out-outline" size={19} color={COLORS.danger} />
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function MenuRow({ icon, label, onPress, last, badge }) {
  return (
    <TouchableOpacity style={[styles.menuRow, !last && styles.menuRowBorder]} onPress={onPress} accessibilityLabel={label}>
      <View style={styles.menuIcon}><Icon name={icon} size={20} color={COLORS.primary} /></View>
      <Text style={styles.menuLabel}>{label}</Text>
      {badge > 0 ? <View style={styles.menuBadge}><Text style={styles.menuBadgeText}>{badge > 99 ? '99+' : badge}</Text></View> : null}
      <Icon name="chevron-forward" size={17} color={COLORS.muted} />
    </TouchableOpacity>
  );
}

const TOP = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : Platform.OS === 'ios' ? 54 : 14;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 30 },
  header: { backgroundColor: COLORS.primary, paddingTop: TOP, paddingBottom: 22, paddingHorizontal: 16, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: 'hidden' },
  decoBig: { position: 'absolute', top: -60, right: -40, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,0.10)' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  gear: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)' },
  avatarImage: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#eee', borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)' },
  avatarText: { color: COLORS.primary, fontSize: 30, fontWeight: '800' },
  profileText: { flex: 1, marginLeft: 14 },
  name: { fontSize: 18, fontWeight: '800', color: '#fff' },
  username: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 11, paddingHorizontal: 9, paddingVertical: 3, marginTop: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700', marginLeft: 4 },
  editHint: { flexDirection: 'row', alignItems: 'center' },
  editHintText: { color: '#fff', fontSize: 12, fontWeight: '700', marginRight: 2 },

  card: { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 12, marginTop: 12, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: '#f1e4ea' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink },
  viewAllRow: { flexDirection: 'row', alignItems: 'center' },
  viewAll: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  shortcutRow: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 12 },
  shortcut: { flex: 1, alignItems: 'center' },
  shortcutIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: COLORS.primaryTint, borderWidth: 1.5, borderColor: '#ffd1e3', alignItems: 'center', justifyContent: 'center' },
  countBadge: { position: 'absolute', top: -6, right: -8, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: '#fff' },
  countText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  shortcutLabel: { fontSize: 11, color: COLORS.text, marginTop: 7, fontWeight: '600' },

  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.line },
  menuIcon: { width: 34 },
  menuLabel: { flex: 1, fontSize: 15, color: COLORS.text },
  menuBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginRight: 8 },
  menuBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 12, marginTop: 16, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: COLORS.danger, backgroundColor: '#fff' },
  logoutText: { color: COLORS.danger, fontWeight: '800', fontSize: 15, marginLeft: 8 },
});