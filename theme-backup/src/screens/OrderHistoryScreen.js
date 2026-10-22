// src/screens/OrderHistoryScreen.js
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import API from '../api/config';
import { useAuth } from '../context/AuthContext';
import { FILTERS, matchesFilter } from '../utils/orderUtils';

const STATUS_LABELS = {
  pending: 'Pending', processing: 'Processing', shipped: 'Shipped',
  completed: 'Completed', cancelled: 'Cancelled',
};
const STATUS_COLORS = {
  pending: '#b9770e', processing: '#b9770e', shipped: '#b9770e',
  completed: '#27ae60', cancelled: '#e74c3c',
};

export default function OrderHistoryScreen({ navigation, route }) {
  const { token } = useAuth();
  const [filter, setFilter] = useState('all');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function loadOrders() {
    setError('');
    try {
      const res = await fetch(`${API.ORDERS}/orders/my`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();

      // BAGO: sinisiguro nating array talaga ang laman bago i-display,
      // at ipinapakita ang totoong error kung may nangyaring mali sa server
      // (dati, kapag nag-error ang request, sinasabi lang nating "wala kang order")
      if (!res.ok) {
        setError(data.error || `Server error (status ${res.status}).`);
        setOrders([]);
        return;
      }

      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Cannot reach the server. Please check your internet connection.');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Opens the right tab when the customer comes from the Me page (e.g. "To Receive")
  useEffect(() => {
    if (route && route.params && route.params.filter) setFilter(route.params.filter);
  }, [route && route.params && route.params.ts, route && route.params && route.params.filter]);

  // I-refresh tuwing babalik dito ang customer (hal. pagkatapos mag-order)
  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Purchases</Text>

      {!loading && !error ? (
        <View style={styles.chipsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {FILTERS.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.chip, filter === item.key && styles.chipActive]}
                onPress={() => setFilter(item.key)}
              >
                <Text style={[styles.chipText, filter === item.key && styles.chipTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#6C5CE7" />
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadOrders}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders.filter((order) => matchesFilter(order, filter))}
          keyExtractor={item => String(item.order_id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadOrders(); }} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.orderCard} onPress={() => navigation.navigate('OrderDetail', { orderId: item.order_id })}>
              <View style={styles.orderRow}>
                <Text style={styles.orderNumber}>Order #{item.order_id}</Text>
                <Text style={[styles.status, { color: STATUS_COLORS[item.status] }]}>
                  {STATUS_LABELS[item.status]}
                </Text>
              </View>
              <Text style={styles.orderDate}>{new Date(item.order_date).toLocaleDateString()}</Text>
              <Text style={styles.orderTotal}>₱{Number(item.total_amount).toLocaleString()}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>{filter === 'all' ? 'You have no orders yet.' : 'No orders in this tab.'}</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7', paddingTop: 50 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#2B2140', paddingHorizontal: 16, marginBottom: 12 },
  list: { paddingHorizontal: 16 },
  chipsWrap: { height: 48 },
  chips: { paddingHorizontal: 16, alignItems: 'center' },
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', marginRight: 8 },
  chipActive: { backgroundColor: '#6C5CE7', borderColor: '#6C5CE7' },
  chipText: { fontSize: 13, color: '#555' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  orderCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  orderNumber: { fontSize: 14, fontWeight: '600', color: '#2B2140' },
  status: { fontSize: 13, fontWeight: '600' },
  orderDate: { fontSize: 12, color: '#888', marginBottom: 6 },
  orderTotal: { fontSize: 15, fontWeight: 'bold', color: '#6C5CE7' },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 60 },
  errorBox: { padding: 20, marginTop: 40, alignItems: 'center' },
  errorText: { color: '#e74c3c', textAlign: 'center', marginBottom: 16, fontSize: 14 },
  retryButton: { backgroundColor: '#6C5CE7', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 },
  retryButtonText: { color: '#fff', fontWeight: '600' },
});