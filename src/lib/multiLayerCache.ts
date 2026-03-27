import { cache } from "react";
import { delCachePrefix, getCache, setCache } from "./simpleCache";

const inFlight = new Map<string, Promise<unknown>>();

export async function withProcessCache<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<T> {
  const cached = getCache<T>(key);
  if (cached !== undefined) {
    return cached;
  }

  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }

  const pending = (async () => {
    const value = await loader();
    setCache(key, value, ttlSeconds);
    return value;
  })().finally(() => {
    inFlight.delete(key);
  });

  inFlight.set(key, pending);
  return pending;
}

export function createRequestScopedCachedFn<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): () => Promise<T> {
  return cache(async () => withProcessCache(key, ttlSeconds, loader));
}

export function invalidateCachePrefix(prefix: string) {
  delCachePrefix(prefix);
}
