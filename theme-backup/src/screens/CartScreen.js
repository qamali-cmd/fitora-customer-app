// src/screens/CartScreen.js
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useCart } from '../context/CartContext';

export default function CartScreen({ navigation }) {
  const { items, updateQuantity, removeFromCart, total } = useCart();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your cart</Text>

      <FlatList
        data={items}
        keyExtractor={item => String(item.product.product_id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.cartItem}>
            <View style={styles.itemImagePlaceholder}>
              <Text style={{ fontSize: 20 }}>🛍️</Text>
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={1}>{item.product.product_name}</Text>
              <Text style={styles.itemPrice}>₱{Number(item.product.price).toLocaleString()}</Text>
            </View>
            <View style={styles.qtyControls}>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => updateQuantity(item.product.product_id, item.quantity - 1)}
              >
                <Text style={styles.qtyButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{item.quantity}</Text>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => updateQuantity(item.product.product_id, item.quantity + 1)}
              >
                <Text style={styles.qtyButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => removeFromCart(item.product.product_id)}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Your cart is empty. Start browsing!</Text>
        }
      />

      {items.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₱{total.toLocaleString()}</Text>
          </View>
          <TouchableOpacity style={styles.checkoutButton} onPress={() => navigation.navigate('Checkout')}>
            <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const PRIMARY = '#6C5CE7';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7', paddingTop: 50 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#2B2140', paddingHorizontal: 16, marginBottom: 12 },
  list: { paddingHorizontal: 16 },
  cartItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 10, padding: 12, marginBottom: 10,
  },
  itemImagePlaceholder: {
    width: 44, height: 44, borderRadius: 8, backgroundColor: '#f0eefc',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, color: '#2B2140', marginBottom: 2 },
  itemPrice: { fontSize: 13, color: PRIMARY, fontWeight: '600' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  qtyButton: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#f0eefc',
    alignItems: 'center', justifyContent: 'center',
  },
  qtyButtonText: { fontSize: 15, color: PRIMARY, fontWeight: 'bold' },
  qtyValue: { fontSize: 14, fontWeight: '600', minWidth: 22, textAlign: 'center' },
  removeText: { fontSize: 12, color: '#e74c3c' },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 60, paddingHorizontal: 32 },
  footer: { backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#eee' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  totalLabel: { fontSize: 16, color: '#2B2140' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: PRIMARY },
  checkoutButton: { backgroundColor: PRIMARY, padding: 16, borderRadius: 8, alignItems: 'center' },
  checkoutButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});