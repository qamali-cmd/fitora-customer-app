// src/screens/SearchScreen.js
// Search like a big shopping app: while typing it suggests names, it remembers the last searches, and the results can be
// sorted (Popular, Latest, Top sales, Price) and filtered (who it is for, category, price).
// The Home banners and categories open this screen already set to their choice.
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, FlatList, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  Modal, Dimensions, Platform, StatusBar, Keyboard,
} from 'react-native';
import { COLORS } from '../theme';
import Icon from '../components/Icon';
import ProductCard from '../components/ProductCard';
import { getCatalog } from '../api/productsCache';
import { searchProducts, suggestProducts, bestSellers } from '../utils/productUtils';
import { getSearchHistory, addSearchHistory, removeSearchHistory, clearSearchHistory } from '../utils/searchHistory';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SIDE = 12;
const GAP = 8;
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - SIDE * 2 - GAP) / 2);
const AUDIENCE_TABS = [['all', 'All'], ['men', 'Men'], ['women', 'Women']];
const cleanPrice = (text) => String(text).replace(/[^0-9.]/g, '').slice(0, 9);

export default function SearchScreen({ navigation, route }) {
  const params = (route && route.params) || {};
  const startsWithResults = !!(params.query || params.categoryId != null || params.audience || params.sort || params.maxPrice || params.minPrice || params.browseAll);

  const [catalog, setCatalog] = useState({ products: [], categories: [] });
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [text, setText] = useState(params.query || '');
  const [submitted, setSubmitted] = useState(startsWithResults);
  const [applied, setApplied] = useState({
    query: params.query || '',
    categoryId: params.categoryId != null ? params.categoryId : null,
    audience: params.audience || 'all',
    minPrice: params.minPrice || '',
    maxPrice: params.maxPrice || '',
    browseAll: !!params.browseAll,
    sort: params.sort || 'relevance',
  });
  const [history, setHistory] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState(applied);

  useEffect(() => {
    let alive = true;
    getCatalog(false).then((data) => { if (alive) { setCatalog(data); setStatus('ready'); } }).catch(() => { if (alive) setStatus('error'); });
    getSearchHistory().then((list) => { if (alive) setHistory(list); });
    return () => { alive = false; };
  }, []);

  const { products, categories } = catalog;
  const hasFilters = applied.categoryId !== null || applied.audience !== 'all' || applied.minPrice !== '' || applied.maxPrice !== '' || applied.browseAll;
  const showResults = submitted || (text.trim() === '' && hasFilters);
  const results = useMemo(() => searchProducts(products, applied), [products, applied]);
  const suggestions = useMemo(() => suggestProducts(products, text), [products, text]);
  const popular = useMemo(() => bestSellers(products, 6).map((p) => p.product_name), [products]);
  const filterCount = (applied.categoryId !== null ? 1 : 0) + (applied.audience !== 'all' ? 1 : 0) + (applied.minPrice !== '' || applied.maxPrice !== '' ? 1 : 0);

  async function submit(term) {
    const word = String(term || '').trim();
    if (!word) return;
    Keyboard.dismiss();
    setText(word);
    setApplied((a) => ({ ...a, query: word }));
    setSubmitted(true);
    setHistory(await addSearchHistory(word));
  }

  function onType(value) {
    setText(value);
    if (value.trim() === '') setApplied((a) => ({ ...a, query: '' }));
    if (submitted && value.trim() !== applied.query) setSubmitted(false); // typing again shows the suggestions
  }

  function setSort(sort) { setApplied((a) => ({ ...a, sort })); }
  function pressPrice() { setSort(applied.sort === 'price_asc' ? 'price_desc' : 'price_asc'); }

  function openFilter() { setDraft(applied); setFilterOpen(true); }
  function applyFilter() {
    const min = draft.minPrice !== '' && draft.maxPrice !== '' && Number(draft.minPrice) > Number(draft.maxPrice) ? draft.maxPrice : draft.minPrice; // a min above the max is swapped
    const max = min !== draft.minPrice ? draft.minPrice : draft.maxPrice;
    setApplied((a) => ({ ...a, categoryId: draft.categoryId, audience: draft.audience, minPrice: min, maxPrice: max, browseAll: a.browseAll || false }));
    setSubmitted(true);
    setFilterOpen(false);
  }
  function resetDraft() { setDraft((d) => ({ ...d, categoryId: null, audience: 'all', minPrice: '', maxPrice: '' })); }
  function clearFilters() { setApplied((a) => ({ ...a, categoryId: null, audience: 'all', minPrice: '', maxPrice: '', browseAll: false })); }

  const sortTab = (key, label) => (
    <TouchableOpacity key={key} style={styles.sortTab} onPress={() => setSort(key)} accessibilityLabel={`Sort by ${label}`}>
      <Text style={[styles.sortText, applied.sort === key && styles.sortTextActive]}>{label}</Text>
      {applied.sort === key ? <View style={styles.sortLine} /> : null}
    </TouchableOpacity>
  );
  const priceActive = applied.sort === 'price_asc' || applied.sort === 'price_desc';

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()} accessibilityLabel="Back"><Icon name="chevron-back" size={27} color="#fff" /></TouchableOpacity>
        <View style={styles.inputBox}>
          <Icon name="search" size={16} color={COLORS.muted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Search in Fitora Gear"
            placeholderTextColor={COLORS.muted}
            value={text}
            onChangeText={onType}
            onSubmitEditing={() => submit(text)}
            returnKeyType="search"
            autoFocus={!startsWithResults}
            autoCorrect={false}
          />
          {text ? <TouchableOpacity onPress={() => onType('')} accessibilityLabel="Clear the search"><Icon name="close-circle" size={18} color={COLORS.muted} style={styles.clear} /></TouchableOpacity> : null}
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={() => submit(text)} accessibilityLabel="Search"><Text style={styles.searchBtnText}>Search</Text></TouchableOpacity>
      </View>

      {status === 'loading' ? (
        <ActivityIndicator style={{ marginTop: 50 }} size="large" color={COLORS.primary} />
      ) : status === 'error' ? (
        <View style={styles.center}>
          <Icon name="cloud-offline-outline" size={56} color={COLORS.primary} />
          <Text style={styles.centerTitle}>Could not load the shop</Text>
          <Text style={styles.centerText}>Please check your internet connection and try again.</Text>
          <TouchableOpacity style={styles.retry} onPress={() => { setStatus('loading'); getCatalog(true).then((d) => { setCatalog(d); setStatus('ready'); }).catch(() => setStatus('error')); }}><Text style={styles.retryText}>Try again</Text></TouchableOpacity>
        </View>
      ) : showResults ? (
        <View style={{ flex: 1 }}>
          <View style={styles.sortBar}>
            {sortTab('relevance', 'Popular')}
            {sortTab('latest', 'Latest')}
            {sortTab('sales', 'Top sales')}
            <TouchableOpacity style={styles.sortTab} onPress={pressPrice} accessibilityLabel="Sort by price">
              <View style={styles.priceTab}>
                <Text style={[styles.sortText, priceActive && styles.sortTextActive]}>Price</Text>
                <Icon name={applied.sort === 'price_asc' ? 'arrow-up' : applied.sort === 'price_desc' ? 'arrow-down' : 'swap-vertical'} size={13} color={priceActive ? COLORS.primary : COLORS.muted} style={{ marginLeft: 2 }} />
              </View>
              {priceActive ? <View style={styles.sortLine} /> : null}
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterBtn} onPress={openFilter} accessibilityLabel="Filter">
              <Icon name="options-outline" size={15} color={filterCount > 0 ? COLORS.primary : COLORS.text} />
              <Text style={[styles.sortText, filterCount > 0 && styles.sortTextActive, { marginLeft: 4 }]}>Filter</Text>
              {filterCount > 0 ? <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{filterCount}</Text></View> : null}
            </TouchableOpacity>
          </View>
          <Text style={styles.count}>{results.length} {results.length === 1 ? 'result' : 'results'}{applied.query ? ` for "${applied.query}"` : ''}</Text>
          <FlatList
            data={results}
            keyExtractor={(p) => String(p.product_id)}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => <ProductCard product={item} width={CARD_WIDTH} onPress={(product) => navigation.navigate('ProductDetail', { product })} />}
            ListEmptyComponent={
              <View style={styles.center}>
                <Icon name="search-outline" size={56} color={COLORS.primary} />
                <Text style={styles.centerTitle}>No products found</Text>
                <Text style={styles.centerText}>Try different words, or clear the filters.</Text>
                {hasFilters ? <TouchableOpacity style={styles.retry} onPress={clearFilters}><Text style={styles.retryText}>Clear filters</Text></TouchableOpacity> : null}
              </View>
            }
          />
        </View>
      ) : text.trim() !== '' ? (
        <FlatList
          data={suggestions}
          keyExtractor={(name) => name}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.suggestion} onPress={() => submit(item)} accessibilityLabel={`Search ${item}`}>
              <Icon name="search-outline" size={16} color={COLORS.muted} style={styles.suggestionIcon} />
              <Text style={styles.suggestionText} numberOfLines={1}>{item}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.hint}>No suggestions. Press Search to look for "{text.trim()}".</Text>}
        />
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled">
          <View>
              {history.length > 0 ? (
                <View style={styles.block}>
                  <View style={styles.blockHead}>
                    <Text style={styles.blockTitle}>Recent searches</Text>
                    <TouchableOpacity onPress={async () => setHistory(await clearSearchHistory())} accessibilityLabel="Clear the history"><Text style={styles.blockAction}>Clear</Text></TouchableOpacity>
                  </View>
                  {history.map((word) => (
                    <View key={word} style={styles.historyRow}>
                      <TouchableOpacity style={styles.historyWord} onPress={() => submit(word)} accessibilityLabel={`Search ${word}`}>
                        <Icon name="time-outline" size={16} color={COLORS.muted} style={styles.historyIcon} /><Text style={styles.historyText} numberOfLines={1}>{word}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={async () => setHistory(await removeSearchHistory(word))} accessibilityLabel={`Remove ${word}`}><Icon name="close" size={16} color={COLORS.muted} style={styles.historyRemove} /></TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : null}
              {popular.length > 0 ? (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>Popular searches</Text>
                  <View style={styles.chips}>
                    {popular.map((name) => (
                      <TouchableOpacity key={name} style={styles.chip} onPress={() => submit(name)} accessibilityLabel={`Search ${name}`}><Text style={styles.chipText} numberOfLines={1}>{name}</Text></TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}
              {categories.length > 0 ? (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>Browse categories</Text>
                  <View style={styles.chips}>
                    {categories.map((c) => (
                      <TouchableOpacity key={c.category_id} style={styles.chip} onPress={() => { setApplied((a) => ({ ...a, categoryId: c.category_id })); setSubmitted(true); }} accessibilityLabel={c.category_name}><Text style={styles.chipText}>{c.category_name}</Text></TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}
              {history.length === 0 && popular.length === 0 && categories.length === 0 ? <Text style={styles.hint}>Type what you are looking for.</Text> : null}
            </View>
        </ScrollView>
      )}

      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayTop} activeOpacity={1} onPress={() => setFilterOpen(false)} accessibilityLabel="Close the filter" />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Filter</Text>
              <TouchableOpacity onPress={() => setFilterOpen(false)} accessibilityLabel="Close"><Icon name="close" size={22} color={COLORS.muted} /></TouchableOpacity>
            </View>
            <Text style={styles.sheetLabel}>For</Text>
            <View style={styles.chips}>
              {AUDIENCE_TABS.map(([key, label]) => (
                <TouchableOpacity key={key} style={[styles.chip, draft.audience === key && styles.chipActive]} onPress={() => setDraft((d) => ({ ...d, audience: key }))} accessibilityLabel={`For ${label}`}>
                  <Text style={[styles.chipText, draft.audience === key && styles.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {categories.length > 0 ? (
              <View>
                <Text style={styles.sheetLabel}>Category</Text>
                <View style={styles.chips}>
                  <TouchableOpacity style={[styles.chip, draft.categoryId === null && styles.chipActive]} onPress={() => setDraft((d) => ({ ...d, categoryId: null }))} accessibilityLabel="Any category"><Text style={[styles.chipText, draft.categoryId === null && styles.chipTextActive]}>Any</Text></TouchableOpacity>
                  {categories.map((c) => (
                    <TouchableOpacity key={c.category_id} style={[styles.chip, draft.categoryId === c.category_id && styles.chipActive]} onPress={() => setDraft((d) => ({ ...d, categoryId: c.category_id }))} accessibilityLabel={`Category ${c.category_name}`}>
                      <Text style={[styles.chipText, draft.categoryId === c.category_id && styles.chipTextActive]}>{c.category_name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}
            <Text style={styles.sheetLabel}>Price range (₱)</Text>
            <View style={styles.priceRow}>
              <TextInput style={styles.priceInput} placeholder="Min" placeholderTextColor={COLORS.muted} keyboardType="number-pad" value={draft.minPrice} onChangeText={(v) => setDraft((d) => ({ ...d, minPrice: cleanPrice(v) }))} />
              <Text style={styles.priceDash}>—</Text>
              <TextInput style={styles.priceInput} placeholder="Max" placeholderTextColor={COLORS.muted} keyboardType="number-pad" value={draft.maxPrice} onChangeText={(v) => setDraft((d) => ({ ...d, maxPrice: cleanPrice(v) }))} />
            </View>
            <View style={styles.sheetButtons}>
              <TouchableOpacity style={styles.resetBtn} onPress={resetDraft} accessibilityLabel="Reset"><Text style={styles.resetText}>Reset</Text></TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={applyFilter} accessibilityLabel="Apply"><Text style={styles.applyText}>Apply</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const TOP_PAD = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : Platform.OS === 'ios' ? 54 : 14;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingTop: TOP_PAD, paddingBottom: 10, paddingHorizontal: 8 },
  back: { width: 34, height: 38, alignItems: 'center', justifyContent: 'center' },
  inputBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, height: 40, paddingHorizontal: 14 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: COLORS.ink, padding: 0 },
  clear: { paddingLeft: 8 },
  searchBtn: { paddingHorizontal: 10, height: 38, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  sortBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  sortTab: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 42 },
  priceTab: { flexDirection: 'row', alignItems: 'center' },
  sortText: { fontSize: 13, color: COLORS.text },
  sortTextActive: { color: COLORS.primary, fontWeight: '800' },
  sortLine: { position: 'absolute', bottom: 0, left: 14, right: 14, height: 2, backgroundColor: COLORS.primary },
  filterBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 42, borderLeftWidth: 1, borderLeftColor: COLORS.line },
  filterBadge: { marginLeft: 4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  count: { fontSize: 12, color: COLORS.muted, paddingHorizontal: SIDE, paddingVertical: 8 },
  gridRow: { justifyContent: 'space-between', paddingHorizontal: SIDE },

  suggestion: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, paddingHorizontal: SIDE, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  suggestionIcon: { marginRight: 10 },
  suggestionText: { flex: 1, fontSize: 14, color: COLORS.text },
  hint: { textAlign: 'center', color: COLORS.muted, fontSize: 13, padding: 28 },

  block: { backgroundColor: COLORS.card, marginTop: 10, padding: SIDE },
  blockHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  blockTitle: { fontSize: 14, fontWeight: '800', color: COLORS.ink },
  blockAction: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 },
  historyWord: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  historyIcon: { marginRight: 10 },
  historyText: { flex: 1, fontSize: 14, color: COLORS.text },
  historyRemove: { paddingHorizontal: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  chip: { backgroundColor: COLORS.bg, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 7, marginRight: 8, marginBottom: 8, maxWidth: 220 },
  chipActive: { backgroundColor: COLORS.primarySoft, borderWidth: 1, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.text },
  chipTextActive: { color: COLORS.primaryDark, fontWeight: '800' },

  center: { alignItems: 'center', paddingHorizontal: 36, paddingVertical: 48 },
  centerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.ink, marginTop: 10 },
  centerText: { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  retry: { marginTop: 18, backgroundColor: COLORS.primary, borderRadius: 22, paddingHorizontal: 26, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '800' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  overlayTop: { flex: 1 },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, paddingBottom: 26 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: COLORS.ink },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd', marginBottom: 12 },
  sheetLabel: { fontSize: 13, fontWeight: '800', color: COLORS.ink, marginTop: 14 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  priceInput: { flex: 1, height: 40, borderWidth: 1, borderColor: COLORS.line, borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: COLORS.ink, backgroundColor: COLORS.bg },
  priceDash: { marginHorizontal: 10, color: COLORS.muted },
  sheetButtons: { flexDirection: 'row', marginTop: 20 },
  resetBtn: { flex: 1, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  resetText: { color: COLORS.primary, fontWeight: '800', fontSize: 15 },
  applyBtn: { flex: 1, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  applyText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});