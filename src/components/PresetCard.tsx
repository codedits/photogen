"use client";
import React from "react";
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
  const thumbnails = (preset.images && preset.images.length) ? preset.images.slice(0, 3).map(i => i.url) : (preset.image ? [preset.image] : []);

  return (
    // card is not focusable itself; parent anchor should have `group` class
  <article className={`w-full max-w-xs sm:max-w-sm aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-neutral-900/60 to-neutral-800/40 border border-white/5 shadow-xl relative ${className}`}>
      {/* subtle inner glow */}
      <div className="absolute inset-0 pointer-events-none rounded-2xl -z-10 blur-sm opacity-60 bg-gradient-to-br from-purple-700/5 via-transparent to-purple-500/3" />

      <div className="relative w-full h-full bg-neutral-900/20 backdrop-blur-sm">
        {/* focus ring overlay: appears when parent has .group and is focused (mouse or keyboard) */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl z-30 bg-transparent ring-0 ring-transparent group-focus:ring-2 group-focus:ring-purple-400 group-focus:ring-inset group-focus-visible:ring-2 group-focus-visible:ring-purple-500 group-focus-visible:ring-inset transition-colors duration-150" />

        {thumbnails.length ? (
          <ImageWithLqip src={thumbnails[0]!} alt={preset.name} fill className="object-cover" transformOpts={{ w: 520, h: 520, fit: 'cover' }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-200">{preset.name}</div>
        )}

  {/* bottom gradient overlay: consistent panel with slight glass effect for square layout */}
  <div className="absolute inset-x-0 bottom-0 h-20 sm:h-24 z-20 bg-gradient-to-t from-black/70 via-black/30 to-transparent rounded-b-2xl backdrop-blur-sm flex items-end p-4">
          <div className="w-full">
            <h3 className="text-lg sm:text-xl font-semibold text-white leading-tight truncate drop-shadow-md">{preset.name}</h3>
          </div>
        </div>
      </div>
    </article>
  );
}
