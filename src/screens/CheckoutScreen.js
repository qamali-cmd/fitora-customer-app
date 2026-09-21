// src/screens/CheckoutScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import API from '../api/config';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function CheckoutScreen({ navigation }) {
  const { items, total, clearCart } = useCart();
  const { token, customer } = useAuth();
  const [address, setAddress] = useState(customer?.address || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handlePlaceOrder() {
    if (!address.trim()) {
      setError('Kailangan ng shipping address.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API.ORDERS}/orders/place`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: items.map(i => ({ product_id: i.product.product_id, quantity: i.quantity })),
          shipping_address: address.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Hindi ma-place ang order.');
        return;
      }

      clearCart();
      Alert.alert('Order placed!', `Order #${data.order_id} - ₱${Number(data.total_amount).toLocaleString()}`, [
        { text: 'OK', onPress: () => navigation.navigate('OrderHistory') },
      ]);
    } catch (err) {
      setError('Hindi ma-reach ang server. Siguraduhing tumatakbo ang order-service.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Checkout</Text>

      <Text style={styles.label}>Shipping address</Text>
      <TextInput
        style={styles.addressInput}
        placeholder="Buong address (bahay, barangay, lungsod)"
        value={address}
        onChangeText={setAddress}
        multiline
      />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Order summary</Text>
        {items.map(i => (
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

      <TouchableOpacity style={styles.placeOrderButton} onPress={handlePlaceOrder} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.placeOrderText}>Place order</Text>}
      </TouchableOpacity>
    </View>
  );
}

const PRIMARY = '#6C5CE7';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7', padding: 20, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#2B2140', marginBottom: 20 },
  label: { fontSize: 13, color: '#555', marginBottom: 6 },
  addressInput: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, fontSize: 14, minHeight: 70, textAlignVertical: 'top', marginBottom: 20,
  },
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
  placeOrderText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});