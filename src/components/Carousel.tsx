"use client";
import React from 'react';
import ImageWithLqip from './ImageWithLqip';

type Item = { url: string; alt?: string };

type CarouselProps = {
  items: Item[];
  className?: string;
  initialIndex?: number;
  autoPlay?: boolean;
  intervalMs?: number;
  showDots?: boolean;
  showThumbs?: boolean;
};

export default function Carousel({
  items,
  className = "",
  initialIndex = 0,
  autoPlay = false,
  intervalMs = 4000,
  showDots = true,
  showThumbs = true,
}: CarouselProps) {
  const len = items.length;
  const [index, setIndex] = React.useState(() => Math.min(Math.max(initialIndex, 0), Math.max(len - 1, 0)));
  const [paused, setPaused] = React.useState(false);
  const [isFocus, setIsFocus] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const thumbsRef = React.useRef<Array<HTMLButtonElement | null>>([]);

  const prev = React.useCallback(() => setIndex((i) => (len ? (i - 1 + len) % len : 0)), [len]);
  const next = React.useCallback(() => setIndex((i) => (len ? (i + 1) % len : 0)), [len]);

  // Keyboard navigation when focused
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (!isFocus) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next, isFocus]);

  // Touch swipe
  const startX = React.useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const delta = e.changedTouches[0].clientX - startX.current;
    if (delta > 40) prev();
    else if (delta < -40) next();
    startX.current = null;
  };

  // Autoplay with hover/focus pause and reduced motion
  React.useEffect(() => {
    if (!autoPlay || len < 2) return;
    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    if (paused || isFocus) return;
    // do not autoplay while tab is hidden (browsers throttle timers heavily when backgrounded)
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const id = setInterval(() => { next(); }, Math.max(intervalMs, 1500));
    return () => clearInterval(id);
  }, [autoPlay, intervalMs, paused, isFocus, len, next]);

  // Ensure active thumbnail is visible
  React.useEffect(() => {
    const btn = thumbsRef.current[index];
    if (btn && typeof btn.scrollIntoView === 'function') {
      btn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
  }, [index, isFocus]);

  const current = items[index];

  // Preload adjacent images to speed up transitions
  React.useEffect(() => {
    if (!items || items.length < 2) return;
    const toPreload: string[] = [];
    const nextIdx = (index + 1) % items.length;
    const prevIdx = (index - 1 + items.length) % items.length;
    // preload next and previous images
    toPreload.push(items[nextIdx].url);
    toPreload.push(items[prevIdx].url);

    const imgs: HTMLImageElement[] = toPreload.map((u) => {
      const img = new Image();
      img.src = u;
      return img;
    });

    return () => {
      imgs.forEach((i) => { try { i.src = ''; } catch {} });
    };
  }, [index, items]);

  if (!len) {
    return (
      <div className={`w-full ${className}`}>
  <div className="w-full aspect-[9/16] max-h-[720px] sm:max-h-none sm:h-[520px] md:h-[520px] rounded-lg bg-slate-800 animate-pulse" />
      </div>
    );
  }

  // Blurred backdrop removed to avoid background LQIP and reduce visual complexity.

  return (
    <div className={`group ${className}`} ref={containerRef}
      role="region" aria-roledescription="carousel" aria-label="Image carousel"
      tabIndex={0}
      onFocus={() => setIsFocus(true)} onBlur={() => setIsFocus(false)}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
    >
      {/* Stage */}
      <div
        className="relative w-full max-w-3xl aspect-[9/16] max-h-[720px] sm:max-h-none sm:h-[520px] md:h-[520px] rounded-xl overflow-hidden bg-slate-900"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
  {/* blurred backdrop to avoid empty letterbox when image is object-contain */}
  <div className="relative z-10 w-full h-full flex items-center justify-center">
          <ImageWithLqip
            src={current.url}
            alt={current.alt || `Slide ${index + 1}`}
            fill
            className="object-contain bg-transparent transition-opacity duration-300"
            transformOpts={{ w: 1920, h: 1080, fit: 'contain', q: 'auto:best', dpr: 'auto' }}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 1920px"
            // always eagerly load & prioritize the active slide to reduce perceived delay
            priority={true}
            loading={'eager'}
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {/* Controls */}
        {len > 1 && (
          <>
            <button aria-label="Previous slide" onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center backdrop-blur-[1px] z-20">
              ‹
            </button>
            <button aria-label="Next slide" onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center backdrop-blur-[1px] z-20">
              ›
            </button>
          </>
        )}

        {/* Dots */}
        {showDots && len > 1 && (
          <div className="absolute left-0 right-0 bottom-3 flex items-center justify-center gap-2">
            {items.map((_, i) => (
              <button key={i} aria-label={`Go to slide ${i + 1}`} aria-current={i === index}
                onClick={() => setIndex(i)}
                className={`h-2.5 w-2.5 rounded-full transition-all ${i === index ? 'bg-white/90 w-6' : 'bg-white/40 hover:bg-white/60'}`} />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {showThumbs && len > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-1">
          {items.slice(0, 24).map((item, i) => (
            <button
              key={i}
              ref={(el) => { thumbsRef.current[i] = el; }}
              className={`relative h-14 w-20 sm:h-16 sm:w-24 flex-shrink-0 rounded-lg overflow-hidden border transition-colors ${i === index ? 'border-white/80' : 'border-white/10 hover:border-white/30'}`}
              onClick={() => setIndex(i)}
              aria-label={`Slide ${i + 1}`}
              aria-current={i === index}
            >
              <ImageWithLqip src={item.url} alt={`thumb-${i + 1}`} fill className="object-cover" transformOpts={{ w: 440, h: 300, fit: 'cover', q: 'auto:good', dpr: 1 }} sizes="100px" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
