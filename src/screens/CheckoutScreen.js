// src/screens/CheckoutScreen.js
// The customer reviews the order, chooses a saved delivery address, and places the order.

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Modal, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import API from '../api/config';
import { request } from '../api/http';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { addressLines } from '../utils/addressUtils';
import { appReturnLink, openCheckout } from '../utils/paymentBrowser';

// The order summary: items, subtotal, shipping fee, shipping discount, and total
export function OrderSummary({ items, total, quote, quoting, hasAddress, onChangeQuantity = () => {}, onRemove = () => {} }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Order summary</Text>
      {items.map((i) => {
        const stock = Number(i.product.stock);
        const max = Number.isFinite(stock) ? Math.min(99, stock) : 99;
        return (
          <View key={i.product.product_id} style={styles.itemBlock}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryItemName} numberOfLines={2}>{i.product.product_name}</Text>
              <Text style={styles.summaryItemPrice}>₱{(i.product.price * i.quantity).toLocaleString()}</Text>
            </View>
            <View style={styles.stepperRow}>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepButton} onPress={() => onChangeQuantity(i.product.product_id, i.quantity - 1)}>
                  <Text style={styles.stepText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepQty}>{i.quantity}</Text>
                <TouchableOpacity
                  style={[styles.stepButton, i.quantity >= max && styles.stepDisabled]}
                  disabled={i.quantity >= max}
                  onPress={() => onChangeQuantity(i.product.product_id, i.quantity + 1)}
                >
                  <Text style={styles.stepText}>+</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => onRemove(i.product.product_id)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
      <View style={styles.divider} />

      <View style={styles.summaryRow}>
        <Text style={styles.summaryItemName}>Subtotal</Text>
        <Text style={styles.summaryItemPrice}>₱{(quote ? quote.subtotal : total).toLocaleString()}</Text>
      </View>

      {quote ? (
        <View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryItemName}>Shipping fee ({quote.zone_label}, {(quote.weight_grams / 1000).toFixed(2)} kg)</Text>
            <Text style={styles.summaryItemPrice}>₱{quote.shipping_fee.toLocaleString()}</Text>
          </View>
          {quote.shipping_discount > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryItemName}>Shipping discount</Text>
              <Text style={styles.discountValue}>-₱{quote.shipping_discount.toLocaleString()}</Text>
            </View>
          ) : (
            <Text style={styles.tip}>
              Spend ₱{(quote.free_shipping_min - quote.subtotal).toLocaleString()} more to get up to ₱{quote.free_shipping_max_discount} off shipping.
            </Text>
          )}
        </View>
      ) : (
        <Text style={styles.tip}>
          {!hasAddress ? 'Choose a delivery address to see the shipping fee.' : quoting ? 'Calculating the shipping fee...' : ''}
        </Text>
      )}

      <View style={styles.divider} />
      <View style={styles.summaryRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{quote ? `₱${quote.total_amount.toLocaleString()}` : '—'}</Text>
      </View>
    </View>
  );
}

