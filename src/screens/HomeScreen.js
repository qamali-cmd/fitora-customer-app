// src/screens/HomeScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import API from '../api/config';
import { useCart } from '../context/CartContext';

export default function HomeScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
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

  const filteredProducts = products.filter(p => {
    const matchesSearch = !search || p.product_name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <View style={styles.container}>
      {/* EDIT DITO: pangalan ng company sa header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fitora Gear</Text>
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
        placeholder="Maghanap ng product..."
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryList}
        data={[{ category_id: 'all', category_name: 'Lahat' }, ...categories]}
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
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#6C5CE7" />
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
          ListEmptyComponent={<Text style={styles.emptyText}>Walang product na tumugma.</Text>}
        />
      )}
    </View>
  );
}

const PRIMARY = '#6C5CE7';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f5f7', paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#2B2140' },
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
    backgroundColor: '#f0eefc', borderRadius: 8, height: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  productImageEmoji: { fontSize: 32 },
  productName: { fontSize: 13, color: '#2B2140', marginBottom: 4, minHeight: 34 },
  productPrice: { fontSize: 14, fontWeight: 'bold', color: PRIMARY },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 40 },
});