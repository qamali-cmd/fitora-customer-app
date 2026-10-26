// src/screens/ProductDetailScreen.js
// The page of one product, like a big shopping app: photos that you can swipe and open full screen, the price with the
// rating and the sold count, the details, the ratings and reviews, "You may also like", and a bar at the bottom with
// the cart and "Add to Cart". Everything comes from what the admin set (photos, price, stock, description, reviews).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image,
  FlatList, Dimensions, Modal, Linking, Platform, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API from '../api/config';
import { useCart } from '../context/CartContext';
import { COLORS, peso } from '../theme';
import Icon from '../components/Icon';
import ProductCard from '../components/ProductCard';
import ImageViewer from '../components/ImageViewer';
import { getCatalog } from '../api/productsCache';
import { bestSellers, soldText } from '../utils/productUtils';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GALLERY = SCREEN_WIDTH;          // the photo area is a square, and the WHOLE photo is shown (it is not cut)
const SHIPPING_MIN = 1500;             // EDIT DITO: it must be the same as FREE_SHIPPING_MIN of the order service
const SHIPPING_DISCOUNT = 100;         // EDIT DITO: it must be the same as FREE_SHIPPING_MAX_DISCOUNT of the order service
const AUDIENCE_LABEL = { men: 'Men', women: 'Women', unisex: 'Everyone' };

// Smaller or larger copies of a Cloudinary photo (so the page loads fast). The photo is never cut unless "c_fill" is asked.
export function resizePhoto(url, size) {
  return typeof url === 'string' && url.indexOf('/image/upload/') !== -1 && !/\/image\/upload\/[^/]*(w_|c_|f_|q_)/.test(url)
    ? url.replace('/image/upload/', `/image/upload/${size}/`)
    : url;
}

function Stars({ rating, size = 14 }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((n) => <Icon key={n} name={n <= Math.round(rating) ? 'star' : 'star-outline'} size={size} color={n <= Math.round(rating) ? COLORS.star : '#C9C9D0'} />)}
    </View>
  );
}

const dateText = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };

// One customer review, with its photos and video
export function ReviewCard({ review, onOpenImage, onOpenVideo }) {
  const media = review.media || [];
  const name = review.customer_name || 'Customer';
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{name.trim().charAt(0).toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reviewerName} numberOfLines={1}>{name}</Text>
          <View style={styles.reviewMeta}><Stars rating={review.rating} size={12} />{dateText(review.created_at) ? <Text style={styles.reviewDate}>{dateText(review.created_at)}</Text> : null}</View>
        </View>
      </View>
      {review.comment ? <Text style={styles.reviewComment}>{review.comment}</Text> : null}
      {media.length > 0 ? (
        <View style={styles.mediaRow}>
          {media.map((m, i) => (m.type === 'video' ? (
            <TouchableOpacity key={i} style={styles.videoTile} onPress={() => onOpenVideo(m.url)} accessibilityLabel="Play the video">
              <Icon name="play-circle" size={30} color="#fff" />
              <Text style={styles.videoLabel}>Video</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity key={i} onPress={() => onOpenImage(m.url)} accessibilityLabel="Open the photo">
              <Image source={{ uri: resizePhoto(m.url, 'c_fill,w_200,h_200,q_auto') }} style={styles.mediaThumb} />
            </TouchableOpacity>
          )))}
        </View>
      ) : null}
    </View>
  );
}

