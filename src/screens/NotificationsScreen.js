// src/screens/NotificationsScreen.js
// Order updates, newest first. Every update has a round icon with a color, and the photo of the first item.
// New updates are highlighted until the customer has seen them.

import React, { useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Image, Platform, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useNotifications } from '../context/NotificationContext';
import { COLORS, TONES, peso } from '../theme';
import Icon from '../components/Icon';
import { thumb } from '../utils/productUtils';
import { notificationFor } from '../utils/orderUtils';

const dateText = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };

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
  const newCount = items.filter((o) => highlight.includes(o.order_id) || unreadIds.includes(o.order_id)).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>{newCount > 0 ? `${newCount} new ${newCount === 1 ? 'update' : 'updates'}` : 'Updates about your orders'}</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(order) => String(order.order_id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        renderItem={({ item }) => {
          const info = notificationFor(item);
          const tone = TONES[info.tone] || TONES.pink;
          const isNew = highlight.includes(item.order_id) || unreadIds.includes(item.order_id);
          const first = (item.items || [])[0];
          return (
            <TouchableOpacity
              style={[styles.card, isNew && styles.cardNew]}
              activeOpacity={0.85}
              accessibilityLabel={info.title}
              onPress={() => navigation.navigate('Orders', { screen: 'OrderDetail', params: { orderId: item.order_id }, initial: false })}
            >
              <View style={[styles.iconCircle, { backgroundColor: tone.bg }]}>
                <Icon name={info.icon} size={24} color={tone.fg} />
              </View>
              <View style={styles.body}>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{info.title}</Text>
                  {isNew ? <View style={styles.dot} /> : null}
                </View>
                <Text style={styles.text} numberOfLines={3}>{info.text}</Text>
                <View style={styles.metaRow}>
                  <Icon name="time-outline" size={12} color={COLORS.muted} />
                  <Text style={styles.meta}>{dateText(item.order_date)} · {peso(item.total_amount)}</Text>
                </View>
              </View>
              {first && first.image ? <Image source={{ uri: thumb(first.image, 160) }} style={styles.photo} resizeMode="cover" /> : null}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyCircle}><Icon name="notifications-outline" size={44} color={COLORS.primary} /></View>
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptyHint}>Updates about your orders will appear here.</Text>
          </View>
        }
      />
    </View>
  );
}

const TOP = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : Platform.OS === 'ios' ? 54 : 14;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { backgroundColor: COLORS.primary, paddingTop: TOP, paddingBottom: 14, paddingHorizontal: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.88)', marginTop: 2 },
  list: { padding: 12, paddingBottom: 24 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#f1e4ea' },
  cardNew: { backgroundColor: COLORS.primaryTint, borderColor: '#ffc2da', borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  body: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: COLORS.ink, flex: 1 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.primary, marginLeft: 8 },
  text: { fontSize: 13, color: '#555', marginTop: 3, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  meta: { fontSize: 11, color: COLORS.muted, marginLeft: 4 },
  photo: { width: 52, height: 52, borderRadius: 8, marginLeft: 10, backgroundColor: COLORS.primaryTint },
  empty: { alignItems: 'center', marginTop: 70 },
  emptyCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, fontWeight: '800', color: COLORS.ink, marginTop: 14 },
  emptyHint: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
});