// src/screens/OrderDetailScreen.js
// BAGONG SCREEN: makikita dito ang buong detalye ng isang order -
// mga items, quantity, presyo bawat isa, shipping address, at status.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import API from '../api/config';
import { useAuth } from '../context/AuthContext';

const STATUS_LABELS = {
  pending: 'Pending', processing: 'Processing', shipped: 'Shipped',
  completed: 'Completed', cancelled: 'Cancelled',
};
const STATUS_COLORS = {
  pending: '#b9770e', processing: '#b9770e', shipped: '#b9770e',
  completed: '#27ae60', cancelled: '#e74c3c',
};

// EDIT DITO: simpleng "progress tracker" ng order status
const STATUS_STEPS = ['pending', 'processing', 'shipped', 'completed'];

export default function OrderDetailScreen({ route }) {
  const { orderId } = route.params;
  const { token } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API.ORDERS}/orders/my/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setOrder(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centerContainer}>
        <Text>Hindi nahanap ang order.</Text>
      </View>
    );
  }

  const currentStepIndex = STATUS_STEPS.indexOf(order.status);

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.orderNumber}>Order #{order.order_id}</Text>
        <Text style={styles.orderDate}>{new Date(order.order_date).toLocaleString()}</Text>
        <Text style={[styles.status, { color: STATUS_COLORS[order.status] }]}>
          {STATUS_LABELS[order.status]}
        </Text>
      </View>

      {/* Simpleng progress tracker - hindi ipapakita kung cancelled */}
      {order.status !== 'cancelled' && (
        <View style={styles.progressRow}>
          {STATUS_STEPS.map((step, i) => (
            <View key={step} style={styles.progressStepWrap}>
              <View style={[styles.progressDot, i <= currentStepIndex && styles.progressDotActive]} />
              <Text style={styles.progressLabel}>{STATUS_LABELS[step]}</Text>
              {i < STATUS_STEPS.length - 1 && (
                <View style={[styles.progressLine, i < currentStepIndex && styles.progressLineActive]} />
              )}
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionLabel}>Shipping address</Text>
      <Text style={styles.addressText}>{order.shipping_address || 'Walang nakalagay na address.'}</Text>

      <Text style={styles.sectionLabel}>Items</Text>
      <FlatList
        data={order.items}
        keyExtractor={item => String(item.order_item_id)}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <Text style={styles.itemName} numberOfLines={1}>{item.quantity}x {item.product_name}</Text>
            <Text style={styles.itemPrice}>₱{(item.price * item.quantity).toLocaleString()}</Text>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₱{Number(order.total_amount).toLocaleString()}</Text>
          </View>
        }
      />
    </View>
  );
}

const PRIMARY = '#6C5CE7';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7', padding: 16 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerCard: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 16 },
  orderNumber: { fontSize: 18, fontWeight: 'bold', color: '#2B2140' },
  orderDate: { fontSize: 12, color: '#888', marginTop: 2, marginBottom: 6 },
  status: { fontSize: 14, fontWeight: '600' },

  progressRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 16 },
  progressStepWrap: { flex: 1, alignItems: 'center' },
  progressDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#ddd', marginBottom: 4 },
  progressDotActive: { backgroundColor: PRIMARY },
  progressLabel: { fontSize: 10, color: '#888', textAlign: 'center' },
  progressLine: { position: 'absolute', top: 6, left: '55%', width: '100%', height: 2, backgroundColor: '#ddd' },
  progressLineActive: { backgroundColor: PRIMARY },

  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#2B2140', marginBottom: 8, marginTop: 4 },
  addressText: { fontSize: 13, color: '#555', backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 16 },
  itemRow: {
    flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff',
    borderRadius: 8, padding: 12, marginBottom: 8,
  },
  itemName: { fontSize: 13, color: '#555', flex: 1, marginRight: 8 },
  itemPrice: { fontSize: 13, color: '#2B2140', fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, marginTop: 4 },
  totalLabel: { fontSize: 15, fontWeight: '600', color: '#2B2140' },
  totalValue: { fontSize: 17, fontWeight: 'bold', color: PRIMARY },
});