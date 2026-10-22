// src/screens/OrderDetailScreen.js
// The full details of one order: status tracker, delivery address, items, and cancellation.

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Modal, Alert, Linking, AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import API from '../api/config';
import { request } from '../api/http';
import { useAuth } from '../context/AuthContext';
import { addressLines } from '../utils/addressUtils';
import { appReturnLink, openCheckout } from '../utils/paymentBrowser';

const STATUS_LABELS = {
  pending: 'Pending', processing: 'Processing', shipped: 'Shipped',
  completed: 'Completed', cancelled: 'Cancelled',
};
const STATUS_COLORS = {
  pending: '#b9770e', processing: '#b9770e', shipped: '#b9770e',
  completed: '#27ae60', cancelled: '#e74c3c',
};
const STATUS_STEPS = ['pending', 'processing', 'shipped', 'completed'];

// Keep this list the same as the one on the server (services/order-service/server.js)
const CANCEL_REASONS = [
  'I changed my mind',
  'I need to change my delivery address',
  'I ordered the wrong item or quantity',
  'I found a cheaper price elsewhere',
  'The payment is too troublesome',
  'Other',
];

// The official websites where the customer can follow the parcel with the tracking number
const COURIER_SITES = {
  'J&T Express': 'https://www.jtexpress.ph/',
  'LBC Express': 'https://www.lbcexpress.com/',
  'Flash Express': 'https://www.flashexpress.ph/',
  'SPX Express': 'https://spx.ph/',
};

const PAYMENT_COLORS = { paid: '#27ae60', awaiting_payment: '#b9770e', refund_pending: '#e74c3c', refunded: '#666', unpaid: '#555' };

// The payment status in words the customer understands
export function paymentText(order) {
  if (order.payment_status === 'paid') return 'Paid';
  if (order.payment_status === 'awaiting_payment') return 'Waiting for your payment';
  if (order.payment_status === 'refund_pending') return 'Refund in progress';
  if (order.payment_status === 'refunded') return 'Refunded';
  if (order.payment_method === 'gcash') return 'Not paid';
  return order.status === 'cancelled' ? 'Not collected' : 'To be paid on delivery';
}

