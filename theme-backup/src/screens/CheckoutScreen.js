// src/screens/CheckoutScreen.js
// The customer reviews the order, chooses a saved delivery address, and places the order.

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import API from '../api/config';
import { request } from '../api/http';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { addressLines } from '../utils/addressUtils';

export default function CheckoutScreen({ navigation, route }) {
  const { items, total, clearCart } = useCart();
  const { token } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // The address list screen sends back the address the customer tapped
  const requestedId = route && route.params ? route.params.addressId : null;

  const loadAddresses = useCallback(async () => {
    try {
      const data = await request(`${API.AUTH}/customers/me/addresses`, { token });
      const list = Array.isArray(data) ? data : [];
      setAddresses(list);
      setSelectedId((current) => {
        const wanted = requestedId || current;
        if (wanted && list.some((a) => a.address_id === wanted)) return wanted;
        const fallback = list.find((a) => a.is_default) || list[0];
        return fallback ? fallback.address_id : null;
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingAddresses(false);
    }
  }, [token, requestedId]);

  // Reload every time this screen is shown (for example after adding an address)
  useFocusEffect(
    useCallback(() => {
      loadAddresses();
    }, [loadAddresses])
  );

  const selected = addresses.find((a) => a.address_id === selectedId) || null;
  const lines = selected ? addressLines(selected) : null;

  async function handlePlaceOrder() {
    if (!selected) {
      setError('Please choose a delivery address.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const data = await request(`${API.ORDERS}/orders/place`, {
        method: 'POST',
        token,
        body: {
          items: items.map((i) => ({ product_id: i.product.product_id, quantity: i.quantity })),
          address_id: selected.address_id,
        },
      });

      clearCart();
      Alert.alert('Order placed!', `Order #${data.order_id} - ₱${Number(data.total_amount).toLocaleString()}`, [
        {
          text: 'View order',
          onPress: () => {
            navigation.popToTop();
            navigation.navigate('Orders', { screen: 'OrderDetail', params: { orderId: data.order_id }, initial: false });
          },
        },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Checkout</Text>

      <Text style={styles.label}>Delivery address</Text>
      {loadingAddresses ? (
        <ActivityIndicator style={{ marginVertical: 24 }} color="#6C5CE7" />
      ) : selected ? (
        <View style={styles.addressCard}>
          <View style={styles.addressTop}>
            <Text style={styles.addressName}>{selected.recipient_name}</Text>
            <Text style={styles.addressPhone}>{selected.phone}</Text>
          </View>
          <Text style={styles.addressLine}>{lines.line1}</Text>
          <Text style={styles.addressLine}>{lines.line2}</Text>
          {lines.landmark ? <Text style={styles.addressLandmark}>Landmark: {lines.landmark}</Text> : null}
          <View style={styles.addressBottom}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{selected.label === 'office' ? 'Office' : 'Home'}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Addresses', { select: true, selectedId })}>
              <Text style={styles.change}>Change address ›</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>You have no delivery address yet.</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddressForm')}>
            <Text style={styles.addButtonText}>+ Add a delivery address</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Order summary</Text>
        {items.map((i) => (
          <View key={i.product.product_id} style={styles.summaryRow}>
            <Text style={styles.summaryItemName} numberOfLines={1}>
              {i.quantity}x {i.product.product_name}
            </Text>
            <Text style={styles.summaryItemPrice}>₱{(i.product.price * i.quantity).toLocaleString()}</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₱{total.toLocaleString()}</Text>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.placeOrderButton, (!selected || loading) && styles.placeOrderDisabled]}
        onPress={handlePlaceOrder}
        disabled={!selected || loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.placeOrderText}>Place order</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const PRIMARY = '#6C5CE7';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#2B2140', marginBottom: 20 },
  label: { fontSize: 13, color: '#555', marginBottom: 6 },

  addressCard: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e4e0fb' },
  addressTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  addressName: { fontSize: 15, fontWeight: '700', color: '#2B2140', flex: 1 },
  addressPhone: { fontSize: 13, color: '#666' },
  addressLine: { fontSize: 13, color: '#444', marginTop: 2 },
  addressLandmark: { fontSize: 12, color: '#888', marginTop: 4 },
  addressBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  badge: { borderRadius: 10, backgroundColor: '#f1effd', paddingVertical: 3, paddingHorizontal: 10 },
  badgeText: { fontSize: 11, color: PRIMARY, fontWeight: '600' },
  change: { color: PRIMARY, fontSize: 13, fontWeight: '600' },

  emptyCard: { backgroundColor: '#fff', borderRadius: 10, padding: 18, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed' },
  emptyText: { fontSize: 14, color: '#555', marginBottom: 12 },
  addButton: { backgroundColor: PRIMARY, paddingVertical: 11, paddingHorizontal: 22, borderRadius: 8 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  summaryCard: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 16 },
  summaryTitle: { fontSize: 14, fontWeight: '600', color: '#2B2140', marginBottom: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryItemName: { fontSize: 13, color: '#555', flex: 1, marginRight: 8 },
  summaryItemPrice: { fontSize: 13, color: '#2B2140' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 8 },
  totalLabel: { fontSize: 15, fontWeight: '600', color: '#2B2140' },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: PRIMARY },
  error: { color: '#e74c3c', textAlign: 'center', marginBottom: 12, fontSize: 13 },
  placeOrderButton: { backgroundColor: PRIMARY, padding: 16, borderRadius: 8, alignItems: 'center' },
  placeOrderDisabled: { backgroundColor: '#b8b0f0' },
  placeOrderText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});