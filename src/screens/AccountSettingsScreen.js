// src/screens/AccountSettingsScreen.js
// The ACCOUNT SETTINGS (a different page from the profile): the account, the support, and log out.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme';
import Icon from '../components/Icon';

function Row({ icon, label, hint, onPress, last }) {
  return (
    <TouchableOpacity style={[styles.row, !last && styles.rowLine]} onPress={onPress} accessibilityLabel={label}>
      <View style={styles.rowIcon}><Icon name={icon} size={20} color={COLORS.primary} /></View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint} numberOfLines={1}>{hint}</Text> : null}
      </View>
      <Icon name="chevron-forward" size={17} color={COLORS.muted} />
    </TouchableOpacity>
  );
}

export default function AccountSettingsScreen({ navigation }) {
  const { customer, logout } = useAuth();

  function handleLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.section}>My Account</Text>
      <View style={styles.group}>
        <Row icon="person-outline" label="Edit Profile" hint={customer?.fullName} onPress={() => navigation.navigate('Profile')} />
        <Row icon="lock-closed-outline" label="Account & Security" hint="Change your password" onPress={() => navigation.navigate('ChangePassword')} />
        <Row icon="location-outline" label="My Addresses" hint="Where we deliver your orders" onPress={() => navigation.navigate('Addresses')} last />
      </View>

      <Text style={styles.section}>Support</Text>
      <View style={styles.group}>
        <Row icon="chatbubble-ellipses-outline" label="Message the shop" hint="Ask us anything" onPress={() => navigation.navigate('Messages')} />
        <Row icon="help-circle-outline" label="Help Centre" hint="Questions and answers" onPress={() => navigation.navigate('HelpCentre')} />
        <Row icon="document-text-outline" label="Terms and Privacy" onPress={() => navigation.navigate('Legal')} />
        <Row icon="people-outline" label="About the Developers" onPress={() => navigation.navigate('Developers')} last />
      </View>

      <TouchableOpacity style={styles.logout} onPress={handleLogout} accessibilityLabel="Log out">
        <Icon name="log-out-outline" size={19} color={COLORS.danger} />
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
      <Text style={styles.version}>Fitora Gear</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 30 },
  section: { fontSize: 13, fontWeight: '800', color: COLORS.muted, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  group: { backgroundColor: '#fff', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f1e4ea' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: COLORS.line },
  rowIcon: { width: 36 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, color: COLORS.text },
  rowHint: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginTop: 26, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: COLORS.danger, backgroundColor: '#fff' },
  logoutText: { color: COLORS.danger, fontWeight: '800', fontSize: 15, marginLeft: 8 },
  version: { textAlign: 'center', color: COLORS.muted, fontSize: 12, marginTop: 18 },
});