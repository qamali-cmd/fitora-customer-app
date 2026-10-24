// src/screens/AddressesScreen.js
// The customer's saved delivery addresses. When opened from checkout (select mode), tapping one chooses it.

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import Icon from '../components/Icon';
import { useFocusEffect } from '@react-navigation/native';
import API from '../api/config';
import { request } from '../api/http';
import { useAuth } from '../context/AuthContext';
import { addressLines } from '../utils/addressUtils';

export default function AddressesScreen({ navigation, route }) {
  const { token } = useAuth();
  const selectMode = !!(route && route.params && route.params.select);
  const selectedId = route && route.params ? route.params.selectedId : null;
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await request(`${API.AUTH}/customers/me/addresses`, { token });
      setAddresses(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function makeDefault(address) {
    try {
      await request(`${API.AUTH}/customers/me/addresses/${address.address_id}/default`, { method: 'PUT', token });
      load();
    } catch (err) {
      Alert.alert('Could not update', err.message);
    }
  }

  function confirmDelete(address) {
    Alert.alert('Delete address', 'Are you sure you want to delete this address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await request(`${API.AUTH}/customers/me/addresses/${address.address_id}`, { method: 'DELETE', token });
            load();
          } catch (err) {
            Alert.alert('Could not delete', err.message);
          }
        },
      },
    ]);
  }

  function choose(address) {
    navigation.navigate({ name: 'Checkout', params: { addressId: address.address_id }, merge: true });
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 60 }} size="large" color="#fc408c" />;

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={load}><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => String(item.address_id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const lines = addressLines(item);
            const selected = selectMode && item.address_id === selectedId;
            return (
              <TouchableOpacity style={[styles.card, selected && styles.cardSelected]} activeOpacity={selectMode ? 0.7 : 1} onPress={selectMode ? () => choose(item) : undefined}>
                <View style={styles.cardTop}>
                  <Text style={styles.name}>{item.recipient_name}</Text>
                  <Text style={styles.phone}>{item.phone}</Text>
                </View>
                <Text style={styles.line}>{lines.line1}</Text>
                <Text style={styles.line}>{lines.line2}</Text>
                {lines.landmark ? <Text style={styles.landmark}>Landmark: {lines.landmark}</Text> : null}
                <View style={styles.badges}>
                  <View style={styles.badge}><Text style={styles.badgeText}>{item.label === 'office' ? 'Office' : 'Home'}</Text></View>
                  {item.is_default ? <View style={[styles.badge, styles.badgeDefault]}><Text style={[styles.badgeText, styles.badgeDefaultText]}>Default</Text></View> : null}
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => navigation.navigate('AddressForm', { address: item })}><Text style={styles.action}>Edit</Text></TouchableOpacity>
                  {!item.is_default ? <TouchableOpacity onPress={() => makeDefault(item)}><Text style={styles.action}>Set as default</Text></TouchableOpacity> : null}
                  <TouchableOpacity onPress={() => confirmDelete(item)}><Text style={[styles.action, styles.delete]}>Delete</Text></TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Icon name="location-outline" size={52} color="#FC408C" style={{ marginBottom: 6 }} />
              <Text style={styles.emptyText}>You have no saved addresses yet.</Text>
              <Text style={styles.emptyHint}>Add one so checkout is quick and delivery is accurate.</Text>
            </View>
          }
        />
      )}

      {!error ? (
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddressForm')}>
          <Text style={styles.addText}>+ Add a new address</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const PRIMARY = '#fc408c';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7' },
  list: { padding: 14, paddingBottom: 100 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: '#fff' },
  cardSelected: { borderColor: PRIMARY },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  name: { fontSize: 15, fontWeight: '700', color: '#111111', flex: 1 },
  phone: { fontSize: 13, color: '#666' },
  line: { fontSize: 13, color: '#444', marginTop: 2 },
  landmark: { fontSize: 12, color: '#888', marginTop: 4 },
  badges: { flexDirection: 'row', gap: 8, marginTop: 10 },
  badge: { borderRadius: 10, backgroundColor: '#ffe8f1', paddingVertical: 3, paddingHorizontal: 10 },
  badgeText: { fontSize: 11, color: PRIMARY, fontWeight: '600' },
  badgeDefault: { backgroundColor: '#eafaf0' },
  badgeDefaultText: { color: '#27ae60' },
  actions: { flexDirection: 'row', gap: 18, marginTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10 },
  action: { fontSize: 13, color: PRIMARY, fontWeight: '600' },
  delete: { color: '#e74c3c' },
  center: { alignItems: 'center', marginTop: 70, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 44, marginBottom: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#555' },
  emptyHint: { fontSize: 13, color: '#999', marginTop: 4, textAlign: 'center' },
  error: { color: '#e74c3c', textAlign: 'center', marginBottom: 14 },
  retry: { backgroundColor: PRIMARY, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
  addButton: { position: 'absolute', left: 16, right: 16, bottom: 22, backgroundColor: PRIMARY, padding: 15, borderRadius: 10, alignItems: 'center' },
  addText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});