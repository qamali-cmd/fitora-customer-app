// src/screens/ProductDetailScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, ActivityIndicator } from 'react-native';
import API from '../api/config';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function ProductDetailScreen({ route, navigation }) {
  const { product } = route.params;
  const { addToCart } = useCart();
  const { token, customer } = useAuth();
  const [quantity, setQuantity] = useState(1);

  // BAGO: reviews
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [myRating, setMyRating] = useState(5);
  const [myComment, setMyComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    loadReviews();
  }, []);

  async function loadReviews() {
    try {
      const res = await fetch(`${API.PRODUCTS}/products/${product.product_id}/reviews`);
      const data = await res.json();
      setReviews(data);
    } catch (err) {
      console.error(err);
    } finally {
      setReviewsLoading(false);
    }
  }

  function handleAddToCart() {
    if (product.stock < quantity) {
      Alert.alert('Kulang ang stock', `${product.stock} na lang ang natitira.`);
      return;
    }
    addToCart(product, quantity);
    Alert.alert('Nadagdag sa cart', `${quantity}x ${product.product_name}`, [
      { text: 'Magpatuloy mamili', style: 'cancel' },
      { text: 'Pumunta sa Cart', onPress: () => navigation.navigate('Cart') },
    ]);
  }

  async function handleSubmitReview() {
    setSubmitting(true);
    try {
      const res = await fetch(`${API.PRODUCTS}/products/${product.product_id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating: myRating, comment: myComment.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        Alert.alert('Error', data.error || 'Hindi ma-submit ang review.');
        return;
      }
      setReviewSubmitted(true);
      setMyComment('');
      Alert.alert('Salamat!', 'Nai-submit na ang review mo, hihintayin lang ang approval ng admin.');
    } catch (err) {
      Alert.alert('Error', 'Hindi ma-reach ang server.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.imagePlaceholder}>
        <Text style={styles.imageEmoji}>🛍️</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.category}>{product.category_name || 'Uncategorized'}</Text>
        <Text style={styles.name}>{product.product_name}</Text>
        <Text style={styles.price}>₱{Number(product.price).toLocaleString()}</Text>

        <Text style={styles.stock}>
          {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
        </Text>

        <Text style={styles.descriptionLabel}>Description</Text>
        <Text style={styles.description}>{product.description || 'Walang description.'}</Text>

        <View style={styles.quantityRow}>
          <Text style={styles.quantityLabel}>Quantity</Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity style={styles.qtyButton} onPress={() => setQuantity(q => Math.max(1, q - 1))}>
              <Text style={styles.qtyButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{quantity}</Text>
            <TouchableOpacity style={styles.qtyButton} onPress={() => setQuantity(q => q + 1)}>
              <Text style={styles.qtyButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.addButton, product.stock === 0 && styles.addButtonDisabled]}
          onPress={handleAddToCart}
          disabled={product.stock === 0}
        >
          <Text style={styles.addButtonText}>
            {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </Text>
        </TouchableOpacity>

        {/* ---------------- REVIEWS SECTION ---------------- */}
        <View style={styles.reviewsSection}>
          <Text style={styles.reviewsTitle}>Reviews ({reviews.length})</Text>

          {reviewsLoading ? (
            <ActivityIndicator color="#6C5CE7" style={{ marginTop: 12 }} />
          ) : reviews.length === 0 ? (
            <Text style={styles.noReviews}>Wala pang review sa product na ito.</Text>
          ) : (
            reviews.map(r => (
              <View key={r.review_id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>{r.customer_name}</Text>
                  <Text style={styles.reviewStars}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
                </View>
                {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
              </View>
            ))
          )}

          {/* Form para makapag-submit ng review (kailangan naka-login) */}
          {customer && !reviewSubmitted && (
            <View style={styles.writeReview}>
              <Text style={styles.writeReviewTitle}>Mag-iwan ng review</Text>
              <View style={styles.starPicker}>
                {[1, 2, 3, 4, 5].map(n => (
                  <TouchableOpacity key={n} onPress={() => setMyRating(n)}>
                    <Text style={styles.starPickerStar}>{n <= myRating ? '★' : '☆'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.reviewInput}
                placeholder="Ano ang masasabi mo tungkol sa product na ito?"
                value={myComment}
                onChangeText={setMyComment}
                multiline
              />
              <TouchableOpacity style={styles.submitReviewButton} onPress={handleSubmitReview} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitReviewText}>Submit review</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const PRIMARY = '#6C5CE7';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  imagePlaceholder: { backgroundColor: '#f0eefc', height: 260, alignItems: 'center', justifyContent: 'center' },
  imageEmoji: { fontSize: 80 },
  content: { padding: 20 },
  category: { fontSize: 12, color: '#888', textTransform: 'uppercase', marginBottom: 4 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#2B2140', marginBottom: 6 },
  price: { fontSize: 20, fontWeight: 'bold', color: PRIMARY, marginBottom: 8 },
  stock: { fontSize: 13, color: '#888', marginBottom: 20 },
  descriptionLabel: { fontSize: 14, fontWeight: '600', color: '#2B2140', marginBottom: 6 },
  description: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 24 },
  quantityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  quantityLabel: { fontSize: 14, color: '#2B2140', fontWeight: '600' },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qtyButton: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0eefc',
    alignItems: 'center', justifyContent: 'center',
  },
  qtyButtonText: { fontSize: 18, color: PRIMARY, fontWeight: 'bold' },
  qtyValue: { fontSize: 16, fontWeight: '600', minWidth: 24, textAlign: 'center' },
  addButton: { backgroundColor: PRIMARY, padding: 16, borderRadius: 8, alignItems: 'center' },
  addButtonDisabled: { backgroundColor: '#ccc' },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  reviewsSection: { marginTop: 32, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 20 },
  reviewsTitle: { fontSize: 16, fontWeight: '600', color: '#2B2140', marginBottom: 12 },
  noReviews: { fontSize: 13, color: '#888' },
  reviewCard: { backgroundColor: '#f8f8fa', borderRadius: 8, padding: 12, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  reviewerName: { fontSize: 13, fontWeight: '600', color: '#2B2140' },
  reviewStars: { fontSize: 13, color: '#f4a729' },
  reviewComment: { fontSize: 13, color: '#555' },

  writeReview: { marginTop: 16, backgroundColor: '#f8f8fa', borderRadius: 10, padding: 16 },
  writeReviewTitle: { fontSize: 14, fontWeight: '600', color: '#2B2140', marginBottom: 10 },
  starPicker: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  starPickerStar: { fontSize: 26, color: '#f4a729' },
  reviewInput: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, fontSize: 13, minHeight: 60, textAlignVertical: 'top', marginBottom: 12,
  },
  submitReviewButton: { backgroundColor: PRIMARY, padding: 12, borderRadius: 8, alignItems: 'center' },
  submitReviewText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});