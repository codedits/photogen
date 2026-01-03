"use client";

import React, { useState, useMemo } from 'react';
import GalleryGrid from './GalleryGrid';
import GalleryFilters from './GalleryFilters';

export default function GalleryPage() {
  const [filters, setFilters] = useState({
    category: '',
    featured: false,
    search: ''
  });

  // Memoize filters to prevent unnecessary re-renders
  const memoizedFilters = useMemo(() => filters, [filters.category, filters.featured, filters.search]);

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-white/20">
      {/* Header Section */}
      <section className="relative min-h-[60vh] flex flex-col justify-center pt-32 pb-16 px-6 md:px-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-[#050505] z-10" />
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[150px] animate-pulse [animation-delay:2s]" />
        </div>

        <div className="relative z-20 max-w-6xl mx-auto text-center">
          <div className="inline-block px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-[0.4em] text-white/40 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            Curated Collection
          </div>
          <h1 className="text-7xl md:text-9xl font-light tracking-tighter uppercase mb-8 leading-[0.8] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            Visual <br />
            <span className="text-white/20">Stories</span>
          </h1>
          <p className="text-lg md:text-xl text-white/40 font-light max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
            A sanctuary of light and shadow, capturing the ephemeral beauty of the human experience through a digital lens.
          </p>
          
          <div className="mt-16 flex flex-col items-center gap-4 animate-in fade-in duration-1000 delay-500">
            <div className="w-px h-24 bg-gradient-to-b from-white/20 to-transparent" />
            <span className="text-[9px] uppercase tracking-[0.5em] text-white/10 font-bold">Scroll to Explore</span>
          </div>
        </div>
      </section>

      {/* Filters & Grid */}
      <section id="gallery" className="relative z-10 px-6 md:px-12 pb-40">
        <div className="max-w-7xl mx-auto">
          {/* Filter Controls */}
          <GalleryFilters onFiltersChange={setFilters} />
          
          {/* Gallery Grid */}
          <GalleryGrid filters={memoizedFilters} />
        </div>
      </section>
    </main>
  );
}
