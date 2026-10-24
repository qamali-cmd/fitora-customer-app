// src/utils/productUtils.js
// Small helpers for the shop window (Home and Search): what is for sale, searching, sorting, and the banners.
// They do not use the screen or the internet, so they are easy to test.

export const NEW_DAYS = 14; // a product added in the last 14 days gets a "NEW" tag

// A smaller picture from Cloudinary (a square, light and fast). Other links are left as they are.
export function thumb(url, width = 400) {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) return url;
  if (/\/image\/upload\/[^/]*(w_|c_|f_|q_)/.test(url)) return url; // it already has a size
  return url.replace('/image/upload/', `/image/upload/c_fill,w_${width},h_${width},q_auto,f_auto/`);
}

// Only active products that the Super Admin approved are shown to customers
export function isForSale(p) {
  return !!p && p.status === 'active' && (!p.approval_status || p.approval_status === 'approved');
}

// "Men" shows the products for men and the unisex ones; "Women" the same for women
export function filterByAudience(products, audience) {
  if (audience === 'men' || audience === 'women') {
    return products.filter((p) => !p.audience || p.audience === audience || p.audience === 'unisex');
  }
  return products;
}

export function formatCount(n) {
  const value = Number(n) || 0;
  if (value < 1000) return String(value);
  if (value < 10000) return (Math.floor(value / 100) / 10).toString().replace(/\.0$/, '') + 'k';
  return Math.floor(value / 1000) + 'k';
}
export const soldText = (p) => ((Number(p.sold_count) || 0) > 0 ? `${formatCount(p.sold_count)} sold` : '');
export const ratingText = (p) => ((Number(p.rating_count) || 0) > 0 && p.rating_avg != null ? Number(p.rating_avg).toFixed(1) : '');

export function isNew(p, now = Date.now()) {
  const added = new Date(p.created_at).getTime();
  return !Number.isNaN(added) && now - added < NEW_DAYS * 86400000 && now - added >= -86400000;
}

// 0 = does not match. Every word typed must be found; a name that starts with the word is the best match.
export function relevanceScore(p, q) {
  const query = String(q || '').trim().toLowerCase();
  if (!query) return 1;
  const name = String(p.product_name || '').toLowerCase();
  const extra = `${p.category_name || ''} ${p.description || ''}`.toLowerCase();
  let score = 0;
  for (const word of query.split(/\s+/).filter(Boolean)) {
    if (name.startsWith(word)) score += 4;
    else if (name.split(/[^a-z0-9]+/).some((token) => token.startsWith(word))) score += 3;
    else if (name.includes(word)) score += 2;
    else if (extra.includes(word)) score += 1;
    else return 0;
  }
  return score;
}

const time = (p) => { const t = new Date(p.created_at).getTime(); return Number.isNaN(t) ? 0 : t; };
const bySold = (a, b) => (Number(b.sold_count) || 0) - (Number(a.sold_count) || 0);
const byNewest = (a, b) => time(b) - time(a) || b.product_id - a.product_id;

// sort: 'relevance' (the popular ones first), 'latest', 'sales', 'price_asc', 'price_desc'
export function sortProducts(list, sort, query = '') {
  const arr = [...list];
  if (sort === 'latest') return arr.sort(byNewest);
  if (sort === 'sales') return arr.sort((a, b) => bySold(a, b) || byNewest(a, b));
  if (sort === 'price_asc') return arr.sort((a, b) => Number(a.price) - Number(b.price) || byNewest(a, b));
  if (sort === 'price_desc') return arr.sort((a, b) => Number(b.price) - Number(a.price) || byNewest(a, b));
  if (String(query).trim()) return arr.sort((a, b) => relevanceScore(b, query) - relevanceScore(a, query) || bySold(a, b) || byNewest(a, b));
  return arr.sort((a, b) => bySold(a, b) || byNewest(a, b));
}

export function searchProducts(products, { query = '', categoryId = null, audience = 'all', minPrice = '', maxPrice = '', sort = 'relevance' } = {}) {
  const list = filterByAudience(products, audience).filter((p) => {
    if (categoryId !== null && categoryId !== undefined && p.category_id !== categoryId) return false;
    const price = Number(p.price);
    if (minPrice !== '' && minPrice !== null && price < Number(minPrice)) return false;
    if (maxPrice !== '' && maxPrice !== null && price > Number(maxPrice)) return false;
    return relevanceScore(p, query) > 0;
  });
  return sortProducts(list, sort, query);
}

// The names that match what is being typed (shown under the search box)
export function suggestProducts(products, text, limit = 6) {
  const q = String(text || '').trim();
  if (!q) return [];
  const names = [];
  for (const p of sortProducts(products.filter((x) => relevanceScore(x, q) > 0), 'relevance', q)) {
    if (!names.includes(p.product_name)) names.push(p.product_name);
    if (names.length >= limit) break;
  }
  return names;
}

export function bestSellers(products, count = 10) {
  return sortProducts(products.filter((p) => (Number(p.sold_count) || 0) > 0), 'sales').slice(0, count);
}

// A modern icon (an Ionicons name) for each category. A category that the admin adds later still works (it gets the bag).
const CATEGORY_ICONS = [
  [/watch/i, 'watch-outline'], [/bag|backpack|wallet|pouch/i, 'bag-handle-outline'], [/jewel|ring|necklace|bracelet|earring|pendant/i, 'diamond-outline'],
  [/sunglass|glasses|eyewear|shade/i, 'glasses-outline'], [/tech|phone|ear|head|gadget|cable|charger|case|speaker/i, 'headset-outline'],
  [/cap|hat|shirt|cloth|apparel/i, 'shirt-outline'], [/shoe|sneaker|sandal/i, 'footsteps-outline'],
];
export function categoryIcon(name) {
  const hit = CATEGORY_ICONS.find(([pattern]) => pattern.test(String(name || '')));
  return hit ? hit[1] : 'pricetag-outline';
}

// The banners of the Home screen. They are made from the shop's own products, so nothing has to be set up:
// a banner only appears when it has something to show, and pressing it opens the Search with that choice.
export function buildBanners(products) {
  const banners = [];
  if (products.length > 0) banners.push({ key: 'new', title: 'New arrivals', subtitle: 'Fresh picks, just added', icon: 'sparkles', tone: 'pink', params: { sort: 'latest' } });
  if (products.some((p) => (Number(p.sold_count) || 0) > 0)) banners.push({ key: 'best', title: 'Best sellers', subtitle: 'What shoppers love the most', icon: 'flame', tone: 'ink', params: { sort: 'sales' } });
  if (products.some((p) => !p.audience || p.audience === 'men' || p.audience === 'unisex')) banners.push({ key: 'men', title: 'For Men', subtitle: 'Gear that works as hard as you', icon: 'man-outline', tone: 'rose', params: { audience: 'men' } });
  if (products.some((p) => !p.audience || p.audience === 'women' || p.audience === 'unisex')) banners.push({ key: 'women', title: 'For Women', subtitle: 'Style for every day', icon: 'woman-outline', tone: 'soft', params: { audience: 'women' } });
  if (products.some((p) => Number(p.price) <= 500)) banners.push({ key: 'budget', title: 'Budget picks', subtitle: 'Great finds at \u20B1500 and below', icon: 'pricetag-outline', tone: 'pink', params: { maxPrice: '500', sort: 'price_asc' } });
  banners.push({ key: 'ship', title: 'Shipping discount', subtitle: 'Spend \u20B11,500 or more and get up to \u20B1100 off shipping', icon: 'rocket-outline', tone: 'ink', params: { browseAll: true } });
  return banners;
}