"use client";

import React, { useEffect, useRef, useState } from 'react';

type GallerySectionProps = { images?: string[] };

export default function GallerySection({ images = [] }: GallerySectionProps) {
  // Use picsum.photos to provide sample photos when no images are passed.
  // We use a deterministic `seed` query so images are stable across reloads.
  const defaults = Array.from({ length: 16 }).map((_, i) =>
    `https://picsum.photos/seed/${i}/800/${600 + (i % 5) * 120}`
  );

  const items = images.length ? images : defaults;

  const gridRef = useRef<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // After an image loads, compute how many row spans it should take.
  const resizeItem = (img: HTMLImageElement) => {
    const grid = gridRef.current;
    if (!grid) return;
    const rowHeight = parseInt(
      window.getComputedStyle(grid).getPropertyValue('grid-auto-rows') || '8'
    );
    const rowGap = parseInt(
      window.getComputedStyle(grid).getPropertyValue('gap') || '8'
    );
    const item = img.closest('.gallery-item') as HTMLElement | null;
    if (!item) return;
    const height = img.getBoundingClientRect().height;
    const span = Math.ceil((height + rowGap) / (rowHeight + rowGap));
    item.style.gridRowEnd = `span ${span}`;
  };

  useEffect(() => {
    // Resize any already-loaded images on mount (useful when navigating back)
    const grid = gridRef.current;
    if (!grid) return;
    const imgs = Array.from(grid.querySelectorAll('img')) as HTMLImageElement[];
    imgs.forEach((img) => {
      if (img.complete) resizeItem(img);
    });
    // Recalculate on window resize to keep layout consistent
    const onResize = () => imgs.forEach((img) => resizeItem(img));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [items]);

  return (
    <section id="gallery" className="w-full">
      <h2 className="text-2xl sm:text-3xl font-semibold mb-4">Gallery</h2>

      {/* Dynamic CSS-grid masonry */}
      <div
        ref={gridRef}
        className="w-full"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gridAutoRows: '8px',
          gap: '12px',
        }}
      >
        {items.map((src, idx) => (
          <div
            key={idx}
            className="gallery-item rounded overflow-hidden bg-[rgba(255,255,255,0.02)] transform transition-shadow duration-200"
            style={{ minHeight: 140 }}
            onClick={() => setSelected(src)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setSelected(src);
            }}
          >
            <img
              src={src}
              alt={`Unsplash sample ${idx + 1}`}
              className="w-full h-auto object-cover block hover:scale-105 transition-transform duration-300 cursor-pointer"
              loading="lazy"
              decoding="async"
              onLoad={(e) => resizeItem(e.currentTarget as HTMLImageElement)}
              onError={(e) => {
                try {
                  (e.currentTarget as HTMLImageElement).src = '/file.svg';
                } catch {
                  /* ignore */
                }
              }}
            />
          </div>
        ))}
      </div>

      {/* Lightbox preview */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.6)]"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-w-[90%] max-h-[90%] p-4 bg-transparent"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selected}
              alt="Preview"
              className="w-full h-auto object-contain rounded"
            />
          </div>
        </div>
      )}
    </section>
  );
}
