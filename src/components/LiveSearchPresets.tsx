"use client";

import React, { useEffect, useState } from "react";
import PresetCard from "./PresetCard";
import Link from "next/link";

type PresetShape = {
  id: string;
  name: string;
  description?: string;
  prompt?: string;
  image?: string | null;
  images?: { url: string; public_id: string }[];
  tags?: string[];
};

export default function LiveSearchPresets({ initial = [] }: { initial?: PresetShape[] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PresetShape[]>(initial);
  const [loading, setLoading] = useState(false);

  // debounce
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    let mounted = true;
    async function run() {
      // If we have initial presets, do a fast local filter first to improve UX.
      setLoading(true);
      try {
        const q = debouncedQuery.trim();
        if (q && initial && initial.length) {
          const tokens = q.split(/\s+/).map((t) => t.trim()).filter(Boolean);
          const matches = initial.filter((p) => {
            const name = (p.name || '').toLowerCase();
            const tagList = (p.tags || []).map((t) => String(t).toLowerCase());
            return tokens.every((tok) => {
              const t2 = tok.toLowerCase();
              if (name.includes(t2)) return true;
              for (const tg of tagList) if (tg.includes(t2)) return true;
              return false;
            });
          });
          if (mounted) {
            setResults(matches);
            setLoading(false);
            return;
          }
        }

        // fallback to server search for broader results / when no initial data
        const url = debouncedQuery ? `/api/presets?q=${encodeURIComponent(debouncedQuery)}` : `/api/presets`;
        const res = await fetch(url, { cache: 'no-store' });
        const data = await res.json();
        if (!mounted) return;
        if (data?.ok && Array.isArray(data.presets)) setResults(data.presets);
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false);
      }
    }
    run();
    return () => { mounted = false; };
  }, [debouncedQuery, initial]);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search presets…"
          className="flex-1 p-2 rounded bg-white/5"
        />
        <button type="button" onClick={() => setQuery('')} className="px-3 py-2 rounded bg-white/10">Clear</button>
      </div>

      {loading && <div className="text-sm text-slate-400 mb-2">Searching…</div>}

  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {results.map((p) => {
          const firstImage = p.images?.[0]?.url || p.image || undefined;
          return (
            <Link key={p.id} href={`/presets/${p.id}`} prefetch className="group inline-block rounded-2xl">
              <PresetCard preset={{ id: p.id, name: p.name, description: p.description, prompt: p.prompt, image: firstImage, tags: p.tags, images: p.images }} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function useDebounce<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}