export default function ProductDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets(); // ang taas ng navigation bar ng telepono (para hindi matakpan ang bar sa ilalim)
  const { product: given } = route.params;
  const { items, addToCart, itemCount } = useCart();
  const [product, setProduct] = useState(given);
  const [unavailable, setUnavailable] = useState(false);
  const [images, setImages] = useState([]);
  const [imageIndex, setImageIndex] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [related, setRelated] = useState([]);
  const [descOpen, setDescOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [viewer, setViewer] = useState({ open: false, list: [], start: 0 });
  const [solidTop, setSolidTop] = useState(false); // after the photo is scrolled away, the top buttons get a white bar
  const galleryRef = useRef(null);

  const id = given.product_id;

  useEffect(() => {
    let alive = true;
    // the newest price, stock and description (the page was opened with what the shop window knew a moment ago)
    fetch(`${API.PRODUCTS}/products/${id}`)
      .then(async (res) => ({ status: res.status, ok: res.ok, data: await res.json() }))
      .then(({ status, ok, data }) => {
        if (!alive) return;
        if (status === 404) { setUnavailable(true); return; }
        if (!ok) return;
        setProduct((old) => ({ ...old, ...data }));
        if (data.status !== 'active' || (data.approval_status && data.approval_status !== 'approved')) setUnavailable(true);
      })
      .catch(() => {});
    fetch(`${API.PRODUCTS}/products/${id}/images`).then((r) => r.json()).then((d) => { if (alive && Array.isArray(d)) setImages(d.map((x) => x.image_url).filter(Boolean)); }).catch(() => {});
    fetch(`${API.PRODUCTS}/products/${id}/reviews`).then((r) => r.json()).then((d) => { if (alive && Array.isArray(d)) setReviews(d); }).catch(() => {}).finally(() => { if (alive) setReviewsLoading(false); });
    getCatalog(false).then(({ products }) => {
      if (!alive) return;
      const others = products.filter((p) => p.product_id !== id);
      const same = others.filter((p) => p.category_id === given.category_id);
      const fill = bestSellers(others, 12).filter((p) => !same.some((s) => s.product_id === p.product_id));
      setRelated([...same, ...fill].slice(0, 10));
    }).catch(() => {});
    return () => { alive = false; };
  }, [id]);

  const photos = useMemo(() => (images.length > 0 ? images : (product.image ? [product.image] : [])), [images, product.image]);
  const stock = Number(product.stock) || 0;
  const inCart = (items.find((i) => i.product.product_id === id) || { quantity: 0 }).quantity;
  const room = Math.max(0, stock - inCart);                    // how many more can still be added
  const soldOut = stock <= 0;
  const canBuy = !unavailable && !soldOut;

  // the rating comes from the reviews that were approved (the list that was loaded is the newest)
  const total = reviews.length;
  const average = total ? reviews.reduce((s, r) => s + Number(r.rating), 0) / total : 0;
  const spread = [5, 4, 3, 2, 1].map((n) => ({ n, count: reviews.filter((r) => Number(r.rating) === n).length }));
  const sold = soldText(product);
  const longText = (product.description || '').length > 150;

  function openSheet() {
    if (!canBuy) return;
    setQuantity(1);
    setSheetOpen(true);
  }

  function confirmAdd() {
    if (quantity < 1 || quantity > room) return;
    addToCart(product, quantity);
    setSheetOpen(false);
    Alert.alert('Added to cart', `${quantity}x ${product.product_name}`, [
      { text: 'Continue shopping', style: 'cancel' },
      { text: 'Go to cart', onPress: () => navigation.navigate('Cart') },
    ]);
  }

  function scrollToPhoto(i) {
    setImageIndex(i);
    if (galleryRef.current) galleryRef.current.scrollToIndex({ index: i, animated: true });
  }

  const openViewer = (list, start) => setViewer({ open: true, list, start });

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 + insets.bottom }} scrollEventThrottle={16} onScroll={(e) => setSolidTop(e.nativeEvent.contentOffset.y > GALLERY - 110)}>
        {/* ---------- the photos ---------- */}
        <View style={styles.gallery}>
          {photos.length > 0 ? (
            <FlatList
              ref={galleryRef}
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(uri, i) => `${i}-${uri}`}
              getItemLayout={(_, i) => ({ length: GALLERY, offset: GALLERY * i, index: i })}
              onScrollToIndexFailed={() => {}}
              onScroll={(e) => setImageIndex(Math.max(0, Math.min(photos.length - 1, Math.round(e.nativeEvent.contentOffset.x / GALLERY))))}
              scrollEventThrottle={16}
              renderItem={({ item, index }) => (
                <TouchableOpacity activeOpacity={0.95} onPress={() => openViewer(photos, index)} accessibilityLabel="Open the photo full screen">
                  <Image source={{ uri: resizePhoto(item, 'w_900,q_auto,f_auto') }} style={styles.photo} resizeMode="contain" />
                </TouchableOpacity>
              )}
            />
          ) : (
            <View style={styles.noPhoto}><Icon name="image-outline" size={64} color={COLORS.primary} style={{ opacity: 0.45 }} /></View>
          )}
          {photos.length > 1 ? <View style={styles.counter}><Text style={styles.counterText}>{imageIndex + 1}/{photos.length}</Text></View> : null}
          {unavailable ? <View style={styles.unavailableBanner}><Icon name="alert-circle-outline" size={16} color="#fff" /><Text style={styles.unavailableText}>This product is no longer available</Text></View> : null}
        </View>
        {photos.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbs} contentContainerStyle={{ paddingHorizontal: 12 }}>
            {photos.map((uri, i) => (
              <TouchableOpacity key={`${i}-${uri}`} onPress={() => scrollToPhoto(i)} accessibilityLabel={`Photo ${i + 1}`} style={[styles.thumb, i === imageIndex && styles.thumbActive]}>
                <Image source={{ uri: resizePhoto(uri, 'c_fill,w_120,h_120,q_auto') }} style={styles.thumbImage} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        {/* ---------- price, name, rating, sold ---------- */}
        <View style={styles.card}>
          <Text style={styles.price}>{peso(product.price)}</Text>
          <Text style={styles.name}>{product.product_name}</Text>
          <View style={styles.statsRow}>
            {total > 0 ? <View style={styles.stat}><Icon name="star" size={14} color={COLORS.star} /><Text style={styles.statStrong}>{average.toFixed(1)}</Text><Text style={styles.statMuted}>({total})</Text></View> : <Text style={styles.statMuted}>No ratings yet</Text>}
            {sold ? <Text style={styles.statDivider}>|</Text> : null}
            {sold ? <Text style={styles.statMuted}>{sold}</Text> : null}
            <Text style={styles.statDivider}>|</Text>
            <Text style={[styles.statMuted, stock > 0 && stock <= 5 && styles.statWarn]}>{soldOut ? 'Out of stock' : stock <= 5 ? `Only ${stock} left` : `${stock} available`}</Text>
          </View>
          <View style={styles.chips}>
            {product.category_name ? (
              <TouchableOpacity style={styles.chip} onPress={() => navigation.navigate('Search', { categoryId: product.category_id })} accessibilityLabel={`Category ${product.category_name}`}>
                <Icon name="pricetag-outline" size={13} color={COLORS.primaryDark} /><Text style={styles.chipText}>{product.category_name}</Text>
              </TouchableOpacity>
            ) : null}
            <View style={styles.chip}><Icon name={product.audience === 'women' ? 'woman-outline' : product.audience === 'men' ? 'man-outline' : 'people-outline'} size={13} color={COLORS.primaryDark} /><Text style={styles.chipText}>For {AUDIENCE_LABEL[product.audience] || 'Everyone'}</Text></View>
          </View>
        </View>

        {/* ---------- shipping and payment ---------- */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Icon name="rocket-outline" size={20} color={COLORS.primary} />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Shipping</Text>
              <Text style={styles.infoBody}>The fee depends on your address and the weight of your order. Spend {peso(SHIPPING_MIN)} or more to get up to {peso(SHIPPING_DISCOUNT)} off shipping.</Text>
            </View>
          </View>
          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Icon name="wallet-outline" size={20} color={COLORS.primary} />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Payment</Text>
              <Text style={styles.infoBody}>Cash on Delivery or GCash.</Text>
            </View>
          </View>
        </View>

        {/* ---------- the details ---------- */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Product details</Text>
          <View style={styles.detailRow}><Text style={styles.detailKey}>Category</Text><Text style={styles.detailValue}>{product.category_name || 'Uncategorized'}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailKey}>For</Text><Text style={styles.detailValue}>{AUDIENCE_LABEL[product.audience] || 'Everyone'}</Text></View>
          {product.weight_grams ? <View style={styles.detailRow}><Text style={styles.detailKey}>Weight</Text><Text style={styles.detailValue}>{Number(product.weight_grams).toLocaleString()} g</Text></View> : null}
          <View style={[styles.detailRow, styles.detailRowLast]}><Text style={styles.detailKey}>Stock</Text><Text style={styles.detailValue}>{stock}</Text></View>
          <Text style={styles.sectionTitleSmall}>Description</Text>
          <Text style={styles.description} numberOfLines={longText && !descOpen ? 4 : undefined}>{product.description || 'No description.'}</Text>
          {longText ? (
            <TouchableOpacity style={styles.moreRow} onPress={() => setDescOpen((v) => !v)} accessibilityLabel={descOpen ? 'Show less' : 'Show more'}>
              <Text style={styles.moreText}>{descOpen ? 'Show less' : 'Show more'}</Text>
              <Icon name={descOpen ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.primary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ---------- ratings and reviews ---------- */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Product ratings</Text>
          {reviewsLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 12 }} />
          ) : total === 0 ? (
            <Text style={styles.noReviews}>No reviews for this product yet.</Text>
          ) : (
            <View>
              <View style={styles.summary}>
                <View style={styles.summaryLeft}>
                  <Text style={styles.summaryNumber}>{average.toFixed(1)}</Text>
                  <Stars rating={average} size={16} />
                  <Text style={styles.summaryCount}>{total} {total === 1 ? 'rating' : 'ratings'}</Text>
                </View>
                <View style={styles.summaryBars}>
                  {spread.map(({ n, count }) => (
                    <View key={n} style={styles.barRow}>
                      <Text style={styles.barLabel}>{n}</Text>
                      <Icon name="star" size={10} color={COLORS.star} />
                      <View style={styles.barTrack}><View style={[styles.barFill, { width: `${(count / total) * 100}%` }]} /></View>
                      <Text style={styles.barCount}>{count}</Text>
                    </View>
                  ))}
                </View>
              </View>
              {(showAllReviews ? reviews : reviews.slice(0, 3)).map((r) => (
                <ReviewCard key={r.review_id} review={r} onOpenImage={(url) => { const all = reviews.flatMap((x) => (x.media || []).filter((m) => m.type !== 'video').map((m) => m.url)); openViewer(all, Math.max(0, all.indexOf(url))); }} onOpenVideo={(url) => Linking.openURL(url)} />
              ))}
              {total > 3 ? (
                <TouchableOpacity style={styles.viewAll} onPress={() => setShowAllReviews((v) => !v)} accessibilityLabel={showAllReviews ? 'Show fewer reviews' : 'View all reviews'}>
                  <Text style={styles.viewAllText}>{showAllReviews ? 'Show fewer reviews' : `View all reviews (${total})`}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
          <Text style={styles.reviewNote}>Only customers who received this product can write a review. Go to Orders to rate your purchases.</Text>
        </View>

        {/* ---------- you may also like ---------- */}
        {related.length > 0 ? (
          <View style={styles.relatedBlock}>
            <View style={styles.relatedHead}><Icon name="sparkles" size={18} color={COLORS.primary} /><Text style={styles.relatedTitle}>You may also like</Text></View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={related}
              keyExtractor={(p) => String(p.product_id)}
              contentContainerStyle={{ paddingHorizontal: 12 }}
              renderItem={({ item }) => <View style={{ marginRight: 8 }}><ProductCard product={item} width={140} onPress={(p) => navigation.push ? navigation.push('ProductDetail', { product: p }) : navigation.navigate('ProductDetail', { product: p })} /></View>}
            />
          </View>
        ) : null}
      </ScrollView>

      {/* ---------- the buttons on top of the photo: back and cart ---------- */}
      <View style={[styles.floating, solidTop && styles.floatingSolid]} pointerEvents="box-none">
        <TouchableOpacity style={[styles.round, solidTop && styles.roundSolid]} onPress={() => navigation.goBack()} accessibilityLabel="Back"><Icon name="chevron-back" size={24} color={solidTop ? COLORS.ink : '#fff'} /></TouchableOpacity>
        {solidTop ? <Text style={styles.topTitle} numberOfLines={1}>{product.product_name}</Text> : null}
        <TouchableOpacity style={[styles.round, solidTop && styles.roundSolid]} onPress={() => navigation.navigate('Cart')} accessibilityLabel="Open the cart">
          <Icon name="cart-outline" size={22} color={solidTop ? COLORS.ink : '#fff'} />
          {itemCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{itemCount > 99 ? '99+' : itemCount}</Text></View> : null}
        </TouchableOpacity>
      </View>

      {/* ---------- the bar at the bottom ---------- */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(Platform.OS === 'ios' ? 26 : 12, insets.bottom + 8) }]}>
        <TouchableOpacity style={styles.cartButton} onPress={() => navigation.navigate('Cart')} accessibilityLabel="Cart">
          <Icon name="cart-outline" size={26} color={COLORS.primary} />
          {itemCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{itemCount > 99 ? '99+' : itemCount}</Text></View> : null}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.addButton, !canBuy && styles.addButtonOff]} onPress={openSheet} disabled={!canBuy} accessibilityLabel="Add to Cart">
          <Icon name="cart" size={18} color="#fff" />
          <Text style={styles.addButtonText}>{unavailable ? 'Not available' : soldOut ? 'Out of stock' : 'Add to Cart'}</Text>
        </TouchableOpacity>
      </View>

      {/* ---------- choose how many ---------- */}
      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayTop} activeOpacity={1} onPress={() => setSheetOpen(false)} accessibilityLabel="Close" />
          <View style={[styles.sheet, { paddingBottom: Math.max(24, insets.bottom + 14) }]}>
            <View style={styles.sheetHead}>
              {photos[0] ? <Image source={{ uri: resizePhoto(photos[0], 'c_fill,w_200,h_200,q_auto') }} style={styles.sheetThumb} /> : <View style={[styles.sheetThumb, styles.sheetThumbEmpty]}><Icon name="image-outline" size={26} color={COLORS.primary} /></View>}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.sheetPrice}>{peso(product.price)}</Text>
                <Text style={styles.sheetStock}>Stock: {stock}</Text>
              </View>
              <TouchableOpacity onPress={() => setSheetOpen(false)} accessibilityLabel="Close the window"><Icon name="close" size={22} color={COLORS.muted} /></TouchableOpacity>
            </View>
            <View style={styles.qtyRow}>
              <Text style={styles.qtyLabel}>Quantity</Text>
              <View style={styles.qtyControls}>
                <TouchableOpacity style={[styles.qtyButton, quantity <= 1 && styles.qtyButtonOff]} onPress={() => setQuantity((q) => Math.max(1, q - 1))} accessibilityLabel="Less"><Icon name="remove" size={18} color={COLORS.primary} /></TouchableOpacity>
                <Text style={styles.qtyValue}>{quantity}</Text>
                <TouchableOpacity style={[styles.qtyButton, quantity >= room && styles.qtyButtonOff]} onPress={() => setQuantity((q) => Math.min(room, q + 1))} accessibilityLabel="More"><Icon name="add" size={18} color={COLORS.primary} /></TouchableOpacity>
              </View>
            </View>
            {inCart > 0 ? <Text style={styles.sheetNote}>{room > 0 ? `You already have ${inCart} in your cart. You can add ${room} more.` : `You already have all ${inCart} available in your cart.`}</Text> : null}
            {quantity >= room && room > 0 ? <Text style={styles.sheetNote}>That is all that is in stock.</Text> : null}
            <TouchableOpacity style={[styles.confirm, room < 1 && styles.addButtonOff]} onPress={confirmAdd} disabled={room < 1} accessibilityLabel="Confirm add to cart">
              <Text style={styles.confirmText}>{room < 1 ? 'Nothing more to add' : 'Add to Cart'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ImageViewer visible={viewer.open} images={viewer.list} startIndex={viewer.start} onClose={() => setViewer((v) => ({ ...v, open: false }))} />
    </View>
  );
}

const TOP = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 6 : Platform.OS === 'ios' ? 50 : 14;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  gallery: { width: GALLERY, height: GALLERY, backgroundColor: '#fff' },
  photo: { width: GALLERY, height: GALLERY, backgroundColor: '#fff' },
  noPhoto: { width: GALLERY, height: GALLERY, backgroundColor: COLORS.primaryTint, alignItems: 'center', justifyContent: 'center' },
  counter: { position: 'absolute', right: 12, bottom: 12, backgroundColor: 'rgba(17,17,17,0.7)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  counterText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  unavailableBanner: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(229,88,74,0.95)', paddingVertical: 8 },
  unavailableText: { color: '#fff', fontWeight: '700', fontSize: 13, marginLeft: 6 },
  thumbs: { backgroundColor: '#fff', paddingVertical: 10, maxHeight: 74 },
  thumb: { width: 54, height: 54, borderRadius: 8, borderWidth: 2, borderColor: 'transparent', marginRight: 8, overflow: 'hidden' },
  thumbActive: { borderColor: COLORS.primary },
  thumbImage: { width: 50, height: 50 },

  card: { backgroundColor: '#fff', marginTop: 8, padding: 14 },
  price: { fontSize: 26, fontWeight: '800', color: COLORS.primary },
  name: { fontSize: 17, fontWeight: '700', color: COLORS.ink, marginTop: 6, lineHeight: 23 },
  statsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 10 },
  stat: { flexDirection: 'row', alignItems: 'center' },
  statStrong: { fontSize: 13, fontWeight: '800', color: COLORS.ink, marginLeft: 3 },
  statMuted: { fontSize: 13, color: COLORS.muted, marginLeft: 3 },
  statWarn: { color: COLORS.danger, fontWeight: '700' },
  statDivider: { color: '#d4d4da', marginHorizontal: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryTint, borderRadius: 14, borderWidth: 1, borderColor: '#ffd1e3', paddingHorizontal: 10, paddingVertical: 5, marginRight: 8, marginBottom: 4 },
  chipText: { color: COLORS.primaryDark, fontSize: 12, fontWeight: '700', marginLeft: 5 },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingBottom: 12, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  infoRowLast: { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0 },
  infoText: { flex: 1, marginLeft: 12 },
  infoTitle: { fontSize: 14, fontWeight: '800', color: COLORS.ink },
  infoBody: { fontSize: 13, color: COLORS.muted, marginTop: 2, lineHeight: 19 },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink, marginBottom: 10 },
  sectionTitleSmall: { fontSize: 14, fontWeight: '800', color: COLORS.ink, marginTop: 14, marginBottom: 6 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  detailRowLast: { borderBottomWidth: 0 },
  detailKey: { fontSize: 13, color: COLORS.muted },
  detailValue: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  description: { fontSize: 14, color: '#555', lineHeight: 21 },
  moreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 10 },
  moreText: { color: COLORS.primary, fontWeight: '700', fontSize: 13, marginRight: 4 },

  noReviews: { color: COLORS.muted, fontSize: 13, marginTop: 4 },
  summary: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  summaryLeft: { alignItems: 'center', width: 112 },
  summaryNumber: { fontSize: 36, fontWeight: '800', color: COLORS.ink },
  summaryCount: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  summaryBars: { flex: 1, marginLeft: 8 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  barLabel: { width: 12, fontSize: 11, color: COLORS.muted, textAlign: 'right', marginRight: 3 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: COLORS.line, marginHorizontal: 6, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: COLORS.star },
  barCount: { width: 24, fontSize: 11, color: COLORS.muted },
  starsRow: { flexDirection: 'row', alignItems: 'center' },
  reviewCard: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.line },
  reviewHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { color: COLORS.primaryDark, fontWeight: '800', fontSize: 14 },
  reviewerName: { fontSize: 13, fontWeight: '700', color: COLORS.ink },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  reviewDate: { fontSize: 11, color: COLORS.muted, marginLeft: 8 },
  reviewComment: { fontSize: 13, color: COLORS.text, lineHeight: 19, marginTop: 8 },
  mediaRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  mediaThumb: { width: 70, height: 70, borderRadius: 8, marginRight: 6, marginBottom: 6, backgroundColor: COLORS.primaryTint },
  videoTile: { width: 70, height: 70, borderRadius: 8, marginRight: 6, backgroundColor: COLORS.ink, alignItems: 'center', justifyContent: 'center' },
  videoLabel: { color: '#fff', fontSize: 10, marginTop: 2 },
  viewAll: { alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.line },
  viewAllText: { color: COLORS.primary, fontWeight: '800', fontSize: 13 },
  reviewNote: { fontSize: 11, color: COLORS.muted, marginTop: 12, lineHeight: 16 },

  relatedBlock: { marginTop: 8, paddingVertical: 12, backgroundColor: COLORS.bg },
  relatedHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 10 },
  relatedTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink, marginLeft: 6 },

  floating: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: TOP, paddingBottom: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  floatingSolid: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.line, elevation: 4 },
  round: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(17,17,17,0.55)', alignItems: 'center', justifyContent: 'center' },
  roundSolid: { backgroundColor: COLORS.bg },
  topTitle: { flex: 1, marginHorizontal: 10, fontSize: 15, fontWeight: '700', color: COLORS.ink },
  badge: { position: 'absolute', top: -2, right: -3, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: '#fff' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: COLORS.line, paddingHorizontal: 12, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 26 : 12 },
  cartButton: { width: 52, height: 48, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  addButton: { flex: 1, height: 48, borderRadius: 24, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  addButtonOff: { backgroundColor: '#c9c9d0', shadowOpacity: 0, elevation: 0 },
  addButtonText: { color: '#fff', fontWeight: '800', fontSize: 16, marginLeft: 8 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  overlayTop: { flex: 1 },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, paddingBottom: 24 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  sheetThumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: COLORS.primaryTint },
  sheetThumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  sheetPrice: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  sheetStock: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  qtyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  qtyLabel: { fontSize: 15, fontWeight: '700', color: COLORS.ink },
  qtyControls: { flexDirection: 'row', alignItems: 'center' },
  qtyButton: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  qtyButtonOff: { borderColor: COLORS.line, opacity: 0.45 },
  qtyValue: { minWidth: 44, textAlign: 'center', fontSize: 17, fontWeight: '800', color: COLORS.ink },
  sheetNote: { fontSize: 12, color: COLORS.muted, marginBottom: 8, lineHeight: 17 },
  confirm: { height: 48, borderRadius: 24, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  confirmText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});