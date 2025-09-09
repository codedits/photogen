"use client";
import React, { useEffect, useState } from "react";
import ImageWithLqip from './ImageWithLqip';

export type Preset = {
  id: string;
  name: string;
  description?: string;
  prompt?: string;
  image?: string;
  images?: { url: string; public_id?: string }[];
  tags?: string[];
};

interface PresetCardProps {
  preset: Preset;
  className?: string;
}

export default function PresetCard({ preset, className = "" }: PresetCardProps) {
  const [isMd, setIsMd] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const m = window.matchMedia('(min-width: 768px)');
    const update = (ev: MediaQueryListEvent | MediaQueryList) => setIsMd(('matches' in ev) ? ev.matches : m.matches);
    setIsMd(m.matches);
    try { m.addEventListener('change', update); } catch { m.addListener(update); }
    return () => { try { m.removeEventListener('change', update); } catch { m.removeListener(update); } };
  }, []);
  const thumbnails = (preset.images && preset.images.length) ? preset.images.slice(0, 3).map(i => i.url) : (preset.image ? [preset.image] : []);

  return (
  <article className={`w-full max-w-xs sm:max-w-sm rounded-2xl overflow-hidden bg-gradient-to-br from-neutral-900/40 to-neutral-800/20 border border-white/6 shadow-lg hover:shadow-2xl transition transform-gpu hover:-translate-y-1 duration-200 mx-auto ${className}`}>

      {/* HERO */}
      <div className="relative w-full h-48 sm:h-64 md:h-72 bg-neutral-900">
        {thumbnails.length ? (
          <ImageWithLqip
            src={thumbnails[0]!}
            alt={preset.name}
            fill
            className="object-cover"
            transformOpts={{ w: 1200, h: 1200, fit: 'cover' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-200">{preset.name}</div>
        )}

        {/* dark gradient and title badge */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
        <div className="absolute left-3 bottom-3 right-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm text-center md:text-left md:text-base font-semibold text-white leading-tight truncate">{preset.name}</h3>
            {preset.description && isMd && (
              <p
                className="mt-1 text-xs text-left text-slate-200/80 line-clamp-2 overflow-hidden break-words"
                style={{
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 2,
                }}
              >
                {preset.description}
              </p>
            )}
          </div>

          <div className="flex-shrink-0">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 text-white text-[11px] sm:text-xs border border-white/6">
              <span className="font-medium">{thumbnails.length}</span>
              <span className="text-slate-300">image{thumbnails.length !== 1 ? 's' : ''}</span>
            </span>
          </div>
        </div>
      </div>

      {/* DETAILS */}
  <div className="px-3 py-2 sm:px-4 sm:py-3 bg-neutral-950/30">
        {/* description: visible on small screens as full text, hidden on sm+ because overlay shows it */}
        {preset.description ? (
          !isMd ? (
            <p
              className="text-sm text-slate-300 leading-relaxed line-clamp-3 text-center md:text-left overflow-hidden break-words"
              style={{
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 3,
              }}
            >
              {preset.description}
            </p>
          ) : null
        ) : (
          !isMd ? <p className="text-sm text-slate-400 text-center md:text-left">No description provided.</p> : null
        )}

        {/* tags */}
        {preset.tags && preset.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
            {preset.tags.slice(0, 6).map((t) => (
              <span key={t} className="text-[11px] sm:text-xs bg-white/6 text-slate-200 px-2 py-1 rounded-full">{t}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