// The time until which an unpaid GCash order is kept (30 minutes after it was placed)
function payDeadline(order) {
  const placed = new Date(order.order_date).getTime();
  if (Number.isNaN(placed)) return '';
  return new Date(placed + 30 * 60 * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const REVIEW_STATUS = { pending: 'Waiting for the shop to approve it', approved: 'Published', hidden: 'Hidden by the shop' };

// What the customer can do about cancelling, for the current status
function cancelOption(order) {
  if (order.status === 'pending') return { canCancel: true, label: 'Cancel order', hint: '' };
  if (order.status === 'processing' && !order.cancel_request_status) {
    return { canCancel: true, label: 'Request cancellation', hint: 'The seller is already preparing this order, so the seller must approve the cancellation.' };
  }
  if (order.status === 'shipped') {
    return { canCancel: false, label: '', hint: 'This order is already on its way and can no longer be cancelled.' };
  }
  return { canCancel: false, label: '', hint: '' };
}

export function OrderDetailView({ order, onPressCancel, onPressReceived = () => {}, onPressTrack = () => {}, reviewMap = {}, onPressReview = () => {}, onPressPay = () => {} }) {
  const currentStepIndex = STATUS_STEPS.indexOf(order.status);
  const option = cancelOption(order);
  const hasSavedAddress = !!order.ship_street;
  const lines = hasSavedAddress
    ? addressLines({
        street: order.ship_street, barangay_name: order.ship_barangay, city_name: order.ship_city,
        province_name: order.ship_province, region_name: order.ship_region, zip_code: order.ship_zip, landmark: order.ship_landmark,
      })
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.orderNumber}>Order #{order.order_id}</Text>
        <Text style={styles.orderDate}>{new Date(order.order_date).toLocaleString()}</Text>
        <Text style={[styles.status, { color: STATUS_COLORS[order.status] }]}>{STATUS_LABELS[order.status]}</Text>
      </View>

      {order.status === 'cancelled' ? (
        <View style={[styles.banner, styles.bannerDanger]}>
          <Text style={styles.bannerTitle}>
            {order.cancelled_by === 'admin' ? 'This order was cancelled by the seller' : order.cancelled_by === 'system' ? 'This order was cancelled automatically' : order.cancel_request_reason ? 'Your cancellation request was approved' : 'You cancelled this order'}
          </Text>
          {order.cancel_reason ? <Text style={styles.bannerText}>Reason: {order.cancel_reason}</Text> : null}
        </View>
      ) : order.cancel_request_status === 'requested' ? (
        <View style={[styles.banner, styles.bannerWarn]}>
          <Text style={styles.bannerTitle}>Cancellation requested</Text>
          <Text style={styles.bannerText}>Reason: {order.cancel_request_reason}</Text>
          <Text style={styles.bannerText}>Waiting for the seller to reply.</Text>
        </View>
      ) : order.cancel_request_status === 'rejected' ? (
        <View style={[styles.banner, styles.bannerWarn]}>
          <Text style={styles.bannerTitle}>Your cancellation request was declined</Text>
          {order.cancel_reject_reason ? <Text style={styles.bannerText}>Reason: {order.cancel_reject_reason}</Text> : null}
        </View>
      ) : null}

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

      {order.courier ? (
        <View style={styles.shipCard}>
          <Text style={styles.shipTitle}>Shipping details</Text>
          <Text style={styles.shipLine}>Courier: <Text style={styles.shipBold}>{order.courier}</Text></Text>
          {order.tracking_number ? (
            <Text style={styles.shipLine} selectable>Tracking number: <Text style={styles.shipBold} selectable>{order.tracking_number}</Text></Text>
          ) : null}
          {order.shipped_at ? <Text style={styles.shipSmall}>Shipped on {new Date(order.shipped_at).toLocaleDateString()}</Text> : null}
          {order.tracking_number && COURIER_SITES[order.courier] ? (
            <TouchableOpacity onPress={() => onPressTrack(COURIER_SITES[order.courier])}>
              <Text style={styles.shipLink}>Track on the courier's website ›</Text>
            </TouchableOpacity>
          ) : null}
          {order.tracking_number ? <Text style={styles.shipSmall}>Press and hold the tracking number to copy it.</Text> : null}
        </View>
      ) : null}

      <View style={styles.payCard}>
        <Text style={styles.shipTitle}>Payment</Text>
        <Text style={styles.shipLine}>Method: <Text style={styles.shipBold}>{order.payment_method === 'gcash' ? 'GCash' : 'Cash on Delivery'}</Text></Text>
        <Text style={styles.shipLine}>Status: <Text style={[styles.shipBold, { color: PAYMENT_COLORS[order.payment_status] || '#555' }]}>{paymentText(order)}</Text></Text>
        {order.payment_method === 'cod' && order.payment_status === 'unpaid' && order.status !== 'cancelled' ? (
          <Text style={styles.shipSmall}>Please prepare ₱{Number(order.total_amount).toLocaleString()} in cash for the courier.</Text>
        ) : null}
        {order.payment_status === 'awaiting_payment' && order.status === 'pending' ? (
          <View>
            <Text style={styles.shipSmall}>Please pay within 30 minutes of ordering{payDeadline(order) ? ` (before ${payDeadline(order)})` : ''}, or the order will be cancelled automatically.</Text>
            <TouchableOpacity style={styles.receivedButton} onPress={onPressPay}>
              <Text style={styles.receivedText}>Pay with GCash</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {order.payment_status === 'refund_pending' ? <Text style={styles.shipSmall}>The shop will refund your GCash payment. You will be notified when it is done.</Text> : null}
      </View>

      <Text style={styles.sectionLabel}>Delivery address</Text>
      {hasSavedAddress ? (
        <View style={styles.addressCard}>
          <View style={styles.addressTop}>
            <Text style={styles.addressName}>{order.ship_name}</Text>
            <Text style={styles.addressPhone}>{order.ship_phone}</Text>
          </View>
          <Text style={styles.addressLine}>{lines.line1}</Text>
          <Text style={styles.addressLine}>{lines.line2}</Text>
          {lines.landmark ? <Text style={styles.addressLandmark}>Landmark: {lines.landmark}</Text> : null}
        </View>
      ) : (
        <Text style={styles.addressText}>{order.shipping_address || 'No address provided.'}</Text>
      )}

      <Text style={styles.sectionLabel}>Items</Text>
      {(order.items || []).map((item) => {
        const review = reviewMap[item.product_id];
        return (
          <View key={item.order_item_id} style={styles.itemBlock}>
            <View style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>{item.quantity}x {item.product_name}</Text>
              <Text style={styles.itemPrice}>₱{(item.price * item.quantity).toLocaleString()}</Text>
            </View>
            {order.status === 'completed' ? (
              review ? (
                <Text style={styles.reviewedTag}>★ You rated this {review.rating}/5 · {REVIEW_STATUS[review.status] || review.status}</Text>
              ) : (
                <TouchableOpacity style={styles.rateButton} onPress={() => onPressReview(item)}>
                  <Text style={styles.rateText}>★ Rate this product</Text>
                </TouchableOpacity>
              )
            ) : null}
          </View>
        );
      })}
      {order.subtotal_amount != null ? (
        <View style={styles.breakdown}>
          <View style={styles.breakRow}>
            <Text style={styles.breakLabel}>Subtotal</Text>
            <Text style={styles.breakValue}>₱{Number(order.subtotal_amount).toLocaleString()}</Text>
          </View>
          <View style={styles.breakRow}>
            <Text style={styles.breakLabel}>Shipping fee</Text>
            <Text style={styles.breakValue}>₱{Number(order.shipping_fee).toLocaleString()}</Text>
          </View>
          {Number(order.shipping_discount) > 0 ? (
            <View style={styles.breakRow}>
              <Text style={styles.breakLabel}>Shipping discount</Text>
              <Text style={[styles.breakValue, styles.breakDiscount]}>-₱{Number(order.shipping_discount).toLocaleString()}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>₱{Number(order.total_amount).toLocaleString()}</Text>
      </View>

      {option.hint ? <Text style={styles.hint}>{option.hint}</Text> : null}
      {order.status === 'shipped' ? (
        <View>
          <TouchableOpacity style={styles.receivedButton} onPress={onPressReceived}>
            <Text style={styles.receivedText}>Order Received</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>Tap this when your parcel has arrived.</Text>
        </View>
      ) : null}
      {option.canCancel ? (
        <TouchableOpacity style={styles.cancelButton} onPress={onPressCancel}>
          <Text style={styles.cancelButtonText}>{option.label}</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

export default function OrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params;
  const { token } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reason, setReason] = useState(null);
  const [sending, setSending] = useState(false);
  const [reviewMap, setReviewMap] = useState({});
  const orderRef = useRef(null); // the latest order, for the payment check

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await request(`${API.ORDERS}/orders/my/${orderId}`, { token });
      setOrder(data);
      orderRef.current = data;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [orderId, token]);

  // Which items of this order were already rated
  const loadReviews = useCallback(async () => {
    try {
      const list = await request(`${API.PRODUCTS}/reviews/my?order_id=${orderId}`, { token });
      setReviewMap(Object.fromEntries((Array.isArray(list) ? list : []).map((r) => [r.product_id, r])));
    } catch (err) {
      // the order still shows; the Rate buttons simply appear
    }
  }, [orderId, token]);

  // Asks the server if the GCash payment arrived (the customer may have just come back from the GCash page)
  const checkPayment = useCallback(async () => {
    const current = orderRef.current;
    if (!current || current.payment_status !== 'awaiting_payment') return;
    try {
      const result = await request(`${API.ORDERS}/orders/my/${orderId}/payment/verify`, { method: 'POST', token });
      if (result && (result.payment_status !== current.payment_status || result.status !== current.status)) {
        await load();
        if (result.payment_status === 'paid') Alert.alert('Payment received', 'Thank you! Your GCash payment was received. The shop will now prepare your order.');
      }
    } catch (err) {
      // not important: the customer can still press Pay with GCash again
    }
  }, [orderId, token, load]);

  // Reload every time the screen is shown again (for example after writing a review or paying)
  useFocusEffect(
    useCallback(() => {
      load().then(checkPayment);
      loadReviews();
    }, [load, loadReviews, checkPayment])
  );

  // When the customer comes back to the app from the GCash page, check the payment right away
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkPayment();
    });
    return () => subscription.remove();
  }, [checkPayment]);

  async function payNow() {
    try {
      const result = await request(`${API.ORDERS}/orders/my/${orderId}/pay`, { method: 'POST', token, body: { app_return_url: appReturnLink() } });
      if (result.payment_status === 'paid') {
        Alert.alert('Payment received', 'Your GCash payment was already received. Thank you!');
        load();
        return;
      }
      if (result.checkout_url) {
        await openCheckout(result.checkout_url);
        // back from the payment page: show the newest state of the order and check the payment
        await load();
        await checkPayment();
      }
    } catch (err) {
      Alert.alert('Could not open GCash', err.message);
    }
  }

  function confirmReceived() {
    Alert.alert('Order received?', 'Please confirm that your parcel has arrived.', [
      { text: 'Not yet', style: 'cancel' },
      {
        text: 'Yes, I received it',
        onPress: async () => {
          try {
            const data = await request(`${API.ORDERS}/orders/my/${orderId}/received`, { method: 'PUT', token });
            Alert.alert('Order completed', data.message);
          } catch (err) {
            Alert.alert('Could not confirm', err.message);
          }
          load();
        },
      },
    ]);
  }

  function openTracking(url) {
    Linking.openURL(url).catch(() => Alert.alert('Could not open the link', url));
  }

  async function confirmCancel() {
    if (!reason) return;
    setSending(true);
    try {
      const data = await request(`${API.ORDERS}/orders/my/${orderId}/cancel`, { method: 'PUT', token, body: { reason } });
      setPickerOpen(false);
      setReason(null);
      Alert.alert(data.requested ? 'Request sent' : 'Order cancelled', data.message);
      load();
    } catch (err) {
      setPickerOpen(false);
      Alert.alert('Could not cancel', err.message);
      load();
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#fc408c" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'Order not found.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); load(); }}>
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <OrderDetailView
        order={order}
        onPressCancel={() => setPickerOpen(true)}
        onPressReceived={confirmReceived}
        onPressPay={payNow}
        onPressTrack={openTracking}
        reviewMap={reviewMap}
        onPressReview={(item) => navigation.navigate('WriteReview', { orderId, productId: item.product_id, productName: item.product_name })}
      />

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Why do you want to cancel?</Text>
            {CANCEL_REASONS.map((text) => (
              <TouchableOpacity key={text} style={styles.reasonRow} onPress={() => setReason(text)}>
                <View style={[styles.radio, reason === text && styles.radioActive]}>
                  {reason === text ? <View style={styles.radioDot} /> : null}
                </View>
                <Text style={styles.reasonText}>{text}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.sheetButtons}>
              <TouchableOpacity style={styles.keepButton} onPress={() => { setPickerOpen(false); setReason(null); }}>
                <Text style={styles.keepText}>Keep order</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmButton, !reason && styles.confirmDisabled]} onPress={confirmCancel} disabled={!reason || sending}>
                {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const PRIMARY = '#fc408c';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7' },
  content: { padding: 16, paddingBottom: 40 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: '#e74c3c', textAlign: 'center', marginBottom: 14 },
  retryButton: { backgroundColor: PRIMARY, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },

  headerCard: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 12 },
  orderNumber: { fontSize: 18, fontWeight: 'bold', color: '#111111' },
  orderDate: { fontSize: 12, color: '#888', marginTop: 2, marginBottom: 6 },
  status: { fontSize: 14, fontWeight: '600' },

  banner: { borderRadius: 10, padding: 14, marginBottom: 12 },
  bannerDanger: { backgroundColor: '#fdeaea' },
  bannerWarn: { backgroundColor: '#fdf3e3' },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: '#111111' },
  bannerText: { fontSize: 13, color: '#555', marginTop: 3 },

  progressRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 16 },
  progressStepWrap: { flex: 1, alignItems: 'center' },
  progressDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#ddd', marginBottom: 4 },
  progressDotActive: { backgroundColor: PRIMARY },
  progressLabel: { fontSize: 10, color: '#888', textAlign: 'center' },
  progressLine: { position: 'absolute', top: 6, left: '55%', width: '100%', height: 2, backgroundColor: '#ddd' },
  progressLineActive: { backgroundColor: PRIMARY },

  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#111111', marginBottom: 8, marginTop: 4 },
  addressCard: { backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 16 },
  addressTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  addressName: { fontSize: 14, fontWeight: '700', color: '#111111', flex: 1 },
  addressPhone: { fontSize: 12, color: '#666' },
  addressLine: { fontSize: 13, color: '#555', marginTop: 2 },
  addressLandmark: { fontSize: 12, color: '#888', marginTop: 4 },
  addressText: { fontSize: 13, color: '#555', backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 16 },
  itemBlock: { backgroundColor: '#fff', borderRadius: 8, marginBottom: 8 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12 },
  reviewedTag: { fontSize: 12, color: '#27ae60', paddingHorizontal: 12, paddingBottom: 10 },
  rateButton: { marginHorizontal: 12, marginBottom: 12, borderWidth: 1, borderColor: PRIMARY, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  rateText: { color: PRIMARY, fontSize: 13, fontWeight: '600' },
  itemName: { fontSize: 13, color: '#555', flex: 1, marginRight: 8 },
  itemPrice: { fontSize: 13, color: '#111111', fontWeight: '600' },
  payCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  shipCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#ffd1e3' },
  shipTitle: { fontSize: 14, fontWeight: '700', color: '#111111', marginBottom: 4 },
  shipLine: { fontSize: 13, color: '#555', marginTop: 3 },
  shipBold: { fontWeight: '700', color: '#111111' },
  shipSmall: { fontSize: 11, color: '#888', marginTop: 4 },
  shipLink: { color: PRIMARY, fontWeight: '600', marginTop: 8 },
  receivedButton: { backgroundColor: PRIMARY, padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  receivedText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  breakdown: { paddingHorizontal: 12, marginTop: 4 },
  breakRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  breakLabel: { fontSize: 13, color: '#555' },
  breakValue: { fontSize: 13, color: '#111111' },
  breakDiscount: { color: '#27ae60' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, marginTop: 4 },
  totalLabel: { fontSize: 15, fontWeight: '600', color: '#111111' },
  totalValue: { fontSize: 17, fontWeight: 'bold', color: PRIMARY },

  hint: { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 8 },
  cancelButton: { borderWidth: 1, borderColor: '#e74c3c', backgroundColor: '#fff', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  cancelButtonText: { color: '#e74c3c', fontSize: 15, fontWeight: '600' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, paddingBottom: 30 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#111111', marginBottom: 10 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#bbb', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioActive: { borderColor: PRIMARY },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY },
  reasonText: { fontSize: 14, color: '#111111', flex: 1 },
  sheetButtons: { flexDirection: 'row', gap: 10, marginTop: 14 },
  keepButton: { flex: 1, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', alignItems: 'center' },
  keepText: { color: '#555', fontSize: 14, fontWeight: '600' },
  confirmButton: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#e74c3c', alignItems: 'center' },
  confirmDisabled: { backgroundColor: '#f1a9a0' },
  confirmText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});