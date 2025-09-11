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
const presetCache = new Map<string, { data: Preset[]; hasMore: boolean; ts: number }>();

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

  const key = `${q}\n${page}\n${limit}`;

  const fetchPage = useCallback(async (targetPage: number, append: boolean) => {
    if (!enabled) return;
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    const cKey = `${q}\n${targetPage}\n${limit}`;

    // serve cache immediately if present and not stale
    const cached = presetCache.get(cKey);
    const now = Date.now();
    if (cached) {
      const isStale = now - cached.ts > staleMs;
      if (append) {
        setItems(prev => prev.concat(cached.data));
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
      setHasMore(newHasMore);
      setItems(prev => append ? prev.concat(newData) : newData);
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
    const next = page + 1;
    setPage(next);
    fetchPage(next, true);
  }, [hasMore, page, fetchPage]);

  const refresh = useCallback(() => {
    // force revalidate current pages sequentially (simple strategy)
    setItems([]);
    setPage(initialPage);
    fetchPage(initialPage, false);
  }, [fetchPage, initialPage]);

  return { items, loading, error, page, hasMore, loadMore, refresh };
}
