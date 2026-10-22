// src/screens/HomeScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import API from '../api/config';
import { useCart } from '../context/CartContext';

const AUDIENCE_TABS = [['all', 'All'], ['men', 'Men'], ['women', 'Women']];

// "Men" shows the products for men and the unisex ones; "Women" the same for women
export function filterByAudience(products, audience) {
  if (audience === 'men' || audience === 'women') {
    return products.filter((p) => !p.audience || p.audience === audience || p.audience === 'unisex');
  }
  return products;
}

export default function HomeScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [audience, setAudience] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { itemCount } = useCart();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch(`${API.PRODUCTS}/products`).then(r => r.json()),
        fetch(`${API.PRODUCTS}/categories`).then(r => r.json()),
      ]);
      setProducts(productsRes.filter(p => p.status === 'active'));
      setCategories(categoriesRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const filteredProducts = filterByAudience(products, audience).filter(p => {
    const matchesSearch = !search || p.product_name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <View style={styles.container}>
      {/* EDIT DITO: pangalan ng company sa header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image source={require('../../assets/logo.png')} style={styles.headerLogo} />
          <Text style={styles.headerTitle}>Fitora Gear</Text>
        </View>
        <TouchableOpacity style={styles.cartButton} onPress={() => navigation.navigate('Cart')}>
          <Text style={styles.cartIcon}>🛒</Text>
          {itemCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{itemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search products..."
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.audienceRow}>
        {AUDIENCE_TABS.map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.audienceTab, audience === key && styles.audienceTabActive]} onPress={() => setAudience(key)}>
            <Text style={[styles.audienceText, audience === key && styles.audienceTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryList}
        data={[{ category_id: 'all', category_name: 'All' }, ...categories]}
        keyExtractor={item => String(item.category_id)}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.categoryChip, selectedCategory === item.category_id && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(item.category_id)}
          >
            <Text style={[styles.categoryChipText, selectedCategory === item.category_id && styles.categoryChipTextActive]}>
              {item.category_name}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#fc408c" />
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={item => String(item.product_id)}
          numColumns={2}
          contentContainerStyle={styles.productGrid}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.productCard}
              onPress={() => navigation.navigate('ProductDetail', { product: item })}
            >
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.productImagePlaceholder} resizeMode="cover" />
              ) : (
                <View style={styles.productImagePlaceholder}>
                  <Text style={styles.productImageEmoji}>🛍️</Text>
                </View>
              )}
              <Text style={styles.productName} numberOfLines={2}>{item.product_name}</Text>
              <Text style={styles.productPrice}>₱{Number(item.price).toLocaleString()}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No matching products.</Text>}
        />
      )}
    </View>
  );
}

const PRIMARY = '#fc408c';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7', paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { width: 34, height: 34, marginRight: 10 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#111111' },
  cartButton: { padding: 6 },
  cartIcon: { fontSize: 24 },
  cartBadge: {
    position: 'absolute', top: 0, right: 0, backgroundColor: '#e74c3c',
    borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  searchInput: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, marginHorizontal: 16, marginBottom: 12, fontSize: 14,
  },
  audienceRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, padding: 4, borderRadius: 14, backgroundColor: '#ececf0' },
  audienceTab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 11 },
  audienceTabActive: { backgroundColor: PRIMARY },
  audienceText: { fontSize: 14, fontWeight: '600', color: '#666' },
  audienceTextActive: { color: '#fff' },
  categoryList: { flexGrow: 0, marginBottom: 12, paddingLeft: 16 },
  categoryChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', marginRight: 8,
  },
  categoryChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  categoryChipText: { fontSize: 13, color: '#555' },
  categoryChipTextActive: { color: '#fff', fontWeight: '600' },
  productGrid: { paddingHorizontal: 8 },
  productCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, margin: 8, maxWidth: '46%',
  },
  productImagePlaceholder: {
    backgroundColor: '#fff0f6', borderRadius: 8, height: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  productImageEmoji: { fontSize: 32 },
  productName: { fontSize: 13, color: '#111111', marginBottom: 4, minHeight: 34 },
  productPrice: { fontSize: 14, fontWeight: 'bold', color: PRIMARY },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 40 },
});