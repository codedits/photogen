"use client";

import React, { useEffect, useState, useDeferredValue } from "react";
import PresetCard from "./PresetCard";
import Link from "next/link";
import { AutoSizer } from "react-virtualized-auto-sizer";
import { Grid, type CellComponentProps } from "react-window";
import { useQuery } from "@tanstack/react-query";

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
  
  // debounce (using handrolled for fine-grained search control if needed, but useQuery handles most)
  const debouncedQuery = useDebounce(query, 300);

  const { data: results = initial, isLoading } = useQuery({
    queryKey: ['presets', debouncedQuery],
    queryFn: async ({ signal }) => {
      const url = debouncedQuery ? `/api/presets?q=${encodeURIComponent(debouncedQuery)}` : `/api/presets`;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      return json.presets as PresetShape[];
    },
    staleTime: 5 * 60 * 1000, 
  });

  const shouldVirtualize = results.length > 16;
  const cardItems = results;

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search presets…"
          className="flex-1 p-2 rounded bg-secondary/50 border border-border focus:outline-none focus:border-foreground transition-colors"
        />
        <button type="button" onClick={() => setQuery('')} className="px-3 py-2 rounded bg-secondary hover:bg-secondary/80 transition-colors text-foreground">Clear</button>
      </div>

      {isLoading && <div className="text-sm text-muted-foreground mb-2 animate-pulse">Searching…</div>}

      {shouldVirtualize ? (
        <div className="h-[75vh] w-full">
          <AutoSizer
            renderProp={({ height, width }: { height: number | undefined; width: number | undefined }) => {
              const safeWidth = width || 0;
              const safeHeight = height || 0;

              if (safeWidth === 0 || safeHeight === 0) {
                return null;
              }

              const columns = safeWidth >= 1280 ? 4 : safeWidth >= 768 ? 3 : safeWidth >= 640 ? 2 : 1;
              const rowCount = Math.ceil(cardItems.length / columns);
              const columnWidth = Math.floor(safeWidth / columns);
              const rowHeight = columns === 1 ? 420 : 500;

              return (
                <Grid
                  defaultHeight={safeHeight}
                  defaultWidth={safeWidth}
                  columnCount={columns}
                  rowCount={rowCount}
                  columnWidth={columnWidth}
                  rowHeight={rowHeight}
                  overscanCount={2}
                  cellComponent={VirtualPresetCell}
                  cellProps={{ items: cardItems, columns }}
                  style={{ height: safeHeight, width: safeWidth }}
                >
                </Grid>
              );
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {cardItems.map((p) => {
            const firstImage = p.images?.[0]?.url || p.image || undefined;
            return (
              <Link key={p.id} href={`/presets/${p.id}`} prefetch className="group inline-block rounded-2xl">
                <PresetCard preset={{ id: p.id, name: p.name, description: p.description, prompt: p.prompt, image: firstImage, tags: p.tags, images: p.images }} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

type GridData = {
  items: PresetShape[];
  columns: number;
};

function VirtualPresetCell({
  columnIndex,
  rowIndex,
  style,
  items,
  columns,
}: CellComponentProps<GridData>) {
  const index = rowIndex * columns + columnIndex;
  const preset = items[index];
  if (!preset) return <div style={style} />;

  const firstImage = preset.images?.[0]?.url || preset.image || undefined;

  return (
    <div style={{ ...style, padding: 10 }}>
      <Link href={`/presets/${preset.id}`} prefetch className="group inline-block rounded-2xl w-full">
        <PresetCard
          preset={{
            id: preset.id,
            name: preset.name,
            description: preset.description,
            prompt: preset.prompt,
            image: firstImage,
            tags: preset.tags,
            images: preset.images,
          }}
        />
      </Link>
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
