// src/screens/HomeScreen.js
// The shop window, like a big shopping app: a search bar and the cart on top (they never move), then the banners,
// the categories, the best sellers, and "Daily Discover", the grid of all the products.
// Everything comes from what the admin sets: products, categories, stock, who a product is for, and the real
// numbers of sold items and ratings. The banners are made from the shop's own products.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, FlatList, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Image, Dimensions, Platform, StatusBar,
} from 'react-native';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { COLORS } from '../theme';
import Icon from '../components/Icon';
import ProductCard from '../components/ProductCard';
import { getCatalog } from '../api/productsCache';
import { filterByAudience, sortProducts, buildBanners, bestSellers, categoryIcon } from '../utils/productUtils';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SIDE = 12;
const GAP = 8;
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - SIDE * 2 - GAP) / 2);
const PAGE_SIZE = 20; // the grid shows 20 more every time the customer reaches the bottom
// The quick buttons under the greeting: each one opens the Search already set to that choice
const QUICK = [
  { label: 'Best sellers', icon: 'flame', params: { sort: 'sales' } },
  { label: 'New', icon: 'sparkles', params: { sort: 'latest' } },
  { label: 'Men', icon: 'man-outline', params: { audience: 'men' } },
  { label: 'Women', icon: 'woman-outline', params: { audience: 'women' } },
  { label: 'Under \u20B1500', icon: 'pricetag-outline', params: { maxPrice: '500', sort: 'price_asc' } },
];
const AUDIENCE_TABS = [['all', 'All', 'apps-outline'], ['men', 'Men', 'man-outline'], ['women', 'Women', 'woman-outline']];
const TONES = {
  pink: { bg: COLORS.primary, title: '#fff', sub: 'rgba(255,255,255,0.92)', pill: '#fff', pillText: COLORS.primaryDark, icon: '#fff', ring: 'rgba(255,255,255,0.38)', fill: 'rgba(255,255,255,0.18)' },
  ink: { bg: COLORS.ink, title: '#fff', sub: 'rgba(255,255,255,0.85)', pill: COLORS.primary, pillText: '#fff', icon: COLORS.primary, ring: 'rgba(252,64,140,0.55)', fill: 'rgba(252,64,140,0.16)' },
  rose: { bg: COLORS.primaryDark, title: '#fff', sub: 'rgba(255,255,255,0.92)', pill: '#fff', pillText: COLORS.primaryDark, icon: '#fff', ring: 'rgba(255,255,255,0.38)', fill: 'rgba(255,255,255,0.18)' },
  soft: { bg: COLORS.primarySoft, title: COLORS.primaryDark, sub: '#7a3550', pill: COLORS.primary, pillText: '#fff', icon: COLORS.primary, ring: 'rgba(252,64,140,0.35)', fill: 'rgba(252,64,140,0.12)' },
};

