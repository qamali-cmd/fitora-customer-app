// src/screens/OrderHistoryScreen.js
// "My Purchases", like a big shopping app: tabs (All, To Pay, To Ship, To Receive, Completed, Cancelled) with numbers,
// and a card for every order with the photos of what was bought, the status, how it is paid, the tracking, the total,
// and the right buttons (Pay Now, Track Order, Rate, Buy Again, Details).
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, ScrollView, Image, Alert, Platform, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import API from '../api/config';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { COLORS, TONES, peso } from '../theme';
import Icon from '../components/Icon';
import { thumb } from '../utils/productUtils';
import { FILTERS, matchesFilter, countByFilter, statusInfo, paymentInfo, isAwaitingPayment } from '../utils/orderUtils';
import { payForOrder } from '../utils/payOrder';

const SHOWN_ITEMS = 2; // the card shows the first 2 items, and "+ N more items" for the rest
const dateText = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };

function Tag({ icon, label, tone }) {
  const color = TONES[tone] || TONES.pink;
  return (
    <View style={[styles.tag, { backgroundColor: color.bg }]}>
      <Icon name={icon} size={13} color={color.fg} />
      <Text style={[styles.tagText, { color: color.fg }]}>{label}</Text>
    </View>
  );
}

function ItemRow({ item }) {
  return (
    <View style={styles.itemRow}>
      {item.image ? (
        <Image source={{ uri: thumb(item.image, 200) }} style={styles.itemPhoto} resizeMode="cover" />
      ) : (
        <View style={[styles.itemPhoto, styles.itemPhotoEmpty]}><Icon name="image-outline" size={24} color={COLORS.primary} style={{ opacity: 0.5 }} /></View>
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>{item.product_name || 'This product is no longer in the shop'}</Text>
        <View style={styles.itemBottom}>
          <Text style={styles.itemPrice}>{peso(item.price)}</Text>
          <Text style={styles.itemQty}>x{item.quantity}</Text>
        </View>
      </View>
    </View>
  );
}

function OrderCard({ order, busy, onOpen, onPay, onBuyAgain }) {
  const items = order.items || [];
  const status = statusInfo(order);
  const payment = paymentInfo(order);
  const count = items.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
  const more = items.length - SHOWN_ITEMS;

  // the buttons at the bottom of the card, by the state of the order
  const buttons = [];
  if (isAwaitingPayment(order)) {
    buttons.push({ key: 'details', label: 'Details', icon: 'receipt-outline', onPress: onOpen });
    buttons.push({ key: 'pay', label: busy === 'pay' ? 'Opening...' : 'Pay Now', icon: 'card-outline', primary: true, onPress: onPay, disabled: !!busy });
  } else if (order.status === 'shipped') {
    buttons.push({ key: 'details', label: 'Details', icon: 'receipt-outline', onPress: onOpen });
    buttons.push({ key: 'track', label: 'Track Order', icon: 'location-outline', primary: true, onPress: onOpen });
  } else if (order.status === 'completed') {
    if (items.length > 0) buttons.push({ key: 'again', label: busy === 'again' ? 'Adding...' : 'Buy Again', icon: 'cart-outline', onPress: onBuyAgain, disabled: !!busy });
    buttons.push({ key: 'rate', label: 'Rate', icon: 'star', primary: true, onPress: onOpen });
  } else if (order.status === 'cancelled') {
    buttons.push({ key: 'details', label: 'Details', icon: 'receipt-outline', onPress: onOpen });
    if (items.length > 0) buttons.push({ key: 'again', label: busy === 'again' ? 'Adding...' : 'Buy Again', icon: 'cart-outline', primary: true, onPress: onBuyAgain, disabled: !!busy });
  } else {
    buttons.push({ key: 'details', label: 'Details', icon: 'receipt-outline', primary: true, onPress: onOpen });
  }

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardHead} onPress={onOpen} activeOpacity={0.8} accessibilityLabel={`Open order ${order.order_id}`}>
        <View style={styles.shop}>
          <Icon name="storefront-outline" size={18} color={COLORS.ink} />
          <Text style={styles.shopName}>Fitora Gear</Text>
          <Text style={styles.orderNo}>#{order.order_id}</Text>
        </View>
        <Tag icon={status.icon} label={status.label} tone={status.tone} />
      </TouchableOpacity>

      <TouchableOpacity onPress={onOpen} activeOpacity={0.85} accessibilityLabel={`Items of order ${order.order_id}`}>
        {items.length === 0 ? (
          <View style={styles.itemRow}>
            <View style={[styles.itemPhoto, styles.itemPhotoEmpty]}><Icon name="bag-handle-outline" size={26} color={COLORS.primary} /></View>
            <View style={styles.itemInfo}><Text style={styles.itemName}>Order #{order.order_id}</Text><Text style={styles.itemQty}>Tap to see what was ordered</Text></View>
          </View>
        ) : items.slice(0, SHOWN_ITEMS).map((item, i) => <ItemRow key={`${item.product_id}-${i}`} item={item} />)}
        {more > 0 ? (
          <View style={styles.more}><Text style={styles.moreText}>+ {more} more {more === 1 ? 'item' : 'items'}</Text><Icon name="chevron-forward" size={14} color={COLORS.muted} /></View>
        ) : null}
      </TouchableOpacity>

      <View style={styles.infoRow}>
        <View style={styles.pay}>
          <Icon name={payment.icon} size={14} color={COLORS.muted} />
          <Text style={styles.payText}>{payment.label}{payment.state ? ` · ${payment.state}` : ''}</Text>
        </View>
        <Text style={styles.date}>{dateText(order.order_date)}</Text>
      </View>

      {order.status === 'shipped' && (order.courier || order.tracking_number) ? (
        <View style={styles.tracking}>
          <Icon name="car-outline" size={16} color={COLORS.primary} />
          <Text style={styles.trackingText} numberOfLines={1}>{[order.courier, order.tracking_number].filter(Boolean).join(' · ')}</Text>
        </View>
      ) : null}

      <View style={styles.totalRow}>
        <Text style={styles.totalCount}>{count > 0 ? `${count} ${count === 1 ? 'item' : 'items'}` : ''}</Text>
        <Text style={styles.totalLabel}>Order Total: <Text style={styles.totalValue}>{peso(order.total_amount)}</Text></Text>
      </View>

      <View style={styles.buttons}>
        {buttons.map((b) => (
          <TouchableOpacity key={b.key} style={[styles.button, b.primary && styles.buttonPrimary, b.disabled && styles.buttonOff]} onPress={b.onPress} disabled={b.disabled} accessibilityLabel={b.label}>
            <Icon name={b.icon} size={15} color={b.primary ? '#fff' : COLORS.primary} />
            <Text style={[styles.buttonText, b.primary && styles.buttonTextPrimary]}>{b.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function OrderHistoryScreen({ navigation, route }) {
  const { token } = useAuth();
  const { items: cartItems, addToCart } = useCart();
  const [filter, setFilter] = useState('all');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null); // { id, kind } while one order is being paid or bought again

  async function loadOrders() {
    setError('');
    try {
      const res = await fetch(`${API.ORDERS}/orders/my`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      // the real error is shown (not "you have no orders") when the server has a problem
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

  // Refresh every time the customer comes back here (for example after ordering)
  useFocusEffect(useCallback(() => { loadOrders(); }, []));

  const open = (order) => navigation.navigate('OrderDetail', { orderId: order.order_id });

  async function pay(order) {
    setBusy({ id: order.order_id, kind: 'pay' });
    try {
      const result = await payForOrder({ token, orderId: order.order_id });
      if (result.status === 'paid' || result.status === 'already_paid') Alert.alert('Payment received', 'Thank you! Your GCash payment was received. The shop will now prepare your order.');
    } catch (err) {
      Alert.alert('Could not open GCash', err.message);
    } finally {
      setBusy(null);
      loadOrders();
    }
  }

  // "Buy Again": puts the items of an old order in the cart again, with what the shop has now (the newest stock and price)
  async function buyAgain(order) {
    setBusy({ id: order.order_id, kind: 'again' });
    let added = 0;
    const skipped = [];
    for (const item of order.items || []) {
      const name = item.product_name || 'A product';
      try {
        const res = await fetch(`${API.PRODUCTS}/products/${item.product_id}`);
        if (!res.ok) { skipped.push(name); continue; }
        const product = await res.json();
        const onSale = product.status === 'active' && (!product.approval_status || product.approval_status === 'approved');
        const inCart = ((cartItems || []).find((c) => c.product.product_id === product.product_id) || { quantity: 0 }).quantity;
        const room = Number(product.stock) - inCart;
        const quantity = Math.min(Number(item.quantity), room);
        if (!onSale || quantity < 1) { skipped.push(name); continue; }
        addToCart(product, quantity);
        added += quantity;
      } catch (err) {
        skipped.push(name);
      }
    }
    setBusy(null);
    const note = skipped.length ? ` Not available now: ${skipped.join(', ')}.` : '';
    if (added > 0) {
      Alert.alert('Added to cart', `${added} ${added === 1 ? 'item was' : 'items were'} added to your cart.${note}`, [
        { text: 'Continue shopping', style: 'cancel' },
        { text: 'Go to cart', onPress: () => navigation.navigate('Home', { screen: 'Cart' }) },
      ]);
    } else {
      Alert.alert('Nothing was added', `These items are not available right now.${note}`);
    }
  }

  const counts = countByFilter(orders);
  const shown = orders.filter((order) => matchesFilter(order, filter));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Purchases</Text>
        <Text style={styles.subtitle}>{loading ? ' ' : `${orders.length} ${orders.length === 1 ? 'order' : 'orders'}`}</Text>
      </View>

      {!loading && !error ? (
        <View style={styles.chipsWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {FILTERS.map((item) => {
              const active = filter === item.key;
              const n = item.key === 'toPay' || item.key === 'toShip' || item.key === 'toReceive' ? counts[item.key] : 0;
              return (
                <TouchableOpacity key={item.key} style={[styles.chip, active && styles.chipActive]} onPress={() => setFilter(item.key)} accessibilityLabel={`Show ${item.label}`}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
                  {n > 0 ? <View style={[styles.chipBadge, active && styles.chipBadgeActive]}><Text style={[styles.chipBadgeText, active && styles.chipBadgeTextActive]}>{n}</Text></View> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={COLORS.primary} />
      ) : error ? (
        <View style={styles.center}>
          <Icon name="cloud-offline-outline" size={56} color={COLORS.primary} />
          <Text style={styles.centerTitle}>Could not load your orders</Text>
          <Text style={styles.centerText}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => { setLoading(true); loadOrders(); }}><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(item) => String(item.order_id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadOrders(); }} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              busy={busy && busy.id === item.order_id ? busy.kind : null}
              onOpen={() => open(item)}
              onPay={() => pay(item)}
              onBuyAgain={() => buyAgain(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <View style={styles.emptyCircle}><Icon name={filter === 'all' ? 'bag-handle-outline' : 'receipt-outline'} size={44} color={COLORS.primary} /></View>
              <Text style={styles.centerTitle}>{filter === 'all' ? 'You have no orders yet' : 'No orders here'}</Text>
              <Text style={styles.centerText}>{filter === 'all' ? 'When you order something, it will show up here.' : 'Orders with this status will show up here.'}</Text>
              {filter === 'all' ? <TouchableOpacity style={styles.retry} onPress={() => navigation.navigate('Home')} accessibilityLabel="Start shopping"><Text style={styles.retryText}>Start shopping</Text></TouchableOpacity> : null}
            </View>
          }
        />
      )}
    </View>
  );
}

const TOP = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : Platform.OS === 'ios' ? 54 : 14;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { backgroundColor: COLORS.primary, paddingTop: TOP, paddingBottom: 14, paddingHorizontal: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  chipsWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.line },
  chips: { paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 14, borderRadius: 18, backgroundColor: COLORS.bg, marginRight: 8 },
  chipActive: { backgroundColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  chipTextActive: { color: '#fff', fontWeight: '800' },
  chipBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, marginLeft: 6 },
  chipBadgeActive: { backgroundColor: '#fff' },
  chipBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  chipBadgeTextActive: { color: COLORS.primary },
  list: { padding: 12, paddingBottom: 24 },

  card: { backgroundColor: '#fff', borderRadius: 14, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#f1e4ea' },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  shop: { flexDirection: 'row', alignItems: 'center' },
  shopName: { fontSize: 14, fontWeight: '800', color: COLORS.ink, marginLeft: 6 },
  orderNo: { fontSize: 12, color: COLORS.muted, marginLeft: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4 },
  tagText: { fontSize: 12, fontWeight: '800', marginLeft: 4 },

  itemRow: { flexDirection: 'row', paddingHorizontal: 14, paddingTop: 12 },
  itemPhoto: { width: 70, height: 70, borderRadius: 10, backgroundColor: COLORS.primaryTint },
  itemPhotoEmpty: { alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },
  itemName: { fontSize: 14, color: COLORS.text, lineHeight: 19 },
  itemBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemPrice: { fontSize: 14, fontWeight: '700', color: COLORS.ink },
  itemQty: { fontSize: 13, color: COLORS.muted },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 10 },
  moreText: { fontSize: 12, color: COLORS.muted, marginRight: 2 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingTop: 12 },
  pay: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  payText: { fontSize: 12, color: COLORS.muted, marginLeft: 6, flexShrink: 1 },
  date: { fontSize: 12, color: COLORS.muted, marginLeft: 8 },
  tracking: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginTop: 10, backgroundColor: COLORS.primaryTint, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  trackingText: { flex: 1, fontSize: 12, fontWeight: '700', color: COLORS.primaryDark, marginLeft: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingTop: 12, marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.line },
  totalCount: { fontSize: 12, color: COLORS.muted },
  totalLabel: { fontSize: 13, color: COLORS.text },
  totalValue: { fontSize: 17, fontWeight: '800', color: COLORS.primary },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 36, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1.5, borderColor: COLORS.primary, marginLeft: 8 },
  buttonPrimary: { backgroundColor: COLORS.primary },
  buttonOff: { opacity: 0.55 },
  buttonText: { fontSize: 13, fontWeight: '800', color: COLORS.primary, marginLeft: 6 },
  buttonTextPrimary: { color: '#fff' },

  center: { alignItems: 'center', paddingHorizontal: 36, paddingVertical: 56 },
  emptyCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  centerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.ink, marginTop: 14 },
  centerText: { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  retry: { marginTop: 18, backgroundColor: COLORS.primary, borderRadius: 22, paddingHorizontal: 26, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '800' },
});