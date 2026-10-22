// src/screens/ProductDetailScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, ActivityIndicator, Image, FlatList, Dimensions, Modal, Linking } from 'react-native';
import API from '../api/config';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Smaller or larger copies of a Cloudinary photo (so the list loads fast)
function resizePhoto(url, size) {
  return url.indexOf('/image/upload/') === -1 ? url : url.replace('/image/upload/', `/image/upload/${size}/`);
}

// One customer review, with its photos and video
export function ReviewCard({ review, onOpenImage, onOpenVideo }) {
  const media = review.media || [];
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewerName}>{review.customer_name}</Text>
        <Text style={styles.reviewStars}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</Text>
      </View>
      {review.comment ? <Text style={styles.reviewComment}>{review.comment}</Text> : null}
      {media.length > 0 ? (
        <View style={styles.mediaRow}>
          {media.map((m, i) => (m.type === 'video' ? (
            <TouchableOpacity key={i} style={styles.videoTile} onPress={() => onOpenVideo(m.url)}>
              <Text style={styles.videoIcon}>▶</Text>
              <Text style={styles.videoLabel}>Video</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity key={i} onPress={() => onOpenImage(m.url)}>
              <Image source={{ uri: resizePhoto(m.url, 'c_fill,w_200,h_200,q_auto') }} style={styles.mediaThumb} />
            </TouchableOpacity>
          )))}
        </View>
      ) : null}
    </View>
  );
}

