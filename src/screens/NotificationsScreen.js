// src/screens/NotificationsScreen.js
// Order updates, newest first. New updates are highlighted until the customer has seen them.

import React, { useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useNotifications } from '../context/NotificationContext';
import { notificationFor } from '../utils/orderUtils';

export default function NotificationsScreen({ navigation }) {
  const { orders, unreadIds, refresh, markAllSeen } = useNotifications();
  const [highlight, setHighlight] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const unreadRef = useRef(unreadIds);
  unreadRef.current = unreadIds;

  // When the tab opens: remember what is new (to highlight it), then mark everything as seen
  useFocusEffect(
    useCallback(() => {
      refresh();
      setHighlight(unreadRef.current);
      const timer = setTimeout(() => { markAllSeen(); }, 800);
      return () => clearTimeout(timer);
    }, [])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  const items = [...orders].sort((a, b) => new Date(b.order_date) - new Date(a.order_date));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      <FlatList
        data={items}
        keyExtractor={(order) => String(order.order_id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderItem={({ item }) => {
          const info = notificationFor(item);
          const isNew = highlight.includes(item.order_id) || unreadIds.includes(item.order_id);
          return (
            <TouchableOpacity
              style={[styles.card, isNew && styles.cardNew]}
              onPress={() => navigation.navigate('Orders', { screen: 'OrderDetail', params: { orderId: item.order_id }, initial: false })}
            >
              <Text style={styles.icon}>{info.icon}</Text>
              <View style={styles.body}>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle}>{info.title}</Text>
                  {isNew ? <View style={styles.dot} /> : null}
                </View>
                <Text style={styles.text}>{info.text}</Text>
                <Text style={styles.meta}>
                  {new Date(item.order_date).toLocaleDateString()} · ₱{Number(item.total_amount).toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>No notifications yet.</Text>
            <Text style={styles.emptyHint}>Updates about your orders will appear here.</Text>
          </View>
        }
      />
    </View>
  );
}

const PRIMARY = '#fc408c';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7', paddingTop: 50 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111111', paddingHorizontal: 16, marginBottom: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  cardNew: { backgroundColor: '#ffe8f1', borderWidth: 1, borderColor: '#ffc2dc' },
  icon: { fontSize: 26, marginRight: 12 },
  body: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111111', flex: 1 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#e74c3c', marginLeft: 8 },
  text: { fontSize: 13, color: '#555', marginTop: 3 },
  meta: { fontSize: 11, color: '#999', marginTop: 6 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 44, marginBottom: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#555' },
  emptyHint: { fontSize: 13, color: '#999', marginTop: 4 },
});