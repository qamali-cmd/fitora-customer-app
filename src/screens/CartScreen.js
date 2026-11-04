// src/screens/CartScreen.js
// The cart: each item shows the photo of the product, its name, its price, and the buttons for the quantity and for removing it.
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Platform, StatusBar } from 'react-native';
import { useCart } from '../context/CartContext';
import { COLORS, peso } from '../theme';
import Icon from '../components/Icon';
import { thumb } from '../utils/productUtils';

// the photo of a product in the cart (the first photo; it can be saved as a link or as an object)
function photoOf(product) {
  if (product.image) return product.image;
  const first = Array.isArray(product.images) ? product.images[0] : null;
  if (!first) return null;
  return typeof first === 'string' ? first : first.image_url || first.url || null;
}

export default function CartScreen({ navigation }) {
  const { items, updateQuantity, removeFromCart, total } = useCart();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your cart</Text>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.product.product_id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const { product } = item;
          const uri = photoOf(product);
          return (
            <View style={styles.cartItem}>
              {uri ? (
                <Image source={{ uri: thumb(uri, 200) }} style={styles.itemImage} resizeMode="cover" />
              ) : (
                <View style={[styles.itemImage, styles.itemImageEmpty]}>
                  <Icon name="image-outline" size={24} color={COLORS.primary} style={{ opacity: 0.5 }} />
                </View>
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{product.product_name}</Text>
                <Text style={styles.itemPrice}>{peso(product.price)}</Text>
                <View style={styles.bottomRow}>
                  <View style={styles.qtyControls}>
                    <TouchableOpacity style={styles.qtyButton} onPress={() => updateQuantity(product.product_id, item.quantity - 1)} accessibilityLabel={`Fewer ${product.product_name}`}>
                      <Text style={styles.qtyButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <TouchableOpacity style={styles.qtyButton} onPress={() => updateQuantity(product.product_id, item.quantity + 1)} accessibilityLabel={`More ${product.product_name}`}>
                      <Text style={styles.qtyButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => removeFromCart(product.product_id)} accessibilityLabel={`Remove ${product.product_name}`}>
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyCircle}><Icon name="cart-outline" size={42} color={COLORS.primary} /></View>
            <Text style={styles.emptyText}>Your cart is empty. Start browsing!</Text>
          </View>
        }
      />

      {items.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{peso(total)}</Text>
          </View>
          <TouchableOpacity style={styles.checkoutButton} onPress={() => navigation.navigate('Checkout')} accessibilityLabel="Proceed to Checkout">
            <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const TOP = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : Platform.OS === 'ios' ? 54 : 14;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingTop: TOP },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.ink, paddingHorizontal: 16, marginBottom: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  cartItem: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#f1e4ea' },
  itemImage: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#f2f2f2', marginRight: 12 },
  itemImageEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryTint },
  itemInfo: { flex: 1, justifyContent: 'space-between' },
  itemName: { fontSize: 14, color: COLORS.ink, fontWeight: '600', lineHeight: 19 },
  itemPrice: { fontSize: 15, color: COLORS.primary, fontWeight: '800', marginTop: 2 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  qtyControls: { flexDirection: 'row', alignItems: 'center' },
  qtyButton: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  qtyButtonText: { fontSize: 16, color: COLORS.primary, fontWeight: '800' },
  qtyValue: { fontSize: 15, fontWeight: '700', minWidth: 30, textAlign: 'center', color: COLORS.ink },
  removeText: { fontSize: 13, color: COLORS.danger, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 70, paddingHorizontal: 32 },
  emptyCircle: { width: 92, height: 92, borderRadius: 46, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center' },
  emptyText: { textAlign: 'center', color: COLORS.muted, marginTop: 14, fontSize: 14 },
  footer: { backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: COLORS.line },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  totalLabel: { fontSize: 16, color: COLORS.ink },
  totalValue: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  checkoutButton: { backgroundColor: COLORS.primary, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  checkoutButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});