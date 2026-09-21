// src/screens/AccountScreen.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function AccountScreen({ navigation }) {
  const { customer, logout, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(customer?.fullName || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleLogout() {
    Alert.alert('Log out', 'Sigurado ka bang gusto mong mag-log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  }

  async function handleSave() {
    setError('');
    setSaving(true);
    try {
      await updateProfile({ full_name: fullName.trim(), phone: phone.trim(), address: address.trim() });
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account</Text>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{customer?.fullName?.charAt(0) || '?'}</Text>
        </View>

        {!editing ? (
          <>
            <Text style={styles.name}>{customer?.fullName}</Text>
            <Text style={styles.email}>{customer?.email}</Text>
            {customer?.phone ? <Text style={styles.detail}>{customer.phone}</Text> : null}
            {customer?.address ? <Text style={styles.detail}>{customer.address}</Text> : null}

            <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
              <Text style={styles.editButtonText}>Edit profile</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={{ width: '100%' }}>
            <TextInput style={styles.input} placeholder="Buong pangalan" value={fullName} onChangeText={setFullName} />
            <TextInput style={styles.input} placeholder="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <TextInput style={styles.input} placeholder="Address" value={address} onChangeText={setAddress} />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditing(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Developers')}>
        <Text style={styles.linkButtonText}>About the Developers</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const PRIMARY = '#6C5CE7';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7', padding: 20, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#2B2140', marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 24, alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  name: { fontSize: 18, fontWeight: '600', color: '#2B2140' },
  email: { fontSize: 14, color: '#888', marginTop: 2 },
  detail: { fontSize: 13, color: '#555', marginTop: 4 },
  editButton: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: PRIMARY },
  editButtonText: { color: PRIMARY, fontSize: 14, fontWeight: '600' },
  input: {
    backgroundColor: '#f8f8fa', borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, marginBottom: 10, fontSize: 14, width: '100%',
  },
  error: { color: '#e74c3c', fontSize: 12, textAlign: 'center', marginBottom: 8 },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelButton: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', alignItems: 'center' },
  cancelButtonText: { color: '#555', fontSize: 14 },
  saveButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: PRIMARY, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  logoutButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e74c3c', padding: 14, borderRadius: 8, alignItems: 'center' },
  linkButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  linkButtonText: { color: '#2B2140', fontSize: 15, fontWeight: '600' },
  logoutText: { color: '#e74c3c', fontSize: 15, fontWeight: '600' },
});