// src/utils/searchHistory.js
// The words the customer searched for (kept on this phone, newest first, at most 10).
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'fitora_search_history';
const MAX = 10;

export async function getSearchHistory() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x) => typeof x === 'string' && x.trim()).slice(0, MAX) : [];
  } catch (err) {
    return [];
  }
}

async function save(list) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(list)); } catch (err) { /* not important */ }
  return list;
}

export async function addSearchHistory(text) {
  const word = String(text || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  if (!word) return getSearchHistory();
  const old = await getSearchHistory();
  return save([word, ...old.filter((x) => x.toLowerCase() !== word.toLowerCase())].slice(0, MAX));
}

export async function removeSearchHistory(text) {
  const old = await getSearchHistory();
  return save(old.filter((x) => x !== text));
}

export async function clearSearchHistory() {
  return save([]);
}