// src/components/ProductCard.js
// One product in the shop window (Home and Search): the picture, the name, the price, the rating and how many were sold.
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, peso } from '../theme';
import Icon from './Icon';
import { thumb, isNew, soldText, ratingText } from '../utils/productUtils';

export default function ProductCard({ product, width, onPress }) {
  const stock = Number(product.stock) || 0;
  const soldOut = stock <= 0;
  const rating = ratingText(product);
  const sold = soldText(product);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={[styles.card, { width }]}
      onPress={() => onPress && onPress(product)}
      accessibilityLabel={product.product_name}
      testID={`product-${product.product_id}`}
    >
      <View style={[styles.imageBox, { width, height: width }]}>
        {product.image ? (
          <Image source={{ uri: thumb(product.image, 400) }} style={{ width, height: width }} resizeMode="cover" />
        ) : (
          <View style={styles.noImage}><Icon name="image-outline" size={46} color={COLORS.primary} style={{ opacity: 0.45 }} /></View>
        )}
        {isNew(product) && !soldOut ? <View style={styles.newTag}><Icon name="flash" size={10} color="#fff" /><Text style={styles.newTagText}>NEW</Text></View> : null}
        {!soldOut && stock <= 5 ? <View style={styles.leftTag}><Icon name="flame" size={12} color="#fff" /><Text style={styles.leftTagText}>Only {stock} left</Text></View> : null}
        {soldOut ? <View style={styles.soldOut}><Icon name="close-circle-outline" size={32} color="#fff" /><Text style={styles.soldOutText}>Sold out</Text></View> : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>{product.product_name}</Text>
        <Text style={styles.price}>{peso(product.price)}</Text>
        {rating || sold ? (
          <View style={styles.meta}>
            {rating ? <View style={styles.ratingRow}><Icon name="star" size={11} color={COLORS.star} /><Text style={styles.rating}>{rating}</Text></View> : null}
            {rating && sold ? <Text style={styles.dot}>·</Text> : null}
            {sold ? <Text style={styles.sold}>{sold}</Text> : null}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderRadius: 12, overflow: 'hidden', marginBottom: 8, borderWidth: 1, borderColor: '#f1e4ea' },
  imageBox: { backgroundColor: COLORS.primaryTint, overflow: 'hidden' },
  noImage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  newTag: { position: 'absolute', top: 0, left: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 7, paddingVertical: 3, borderBottomRightRadius: 10 },
  newTagText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.4, marginLeft: 2 },
  leftTag: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(17,17,17,0.82)', paddingVertical: 4 },
  leftTagText: { color: '#fff', fontSize: 11, fontWeight: '700', marginLeft: 4 },
  soldOut: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  soldOutText: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.5, marginTop: 2 },
  body: { padding: 8 },
  name: { fontSize: 13, color: COLORS.text, lineHeight: 17, minHeight: 34 },
  price: { fontSize: 16, fontWeight: '800', color: COLORS.primary, marginTop: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  rating: { fontSize: 11, color: COLORS.text, fontWeight: '700', marginLeft: 2 },
  dot: { fontSize: 11, color: COLORS.muted, marginHorizontal: 5 },
  sold: { fontSize: 11, color: COLORS.muted },
});