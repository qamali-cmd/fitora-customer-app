// src/screens/OrderDetailScreen.js
// The full details of one order: status tracker, delivery address, items, and cancellation.

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native';
import API from '../api/config';
import { request } from '../api/http';
import { useAuth } from '../context/AuthContext';
import { addressLines } from '../utils/addressUtils';

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

export function OrderDetailView({ order, onPressCancel }) {
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
            {order.cancelled_by === 'admin' ? 'This order was cancelled by the seller' : order.cancel_request_reason ? 'Your cancellation request was approved' : 'You cancelled this order'}
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
      {(order.items || []).map((item) => (
        <View key={item.order_item_id} style={styles.itemRow}>
          <Text style={styles.itemName} numberOfLines={1}>{item.quantity}x {item.product_name}</Text>
          <Text style={styles.itemPrice}>₱{(item.price * item.quantity).toLocaleString()}</Text>
        </View>
      ))}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>₱{Number(order.total_amount).toLocaleString()}</Text>
      </View>

      {option.hint ? <Text style={styles.hint}>{option.hint}</Text> : null}
      {option.canCancel ? (
        <TouchableOpacity style={styles.cancelButton} onPress={onPressCancel}>
          <Text style={styles.cancelButtonText}>{option.label}</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

export default function OrderDetailScreen({ route }) {
  const { orderId } = route.params;
  const { token } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reason, setReason] = useState(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await request(`${API.ORDERS}/orders/my/${orderId}`, { token });
      setOrder(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [orderId, token]);

  useEffect(() => {
    load();
  }, [load]);

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
        <ActivityIndicator size="large" color="#6C5CE7" />
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
      <OrderDetailView order={order} onPressCancel={() => setPickerOpen(true)} />

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

const PRIMARY = '#6C5CE7';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7' },
  content: { padding: 16, paddingBottom: 40 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: '#e74c3c', textAlign: 'center', marginBottom: 14 },
  retryButton: { backgroundColor: PRIMARY, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },

  headerCard: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 12 },
  orderNumber: { fontSize: 18, fontWeight: 'bold', color: '#2B2140' },
  orderDate: { fontSize: 12, color: '#888', marginTop: 2, marginBottom: 6 },
  status: { fontSize: 14, fontWeight: '600' },

  banner: { borderRadius: 10, padding: 14, marginBottom: 12 },
  bannerDanger: { backgroundColor: '#fdeaea' },
  bannerWarn: { backgroundColor: '#fdf3e3' },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: '#2B2140' },
  bannerText: { fontSize: 13, color: '#555', marginTop: 3 },

  progressRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 16 },
  progressStepWrap: { flex: 1, alignItems: 'center' },
  progressDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#ddd', marginBottom: 4 },
  progressDotActive: { backgroundColor: PRIMARY },
  progressLabel: { fontSize: 10, color: '#888', textAlign: 'center' },
  progressLine: { position: 'absolute', top: 6, left: '55%', width: '100%', height: 2, backgroundColor: '#ddd' },
  progressLineActive: { backgroundColor: PRIMARY },

  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#2B2140', marginBottom: 8, marginTop: 4 },
  addressCard: { backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 16 },
  addressTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  addressName: { fontSize: 14, fontWeight: '700', color: '#2B2140', flex: 1 },
  addressPhone: { fontSize: 12, color: '#666' },
  addressLine: { fontSize: 13, color: '#555', marginTop: 2 },
  addressLandmark: { fontSize: 12, color: '#888', marginTop: 4 },
  addressText: { fontSize: 13, color: '#555', backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 16 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 8 },
  itemName: { fontSize: 13, color: '#555', flex: 1, marginRight: 8 },
  itemPrice: { fontSize: 13, color: '#2B2140', fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, marginTop: 4 },
  totalLabel: { fontSize: 15, fontWeight: '600', color: '#2B2140' },
  totalValue: { fontSize: 17, fontWeight: 'bold', color: PRIMARY },

  hint: { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 8 },
  cancelButton: { borderWidth: 1, borderColor: '#e74c3c', backgroundColor: '#fff', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  cancelButtonText: { color: '#e74c3c', fontSize: 15, fontWeight: '600' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, paddingBottom: 30 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#2B2140', marginBottom: 10 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#bbb', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioActive: { borderColor: PRIMARY },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY },
  reasonText: { fontSize: 14, color: '#2B2140', flex: 1 },
  sheetButtons: { flexDirection: 'row', gap: 10, marginTop: 14 },
  keepButton: { flex: 1, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', alignItems: 'center' },
  keepText: { color: '#555', fontSize: 14, fontWeight: '600' },
  confirmButton: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#e74c3c', alignItems: 'center' },
  confirmDisabled: { backgroundColor: '#f1a9a0' },
  confirmText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});