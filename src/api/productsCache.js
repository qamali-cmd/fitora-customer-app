// src/api/productsCache.js
// Loads the products and the categories ONCE and shares them with Home and Search (kept for 1 minute),
// so the app does not ask the server again and again when the customer goes back and forth.
import API from './config';
import { isForSale } from '../utils/productUtils';

const KEEP_MS = 60 * 1000;
let cache = null;
let cachedAt = 0;
let inflight = null;

export async function getCatalog(force = false) {
  if (!force && cache && Date.now() - cachedAt < KEEP_MS) return cache;
  if (inflight) return inflight;
  inflight = Promise.all([
    fetch(`${API.PRODUCTS}/products`).then((r) => r.json()),
    fetch(`${API.PRODUCTS}/categories`).then((r) => r.json()),
  ])
    .then(([products, categories]) => {
      if (!Array.isArray(products) || !Array.isArray(categories)) throw new Error('The shop could not be loaded.');
      cache = { products: products.filter(isForSale), categories };
      cachedAt = Date.now();
      return cache;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

// After an order is placed the stock and the sold numbers changed, so the next visit loads them again
export function clearCatalogCache() {
  cache = null;
  cachedAt = 0;
}