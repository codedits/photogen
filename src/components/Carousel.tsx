"use client";
import React from 'react';
import ImageWithLqip from './ImageWithLqip';

type Item = { url: string; alt?: string };

export default function Carousel({ items, className = "" }: { items: Item[]; className?: string }) {
  const [index, setIndex] = React.useState(0);
  // carousel uses a fixed container size now
  const len = items.length;
  const prev = React.useCallback(() => setIndex((i) => (i - 1 + len) % len), [len]);
  const next = React.useCallback(() => setIndex((i) => (i + 1) % len), [len]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next]);

  // Basic touch support
  const startX = React.useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const delta = e.changedTouches[0].clientX - startX.current;
    if (delta > 40) prev();
    else if (delta < -40) next();
    startX.current = null;
  };

  const current = items[index];

  return (
    <div className={`group ${className}`}>
      <div
        className="relative w-full max-w-4xl h-[520px] sm:h-[640px] rounded-lg overflow-hidden bg-slate-900"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
  <ImageWithLqip src={current.url} alt={current.alt || `slide-${index+1}`} fill className="object-cover" transformOpts={{ w: 1280, h: 800, fit: 'cover' }} />
        {/* Arrows */}
        <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full h-9 w-9 flex items-center justify-center">‹</button>
        <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full h-9 w-9 flex items-center justify-center">›</button>
      </div>
      {/* Thumbnails */}
      {len > 1 && (
        <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {items.slice(0, 12).map((item, i) => (
            <button key={i} className={`relative h-16 rounded overflow-hidden border ${i===index ? 'border-white/70' : 'border-white/10'}`} onClick={() => setIndex(i)}>
              <ImageWithLqip src={item.url} alt={`thumb-${i+1}`} fill className="object-cover" transformOpts={{ w: 160, h: 96, fit: 'cover' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
