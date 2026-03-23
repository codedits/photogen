type CacheEntry<T> = { value: T; expiresAt: number };

const store = new Map<string, CacheEntry<unknown>>();
const MAX_CACHE_ENTRIES = 500;

function enforceMaxEntries() {
  // Evict oldest entries first; Map preserves insertion order.
  while (store.size > MAX_CACHE_ENTRIES) {
    const oldest = store.keys().next().value;
    if (!oldest) break;
    store.delete(oldest);
  }
}

export function setCache<T>(key: string, value: T, ttlSeconds = 15) {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  store.set(key, { value, expiresAt });
  enforceMaxEntries();
}

export function getCache<T>(key: string): T | undefined {
  const e = store.get(key) as CacheEntry<T> | undefined;
  if (!e) return undefined;
  if (Date.now() > e.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return e.value;
}

export function delCache(key: string) {
  store.delete(key);
}

export function clearCache() {
  store.clear();
}

// Delete all keys that start with a given prefix.
export function delCachePrefix(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
