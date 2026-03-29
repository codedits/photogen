"use client";
import { useCallback, useEffect, useRef, useState } from 'react';

export type Preset = {
  id: string;
  name?: string;
  description?: string;
  prompt?: string;
  tags?: string[];
  image?: string | null;
  images?: { url: string; public_id: string }[];
  dng?: { url?: string; public_id?: string } | null;
  createdAt?: string | Date;
};

// Simple in-memory cache (SWR-like) keyed by q+page+limit.
// Stores data + timestamp; revalidates in background if staleMs exceeded.
const MAX_CACHE_ENTRIES = 50;
const presetCache = new Map<string, { data: Preset[]; hasMore: boolean; ts: number }>();

/** Clear the entire in-memory preset cache. Call after mutations (delete/create/edit). */
export function clearPresetCache() {
  presetCache.clear();
}

function enforcePresetCacheSize() {
  while (presetCache.size > MAX_CACHE_ENTRIES) {
    const oldest = presetCache.keys().next().value;
    if (!oldest) break;
    presetCache.delete(oldest);
  }
}

function mergeUniqueById(prev: Preset[], incoming: Preset[]) {
  if (!incoming.length) return prev;
  const seen = new Set(prev.map((item) => item.id));
  const next = [...prev];
  for (const item of incoming) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      next.push(item);
    }
  }
  return next;
}

export interface UsePresetsOptions {
  q?: string;
  limit?: number;
  initialPage?: number;
  staleMs?: number; // how long to trust cache before soft revalidate
  enabled?: boolean;
}

export function usePresets(opts: UsePresetsOptions = {}) {
  const { q = '', limit = 20, initialPage = 1, staleMs = 60_000, enabled = true } = opts;
  const [page, setPage] = useState(initialPage);
  const [items, setItems] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const loadingRef = useRef(false);
  const pageRef = useRef(initialPage);

  const key = `${q}\n${page}\n${limit}`;

  const fetchPage = useCallback(async (targetPage: number, append: boolean, forceRefresh = false) => {
    if (!enabled) return;
    // If forceRefresh, abort any in-flight and reset loadingRef
    if (forceRefresh) {
      if (abortRef.current) abortRef.current.abort();
      loadingRef.current = false;
    }
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    const cKey = `${q}\n${targetPage}\n${limit}`;

    // serve cache immediately if present and not stale (skip if forceRefresh)
    if (!forceRefresh) {
      const cached = presetCache.get(cKey);
      const now = Date.now();
      if (cached) {
        const isStale = now - cached.ts > staleMs;
        if (append) {
          setItems(prev => mergeUniqueById(prev, cached.data));
        } else {
          setItems(cached.data);
        }
        setHasMore(cached.hasMore);
        if (!isStale) {
          setLoading(false);
          loadingRef.current = false;
          return; // fresh
        }
        // stale -> continue to background revalidate
      }
    }
    // abort any in-flight
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      params.set('page', String(targetPage));
      params.set('limit', String(limit));
      const res = await fetch(`/api/presets?${params.toString()}`, { signal: ac.signal, cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || 'Failed');
      const newData: Preset[] = json.presets || [];
      const newHasMore: boolean = !!json.hasMore;
      presetCache.set(cKey, { data: newData, hasMore: newHasMore, ts: Date.now() });
      enforcePresetCacheSize();
      setHasMore(newHasMore);
      setItems(prev => append ? mergeUniqueById(prev, newData) : newData);
    } catch (e: unknown) {
      // avoid using `any` here to satisfy eslint rules
      if ((e as unknown as { name?: string }).name === 'AbortError') return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [q, limit, staleMs, enabled]);

  // initial & when q changes (reset)
  useEffect(() => {
    setPage(initialPage);
    setItems([]);
    setHasMore(true);
    if (enabled) fetchPage(initialPage, false);
  }, [q, initialPage, fetchPage, enabled]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingRef.current) return;
    const next = pageRef.current + 1;
    pageRef.current = next;
    setPage(next);
    fetchPage(next, true);
  }, [hasMore, fetchPage]);

  const refresh = useCallback(() => {
    // Clear the cache so stale data isn't served back, then force-fetch from page 1.
    // We do NOT clear items here — keep old items visible until new data arrives.
    clearPresetCache();
    pageRef.current = initialPage;
    setPage(initialPage);
    fetchPage(initialPage, false, true);
  }, [fetchPage, initialPage]);

  return { items, loading, error, page, hasMore, loadMore, refresh };
}