// The message shown after the order is placed: the receipt and a choice of what to do next
// One payment choice (a card with a round button)
export function PaymentOption({ selected, disabled, title, subtitle, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.payOption, selected && styles.payOptionOn, disabled && styles.payOptionOff]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.payTitle}>{title}</Text>
        <Text style={styles.paySubtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function OrderPlacedModal({ placed, onView, onContinue, onPay }) {
  const peso = (n) => `₱${Number(n).toLocaleString()}`;
  const toPay = !!placed && placed.payment_method === 'gcash';
  return (
    <Modal visible={!!placed} transparent animationType="fade" onRequestClose={onContinue}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.checkCircle}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
          <Text style={styles.modalTitle}>{toPay ? 'Complete Your Payment' : 'Thank You for Your Order'}</Text>
          <Text style={styles.modalSubtitle}>
            {toPay
              ? 'Your order is reserved for 30 minutes. Please pay with GCash to confirm it, or the order will be cancelled automatically.'
              : 'Your order has been placed successfully. We will notify you once it is being prepared and shipped.'}
          </Text>

          {placed ? (
            <View style={styles.receipt}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Order number</Text>
                <Text style={styles.receiptValueBold}>#{placed.order_id}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Payment</Text>
                <Text style={styles.receiptValue}>{placed.payment_method === 'gcash' ? 'GCash' : 'Cash on Delivery'}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Items subtotal</Text>
                <Text style={styles.receiptValue}>{peso(placed.subtotal)}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Shipping fee</Text>
                <Text style={styles.receiptValue}>{peso(placed.shipping_fee)}</Text>
              </View>
              {Number(placed.shipping_discount) > 0 ? (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Shipping discount</Text>
                  <Text style={styles.receiptDiscount}>-{peso(placed.shipping_discount)}</Text>
                </View>
              ) : null}
              <View style={styles.receiptDivider} />
              <View style={styles.receiptRow}>
                <Text style={styles.receiptTotalLabel}>Total amount</Text>
                <Text style={styles.receiptTotal}>{peso(placed.total_amount)}</Text>
              </View>
            </View>
          ) : null}

          {toPay && placed.checkout_url ? (
            <TouchableOpacity style={styles.primaryAction} onPress={onPay}>
              <Text style={styles.primaryActionText}>Pay with GCash</Text>
            </TouchableOpacity>
          ) : null}
          {toPay && !placed.checkout_url ? (
            <Text style={styles.payProblem}>{placed.payment_error || 'GCash could not be opened. You can try again from your order.'}</Text>
          ) : null}
          <TouchableOpacity style={toPay && placed.checkout_url ? styles.secondaryAction : styles.primaryAction} onPress={onView}>
            <Text style={toPay && placed.checkout_url ? styles.secondaryActionText : styles.primaryActionText}>View My Order</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryAction} onPress={onContinue}>
            <Text style={styles.secondaryActionText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function CheckoutScreen({ navigation, route }) {
  const { items, total, clearCart, updateQuantity, removeFromCart } = useCart();
  const { token } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [placed, setPlaced] = useState(null); // the order that was just placed
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [gcashAvailable, setGcashAvailable] = useState(null); // null = still checking

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

  // Is GCash switched on in the shop's settings?
  useEffect(() => {
    let stale = false;
    request(`${API.ORDERS}/orders/payment-methods`)
      .then((data) => { if (!stale) setGcashAvailable(!!(data && data.gcash)); })
      .catch(() => { if (!stale) setGcashAvailable(false); });
    return () => { stale = true; };
  }, []);

  const selected = addresses.find((a) => a.address_id === selectedId) || null;
  const lines = selected ? addressLines(selected) : null;

  // Ask the server for the shipping fee whenever the address or the cart changes
  const cartKey = items.map((i) => `${i.product.product_id}x${i.quantity}`).join(',');
  useEffect(() => {
    let stale = false;
    if (!selectedId || items.length === 0) {
      setQuote(null);
      return undefined;
    }
    setQuoting(true);
    setQuoteError('');
    request(`${API.ORDERS}/orders/quote`, {
      method: 'POST',
      token,
      body: { items: items.map((i) => ({ product_id: i.product.product_id, quantity: i.quantity })), address_id: selectedId },
    })
      .then((data) => { if (!stale) setQuote(data); })
      .catch((err) => { if (!stale) { setQuote(null); setQuoteError(err.message); } })
      .finally(() => { if (!stale) setQuoting(false); });
    return () => { stale = true; };
  }, [selectedId, token, cartKey]);

  function confirmRemove(productId) {
    Alert.alert('Remove item', 'Remove this item from your order?', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeFromCart(productId) },
    ]);
  }

  // The "-" button on the last piece asks first, so an item is not removed by accident
  function handleChangeQuantity(productId, quantity) {
    if (quantity < 1) confirmRemove(productId);
    else updateQuantity(productId, quantity);
  }

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
          payment_method: paymentMethod,
          app_return_url: appReturnLink(), // the GCash result page uses it to bring the customer back here
        },
      });

      clearCart();
      setPlaced({
        order_id: data.order_id,
        subtotal: data.subtotal,
        shipping_fee: data.shipping_fee,
        shipping_discount: data.shipping_discount,
        total_amount: data.total_amount,
        payment_method: data.payment_method,
        checkout_url: data.checkout_url,
        payment_error: data.payment_error,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function goToPlacedOrder() {
    const orderId = placed.order_id;
    setPlaced(null);
    navigation.popToTop();
    navigation.navigate('Orders', { screen: 'OrderDetail', params: { orderId }, initial: false });
  }

  // After ordering, the customer chooses: look at the order, or keep shopping
  if (placed) {
    return (
      <View style={styles.container}>
        <OrderPlacedModal
          placed={placed}
          onView={goToPlacedOrder}
          onPay={async () => {
            try {
              const result = await openCheckout(placed.checkout_url);
              // the customer came back from the payment page: show the order (it checks the payment by itself)
              if (result && result.type === 'success') goToPlacedOrder();
            } catch (err) {
              Alert.alert('Could not open GCash', 'Please open your order and try again.');
            }
          }}
          onContinue={() => {
            setPlaced(null);
            navigation.popToTop();
          }}
        />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.emptyScreen}>
        <Text style={styles.emptyScreenIcon}>🛒</Text>
        <Text style={styles.emptyScreenText}>Your order is empty.</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.popToTop()}>
          <Text style={styles.addButtonText}>Back to the shop</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Checkout</Text>

      <Text style={styles.label}>Delivery address</Text>
      {loadingAddresses ? (
        <ActivityIndicator style={{ marginVertical: 24 }} color="#fc408c" />
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

      <Text style={styles.label}>Payment method</Text>
      <PaymentOption
        selected={paymentMethod === 'cod'}
        title="Cash on Delivery"
        subtitle="Pay in cash when your order arrives"
        onPress={() => setPaymentMethod('cod')}
      />
      <PaymentOption
        selected={paymentMethod === 'gcash'}
        disabled={gcashAvailable === false}
        title="GCash"
        subtitle={gcashAvailable === false ? 'Not available right now' : 'Pay online with GCash (test mode)'}
        onPress={() => setPaymentMethod('gcash')}
      />

      <OrderSummary items={items} total={total} quote={quote} quoting={quoting} hasAddress={!!selected} onChangeQuantity={handleChangeQuantity} onRemove={confirmRemove} />

      {error || quoteError ? <Text style={styles.error}>{error || quoteError}</Text> : null}

      <TouchableOpacity
        style={[styles.placeOrderButton, (!quote || loading) && styles.placeOrderDisabled]}
        onPress={handlePlaceOrder}
        disabled={!quote || loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.placeOrderText}>Place order</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const PRIMARY = '#fc408c';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111111', marginBottom: 20 },
  label: { fontSize: 13, color: '#555', marginBottom: 6 },

  addressCard: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#ffd1e3' },
  addressTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  addressName: { fontSize: 15, fontWeight: '700', color: '#111111', flex: 1 },
  addressPhone: { fontSize: 13, color: '#666' },
  addressLine: { fontSize: 13, color: '#444', marginTop: 2 },
  addressLandmark: { fontSize: 12, color: '#888', marginTop: 4 },
  addressBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  badge: { borderRadius: 10, backgroundColor: '#ffe8f1', paddingVertical: 3, paddingHorizontal: 10 },
  badgeText: { fontSize: 11, color: PRIMARY, fontWeight: '600' },
  change: { color: PRIMARY, fontSize: 13, fontWeight: '600' },

  emptyCard: { backgroundColor: '#fff', borderRadius: 10, padding: 18, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed' },
  emptyText: { fontSize: 14, color: '#555', marginBottom: 12 },
  addButton: { backgroundColor: PRIMARY, paddingVertical: 11, paddingHorizontal: 22, borderRadius: 8 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  itemBlock: { marginBottom: 12 },
  stepperRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepButton: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  stepDisabled: { opacity: 0.35 },
  stepText: { fontSize: 17, color: '#111111', lineHeight: 20 },
  stepQty: { minWidth: 36, textAlign: 'center', fontSize: 14, fontWeight: '600', color: '#111111' },
  removeText: { fontSize: 12, color: '#e74c3c', fontWeight: '600' },
  emptyScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f5f7', padding: 24 },
  emptyScreenIcon: { fontSize: 44, marginBottom: 8 },
  emptyScreenText: { fontSize: 15, color: '#555', marginBottom: 16 },
  payOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: '#eee' },
  payOptionOn: { borderColor: PRIMARY, backgroundColor: '#fff0f6' },
  payOptionOff: { opacity: 0.5 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#bbb', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioOn: { borderColor: PRIMARY },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: PRIMARY },
  payTitle: { fontSize: 15, fontWeight: '700', color: '#111111' },
  paySubtitle: { fontSize: 12, color: '#777', marginTop: 2 },
  payProblem: { fontSize: 12, color: '#e74c3c', textAlign: 'center', marginBottom: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', backgroundColor: '#fff', borderRadius: 18, padding: 24, alignItems: 'center' },
  checkCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  checkMark: { color: '#fff', fontSize: 34, fontWeight: 'bold' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111111', textAlign: 'center' },
  modalSubtitle: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 8, marginBottom: 16, lineHeight: 19 },
  receipt: { width: '100%', backgroundColor: '#fff0f6', borderRadius: 12, padding: 14, marginBottom: 18 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  receiptLabel: { fontSize: 13, color: '#555' },
  receiptValue: { fontSize: 13, color: '#111111' },
  receiptValueBold: { fontSize: 13, color: '#111111', fontWeight: '700' },
  receiptDiscount: { fontSize: 13, color: '#27ae60', fontWeight: '600' },
  receiptDivider: { height: 1, backgroundColor: '#ffd1e3', marginVertical: 6 },
  receiptTotalLabel: { fontSize: 15, fontWeight: '700', color: '#111111' },
  receiptTotal: { fontSize: 17, fontWeight: 'bold', color: PRIMARY },
  primaryAction: { width: '100%', backgroundColor: PRIMARY, padding: 15, borderRadius: 10, alignItems: 'center' },
  primaryActionText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secondaryAction: { width: '100%', borderWidth: 1, borderColor: PRIMARY, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  secondaryActionText: { color: PRIMARY, fontSize: 15, fontWeight: '600' },
  discountValue: { fontSize: 13, color: '#27ae60', fontWeight: '600' },
  tip: { fontSize: 12, color: '#888', marginTop: 2 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 16 },
  summaryTitle: { fontSize: 14, fontWeight: '600', color: '#111111', marginBottom: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryItemName: { fontSize: 13, color: '#555', flex: 1, marginRight: 8 },
  summaryItemPrice: { fontSize: 13, color: '#111111' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 8 },
  totalLabel: { fontSize: 15, fontWeight: '600', color: '#111111' },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: PRIMARY },
  error: { color: '#e74c3c', textAlign: 'center', marginBottom: 12, fontSize: 13 },
  placeOrderButton: { backgroundColor: PRIMARY, padding: 16, borderRadius: 8, alignItems: 'center' },
  placeOrderDisabled: { backgroundColor: '#fda6c6' },
  placeOrderText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});