function BannerCarousel({ banners, onPress }) {
  const width = SCREEN_WIDTH - SIDE * 2;
  const listRef = useRef(null);
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);

  // the banners move by themselves every few seconds
  useEffect(() => {
    if (banners.length < 2) return undefined;
    const timer = setInterval(() => {
      const next = (indexRef.current + 1) % banners.length;
      indexRef.current = next;
      setIndex(next);
      if (listRef.current) listRef.current.scrollToIndex({ index: next, animated: true });
    }, 4500);
    return () => clearInterval(timer);
  }, [banners.length]);

  return (
    <View style={styles.bannerWrap}>
      <FlatList
        ref={listRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={banners}
        keyExtractor={(b) => b.key}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onScrollToIndexFailed={() => {}}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          indexRef.current = i;
          setIndex(i);
        }}
        renderItem={({ item }) => {
          const tone = TONES[item.tone] || TONES.pink;
          return (
            <TouchableOpacity activeOpacity={0.92} style={[styles.banner, { width, backgroundColor: tone.bg }]} onPress={() => onPress(item)} accessibilityLabel={item.title}>
              <View style={styles.bannerText}>
                <Text style={[styles.bannerTitle, { color: tone.title }]}>{item.title}</Text>
                <Text style={[styles.bannerSub, { color: tone.sub }]} numberOfLines={2}>{item.subtitle}</Text>
                <View style={[styles.bannerPill, { backgroundColor: tone.pill }]}><Text style={[styles.bannerPillText, { color: tone.pillText }]}>Shop now</Text><Icon name="arrow-forward" size={12} color={tone.pillText} style={{ marginLeft: 4 }} /></View>
              </View>
              <View style={[styles.bannerRing, { borderColor: tone.ring }]}>
                <View style={[styles.bannerDisc, { backgroundColor: tone.fill }]}><Icon name={item.icon} size={46} color={tone.icon} /></View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
      {banners.length > 1 ? (
        <View style={styles.dots}>
          {banners.map((b, i) => <View key={b.key} style={[styles.dot, i === index && styles.dotActive]} />)}
        </View>
      ) : null}
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const [catalog, setCatalog] = useState({ products: [], categories: [] });
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [refreshing, setRefreshing] = useState(false);
  const [audience, setAudience] = useState('all');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const { itemCount } = useCart();
  const auth = useAuth();
  const customer = auth && auth.customer;
  const notifications = useNotifications();
  const unread = (notifications && notifications.unreadCount) || 0;
  const [hintIndex, setHintIndex] = useState(0);

  const load = useCallback(async (force) => {
    try {
      const data = await getCatalog(force);
      setCatalog(data);
      setStatus('ready');
    } catch (err) {
      setStatus((old) => (old === 'ready' ? old : 'error')); // if the shop was shown before, it stays on the screen
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(false); }, [load]);
  // coming back to the Home tab: the numbers (stock, sold) are refreshed quietly
  useEffect(() => {
    if (!navigation || !navigation.addListener) return undefined;
    return navigation.addListener('focus', () => load(false));
  }, [navigation, load]);

  const { products, categories } = catalog;
  const banners = useMemo(() => buildBanners(products), [products]);
  const sellers = useMemo(() => bestSellers(products), [products]);
  const discover = useMemo(() => sortProducts(filterByAudience(products, audience), 'relevance'), [products, audience]);
  const shown = discover.slice(0, visible);

  // The search box suggests, one after the other, what the shop really sells (its best sellers; or its categories)
  const hints = useMemo(() => {
    const names = sellers.length > 0 ? sellers.slice(0, 4).map((p) => p.product_name) : categories.slice(0, 4).map((c) => c.category_name);
    return ['Search in Fitora Gear', ...names.map((n) => `Try "${n.length > 24 ? n.slice(0, 24).trim() + '\u2026' : n}"`)];
  }, [sellers, categories]);
  useEffect(() => {
    if (hints.length < 2) return undefined;
    const timer = setInterval(() => setHintIndex((i) => (i + 1) % hints.length), 3200);
    return () => clearInterval(timer);
  }, [hints.length]);

  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = customer && customer.fullName ? String(customer.fullName).trim().split(/\s+/)[0] : '';
  const greeting = firstName ? `${hello}, ${firstName}` : hello;

  const openProduct = (product) => navigation.navigate('ProductDetail', { product });
  const openSearch = (params) => navigation.navigate('Search', params);

  const header = (
    <View>
      <View style={styles.hero}>
        <View style={styles.heroDeco} pointerEvents="none" />
        <Text style={styles.heroHello}>{greeting}</Text>
        <Text style={styles.heroTitle}>Find your next favorite gear</Text>
        {products.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
            {QUICK.map((q) => (
              <TouchableOpacity key={q.label} style={styles.quick} onPress={() => openSearch(q.params)} accessibilityLabel={`Quick ${q.label}`}>
                <Icon name={q.icon} size={14} color="#fff" />
                <Text style={styles.quickText}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}
      </View>

      {banners.length > 0 ? <BannerCarousel banners={banners} onPress={(b) => openSearch(b.params)} /> : null}

      {categories.length > 0 ? (
        <View style={styles.section}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            <TouchableOpacity style={styles.categoryTile} onPress={() => openSearch({ browseAll: true })} accessibilityLabel="All products">
              <View style={styles.categoryCircle}><Icon name="grid-outline" size={25} color={COLORS.primary} /></View>
              <Text style={styles.categoryName} numberOfLines={2}>All products</Text>
            </TouchableOpacity>
            {categories.map((c) => (
              <TouchableOpacity key={c.category_id} style={styles.categoryTile} onPress={() => openSearch({ categoryId: c.category_id })} accessibilityLabel={c.category_name}>
                <View style={styles.categoryCircle}><Icon name={categoryIcon(c.category_name)} size={25} color={COLORS.primary} /></View>
                <Text style={styles.categoryName} numberOfLines={2}>{c.category_name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {sellers.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={styles.titleRow}><Icon name="flame" size={19} color={COLORS.primary} /><Text style={styles.sectionTitle}>Best sellers</Text></View>
            <TouchableOpacity style={styles.seeAllRow} onPress={() => openSearch({ sort: 'sales' })} accessibilityLabel="See all best sellers"><Text style={styles.seeAll}>See all</Text><Icon name="chevron-forward" size={14} color={COLORS.primary} /></TouchableOpacity>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={sellers}
            keyExtractor={(p) => String(p.product_id)}
            contentContainerStyle={styles.sellerRow}
            renderItem={({ item }) => <View style={{ marginRight: GAP }}><ProductCard product={item} width={136} onPress={openProduct} /></View>}
          />
        </View>
      ) : null}

      <View style={styles.discoverHead}>
        <View style={styles.discoverTitleRow}>
          <Icon name="sparkles" size={18} color={COLORS.primary} />
          <Text style={styles.discoverTitle}>Daily Discover</Text>
          <Icon name="sparkles" size={18} color={COLORS.primary} />
        </View>
        <View style={styles.pills}>
          {AUDIENCE_TABS.map(([key, label, icon]) => (
            <TouchableOpacity key={key} style={[styles.pill, audience === key && styles.pillActive]} onPress={() => { setAudience(key); setVisible(PAGE_SIZE); }} accessibilityLabel={`Show ${label}`}>
              <Icon name={icon} size={14} color={audience === key ? '#fff' : COLORS.text} />
              <Text style={[styles.pillText, audience === key && styles.pillTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <View style={styles.decoBig} pointerEvents="none" />
        <View style={styles.decoSmall} pointerEvents="none" />
        <Image source={require('../../assets/logo.png')} style={styles.logo} />
        <TouchableOpacity style={styles.searchBox} activeOpacity={0.9} onPress={() => openSearch(undefined)} accessibilityLabel="Search">
          <Text style={styles.searchPlaceholder} numberOfLines={1}>{hints[hintIndex % hints.length]}</Text>
          <View style={styles.searchGo}><Icon name="search" size={16} color="#fff" /></View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.roundButton} onPress={() => navigation.navigate('Notifications')} accessibilityLabel="Notifications">
          <Icon name="notifications-outline" size={23} color="#fff" />
          {unread > 0 ? <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{unread > 99 ? '99+' : unread}</Text></View> : null}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cartButton} onPress={() => navigation.navigate('Cart')} accessibilityLabel="Cart">
          <Icon name="cart-outline" size={25} color="#fff" />
          {itemCount > 0 ? <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{itemCount > 99 ? '99+' : itemCount}</Text></View> : null}
        </TouchableOpacity>
      </View>

      {status === 'loading' ? (
        <ActivityIndicator style={{ marginTop: 60 }} size="large" color={COLORS.primary} />
      ) : status === 'error' ? (
        <View style={styles.center}>
          <Icon name="cloud-offline-outline" size={56} color={COLORS.primary} />
          <Text style={styles.centerTitle}>Could not load the shop</Text>
          <Text style={styles.centerText}>Please check your internet connection. The shop may take up to a minute to wake up.</Text>
          <TouchableOpacity style={styles.retry} onPress={() => { setStatus('loading'); load(true); }}><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(p) => String(p.product_id)}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={header}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
          onEndReached={() => { if (visible < discover.length) setVisible((v) => v + PAGE_SIZE); }}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) => <ProductCard product={item} width={CARD_WIDTH} onPress={openProduct} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Icon name="bag-outline" size={56} color={COLORS.primary} />
              <Text style={styles.centerTitle}>{products.length === 0 ? 'No products yet' : 'Nothing here yet'}</Text>
              <Text style={styles.centerText}>{products.length === 0 ? 'Please check back soon.' : 'There are no products for this choice. Try another one.'}</Text>
            </View>
          }
          ListFooterComponent={
            discover.length === 0 ? null : visible < discover.length
              ? <ActivityIndicator style={{ marginVertical: 18 }} color={COLORS.primary} />
              : <View style={styles.endRow}><Icon name="happy-outline" size={16} color={COLORS.muted} /><Text style={styles.end}>You have seen all the products</Text></View>
          }
        />
      )}
    </View>
  );
}

const TOP_PAD = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : Platform.OS === 'ios' ? 54 : 14;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingTop: TOP_PAD, paddingBottom: 12, paddingHorizontal: SIDE, overflow: 'hidden' },
  decoBig: { position: 'absolute', top: -70, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.10)' },
  decoSmall: { position: 'absolute', bottom: -34, left: 70, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.08)' },
  logo: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', marginRight: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 22, height: 44, paddingLeft: 16, paddingRight: 5, shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  searchPlaceholder: { flex: 1, color: COLORS.muted, fontSize: 14 },
  searchGo: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  roundButton: { marginLeft: 8, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  cartButton: { marginLeft: 8, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  cartBadge: { position: 'absolute', top: 0, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: COLORS.primary },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  hero: { backgroundColor: COLORS.primary, paddingHorizontal: SIDE, paddingTop: 6, paddingBottom: 46, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  heroDeco: { position: 'absolute', right: -34, bottom: -46, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.10)' },
  heroHello: { fontSize: 13, color: 'rgba(255,255,255,0.92)', fontWeight: '600' },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2 },
  quickRow: { paddingTop: 12, paddingRight: 8 },
  quick: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', borderRadius: 17, paddingHorizontal: 13, paddingVertical: 7, marginRight: 8 },
  quickText: { color: '#fff', fontSize: 12, fontWeight: '700', marginLeft: 5 },
  bannerWrap: { marginHorizontal: SIDE, marginTop: -28 },
  banner: { height: 132, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, overflow: 'hidden', borderWidth: 3, borderColor: '#fff' },
  bannerText: { flex: 1, paddingRight: 8 },
  bannerTitle: { fontSize: 22, fontWeight: '800' },
  bannerSub: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  bannerPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', marginTop: 12, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5 },
  bannerPillText: { fontSize: 12, fontWeight: '800' },
  bannerRing: { width: 104, height: 104, borderRadius: 52, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  bannerDisc: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#d9d9de', marginHorizontal: 3 },
  dotActive: { width: 16, backgroundColor: COLORS.primary },

  section: { backgroundColor: COLORS.card, marginTop: 10, paddingVertical: 12 },
  categoryRow: { paddingHorizontal: SIDE },
  categoryTile: { width: 76, alignItems: 'center', marginRight: 6 },
  categoryCircle: { width: 58, height: 58, borderRadius: 18, backgroundColor: COLORS.primaryTint, borderWidth: 1.5, borderColor: '#ffd1e3', alignItems: 'center', justifyContent: 'center' },
  categoryName: { fontSize: 12, color: COLORS.text, textAlign: 'center', marginTop: 6 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SIDE, marginBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.ink, marginLeft: 6 },
  seeAllRow: { flexDirection: 'row', alignItems: 'center' },
  seeAll: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  sellerRow: { paddingHorizontal: SIDE },

  discoverHead: { backgroundColor: COLORS.card, marginTop: 10, paddingTop: 12, paddingHorizontal: SIDE, paddingBottom: 12, marginBottom: 8, borderBottomWidth: 3, borderBottomColor: COLORS.primary },
  discoverTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  discoverTitle: { fontSize: 17, fontWeight: '800', color: COLORS.primary, textAlign: 'center', marginHorizontal: 8 },
  pills: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: COLORS.bg, marginHorizontal: 4 },
  pillActive: { backgroundColor: COLORS.primary },
  pillText: { fontSize: 13, color: COLORS.text, fontWeight: '600', marginLeft: 5 },
  pillTextActive: { color: '#fff' },
  gridRow: { justifyContent: 'space-between', paddingHorizontal: SIDE },

  center: { alignItems: 'center', paddingHorizontal: 36, paddingVertical: 48 },
  centerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.ink, marginTop: 10 },
  centerText: { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  retry: { marginTop: 18, backgroundColor: COLORS.primary, borderRadius: 22, paddingHorizontal: 26, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '800' },
  endRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  end: { textAlign: 'center', color: COLORS.muted, fontSize: 12, marginLeft: 6 },
});