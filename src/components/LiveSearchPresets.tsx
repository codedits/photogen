"use client";

import React, { memo, useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import PresetCard from "./PresetCard";
import Link from "next/link";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeGrid as Grid, type GridChildComponentProps } from "react-window";

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
  const [isPending, startTransition] = useTransition();

  // debounce
  const debouncedQuery = useDebounce(query, 300);
  const deferredResults = useDeferredValue(results);

  useEffect(() => {
    const controller = new AbortController();

    async function run() {
      setLoading(true);
      try {
        // fallback to server search for broader results / when no initial data
        const url = debouncedQuery ? `/api/presets?q=${encodeURIComponent(debouncedQuery)}` : `/api/presets`;
        const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
        const data = await res.json();
        if (data?.ok && Array.isArray(data.presets)) {
          startTransition(() => setResults(data.presets));
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        // ignore
      } finally {
        setLoading(false);
      }
    }

    run();
    return () => controller.abort();
  }, [debouncedQuery]);

  const shouldVirtualize = deferredResults.length > 16;

  const cardItems = useMemo(() => deferredResults, [deferredResults]);

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

      {(loading || isPending) && <div className="text-sm text-muted-foreground mb-2">Searching…</div>}

      {shouldVirtualize ? (
        <div className="h-[75vh] w-full">
          <AutoSizer>
            {({ height, width }) => {
              const columns = width >= 1280 ? 4 : width >= 768 ? 3 : width >= 640 ? 2 : 1;
              const rowCount = Math.ceil(cardItems.length / columns);
              const columnWidth = Math.floor(width / columns);
              const rowHeight = columns === 1 ? 420 : 500;

              return (
                <Grid
                  height={height}
                  width={width}
                  columnCount={columns}
                  rowCount={rowCount}
                  columnWidth={columnWidth}
                  rowHeight={rowHeight}
                  overscanRowCount={2}
                  itemData={{ items: cardItems, columns }}
                >
                  {VirtualPresetCell}
                </Grid>
              );
            }}
          </AutoSizer>
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

const VirtualPresetCell = memo(function VirtualPresetCell({
  columnIndex,
  rowIndex,
  style,
  data,
}: GridChildComponentProps<GridData>) {
  const index = rowIndex * data.columns + columnIndex;
  const preset = data.items[index];
  if (!preset) return <div style={style} />;

  const firstImage = preset.images?.[0]?.url || preset.image || undefined;

  return (
    <div style={{ ...style, padding: 10 }}>
      <Link href={`/presets/${preset.id}`} prefetch={false} className="group inline-block rounded-2xl w-full">
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
});

function useDebounce<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}
