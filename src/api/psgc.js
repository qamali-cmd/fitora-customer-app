// src/api/psgc.js
// The official list of Philippine regions, provinces, cities and barangays (PSGC, from the PSA).
// It comes from a free public API, so the address form asks for it only when a list is opened.

const BASE = 'https://psgc.gitlab.io/api';
const cache = new Map();

// A pretend province for cities that do not belong to any province (for example some independent cities)
export const INDEPENDENT = { code: 'INDEPENDENT', name: 'Independent cities' };

async function getList(path, allowMissing = false) {
  if (cache.has(path)) return cache.get(path);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let response;
  try {
    response = await fetch(`${BASE}${path}`, { signal: controller.signal });
  } catch (err) {
    throw new Error('We could not load the list. Please check your internet connection.');
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 404 && allowMissing) return []; // e.g. Metro Manila has no provinces
  if (!response.ok) throw new Error('We could not load the list right now.');

  const data = await response.json();
  const list = Array.isArray(data) ? data : data && Array.isArray(data.data) ? data.data : null;
  if (!list) throw new Error('We could not load the list right now.');
  cache.set(path, list);
  return list;
}

const byName = (a, b) => String(a.name).localeCompare(String(b.name));
const simple = (item) => ({ code: String(item.code), name: String(item.name) });

export function regionLabel(region) {
  return region.regionName && region.regionName !== region.name ? `${region.regionName} (${region.name})` : region.name;
}

export async function getRegions() {
  const list = await getList('/regions/');
  return list
    .map((region) => ({ code: String(region.code), name: regionLabel(region) }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

// An empty list means the region has no provinces (Metro Manila)
export async function getProvinceOptions(regionCode) {
  const provinces = await getList(`/regions/${regionCode}/provinces/`, true);
  const items = provinces.map(simple).sort(byName);
  if (items.length > 0) {
    const regionCities = await getList(`/regions/${regionCode}/cities-municipalities/`, true);
    if (regionCities.some((city) => !city.provinceCode)) items.push(INDEPENDENT);
  }
  return items;
}

export async function getCityOptions(regionCode, province) {
  if (province.code === INDEPENDENT.code || province.code === regionCode) {
    const regionCities = await getList(`/regions/${regionCode}/cities-municipalities/`);
    const list = province.code === INDEPENDENT.code ? regionCities.filter((city) => !city.provinceCode) : regionCities;
    return list.map(simple).sort(byName);
  }
  const list = await getList(`/provinces/${province.code}/cities-municipalities/`);
  return list.map(simple).sort(byName);
}

export async function getBarangays(cityCode) {
  const list = await getList(`/cities-municipalities/${cityCode}/barangays/`);
  return list.map(simple).sort(byName);
}