export default function ProductDetailScreen({ route, navigation }) {
  const { product } = route.params;
  const { addToCart } = useCart();
  const { token, customer } = useAuth();
  const [quantity, setQuantity] = useState(1);

  // BAGO: reviews
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [viewerUrl, setViewerUrl] = useState(null); // the photo opened full size

  // BAGO: gallery ng maraming larawan (harap, likod, gilid, atbp.)
  const [galleryImages, setGalleryImages] = useState([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    loadReviews();
    loadGallery();
  }, []);

  async function loadGallery() {
    try {
      const res = await fetch(`${API.PRODUCTS}/products/${product.product_id}/images`);
      const data = await res.json();
      setGalleryImages(data);
    } catch (err) {
      console.error(err);
    }
  }

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
      Alert.alert('Not enough stock', `Only ${product.stock} left.`);
      return;
    }
    addToCart(product, quantity);
    Alert.alert('Added to cart', `${quantity}x ${product.product_name}`, [
      { text: 'Continue shopping', style: 'cancel' },
      { text: 'Go to cart', onPress: () => navigation.navigate('Cart') },
    ]);
  }

  return (
    <View style={{ flex: 1 }}>
    <ScrollView style={styles.container}>
      {galleryImages.length > 0 ? (
        <View>
          <FlatList
            data={galleryImages}
            keyExtractor={item => String(item.image_id)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setActiveImageIndex(index);
            }}
            renderItem={({ item }) => (
              <Image source={{ uri: item.image_url }} style={styles.carouselImage} resizeMode="cover" />
            )}
          />
          {galleryImages.length > 1 && (
            <View style={styles.dotsRow}>
              {galleryImages.map((_, i) => (
                <View key={i} style={[styles.dot, i === activeImageIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>
      ) : product.image ? (
        <Image source={{ uri: product.image }} style={styles.imagePlaceholder} resizeMode="cover" />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imageEmoji}>🛍️</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.category}>{product.category_name || 'Uncategorized'}</Text>
        <Text style={styles.name}>{product.product_name}</Text>
        <Text style={styles.price}>₱{Number(product.price).toLocaleString()}</Text>

        <Text style={styles.stock}>
          {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
        </Text>

        <Text style={styles.descriptionLabel}>Description</Text>
        <Text style={styles.description}>{product.description || 'No description.'}</Text>

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
            <ActivityIndicator color="#fc408c" style={{ marginTop: 12 }} />
          ) : reviews.length === 0 ? (
            <Text style={styles.noReviews}>No reviews for this product yet.</Text>
          ) : (
            reviews.map(r => (
              <ReviewCard key={r.review_id} review={r} onOpenImage={setViewerUrl} onOpenVideo={(url) => Linking.openURL(url)} />
            ))
          )}

          <Text style={styles.reviewNote}>Only customers who received this product can write a review. Go to Orders to rate your purchases.</Text>
        </View>
      </View>
    </ScrollView>

      <Modal visible={!!viewerUrl} transparent animationType="fade" onRequestClose={() => setViewerUrl(null)}>
        <TouchableOpacity style={styles.viewerOverlay} activeOpacity={1} onPress={() => setViewerUrl(null)}>
          {viewerUrl ? <Image source={{ uri: resizePhoto(viewerUrl, 'w_1000,q_auto') }} style={styles.viewerImage} resizeMode="contain" /> : null}
          <Text style={styles.viewerClose}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const PRIMARY = '#fc408c';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  imagePlaceholder: { backgroundColor: '#fff0f6', height: 260, alignItems: 'center', justifyContent: 'center' },
  imageEmoji: { fontSize: 80 },
  carouselImage: { width: SCREEN_WIDTH, height: 260, backgroundColor: '#fff0f6' },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ddd' },
  dotActive: { backgroundColor: PRIMARY, width: 18 },
  content: { padding: 20 },
  category: { fontSize: 12, color: '#888', textTransform: 'uppercase', marginBottom: 4 },
  name: { fontSize: 22, fontWeight: 'bold', color: '#111111', marginBottom: 6 },
  price: { fontSize: 20, fontWeight: 'bold', color: PRIMARY, marginBottom: 8 },
  stock: { fontSize: 13, color: '#888', marginBottom: 20 },
  descriptionLabel: { fontSize: 14, fontWeight: '600', color: '#111111', marginBottom: 6 },
  description: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 24 },
  quantityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  quantityLabel: { fontSize: 14, color: '#111111', fontWeight: '600' },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qtyButton: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff0f6',
    alignItems: 'center', justifyContent: 'center',
  },
  qtyButtonText: { fontSize: 18, color: PRIMARY, fontWeight: 'bold' },
  qtyValue: { fontSize: 16, fontWeight: '600', minWidth: 24, textAlign: 'center' },
  addButton: { backgroundColor: PRIMARY, padding: 16, borderRadius: 8, alignItems: 'center' },
  addButtonDisabled: { backgroundColor: '#ccc' },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  reviewsSection: { marginTop: 32, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 20 },
  reviewsTitle: { fontSize: 16, fontWeight: '600', color: '#111111', marginBottom: 12 },
  noReviews: { fontSize: 13, color: '#888' },
  reviewCard: { backgroundColor: '#f8f8fa', borderRadius: 8, padding: 12, marginBottom: 10 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  reviewerName: { fontSize: 13, fontWeight: '600', color: '#111111' },
  reviewStars: { fontSize: 13, color: '#f4a729' },
  reviewNote: { fontSize: 12, color: '#888', marginTop: 8, textAlign: 'center' },
  mediaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  mediaThumb: { width: 72, height: 72, borderRadius: 8, backgroundColor: '#eee' },
  videoTile: { width: 72, height: 72, borderRadius: 8, backgroundColor: '#111111', alignItems: 'center', justifyContent: 'center' },
  videoIcon: { color: '#fff', fontSize: 22 },
  videoLabel: { color: '#fff', fontSize: 11, marginTop: 2 },
  viewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '80%' },
  viewerClose: { color: '#ddd', fontSize: 12, marginTop: 12 },
  reviewComment: { fontSize: 13, color: '#555' },

  writeReview: { marginTop: 16, backgroundColor: '#f8f8fa', borderRadius: 10, padding: 16 },
  writeReviewTitle: { fontSize: 14, fontWeight: '600', color: '#111111', marginBottom: 10 },
  starPicker: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  starPickerStar: { fontSize: 26, color: '#f4a729' },
  reviewInput: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, fontSize: 13, minHeight: 60, textAlignVertical: 'top', marginBottom: 12,
  },
  submitReviewButton: { backgroundColor: PRIMARY, padding: 12, borderRadius: 8, alignItems: 'center' },
  submitReviewText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});