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
    <main className="min-h-screen bg-[#050505] text-white">
      {/* Header Section */}
      <section className="relative overflow-hidden pt-32 pb-16 px-6 md:px-12">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/80 z-10" />
        <div className="absolute inset-0 opacity-20" 
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=1600&auto=format&fit=crop")', backgroundSize: 'cover', backgroundPosition: 'center' }} 
        />
        
        <div className="relative z-20 max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-light tracking-tighter uppercase mb-6 leading-[0.9]">
            Gallery
          </h1>
          <p className="text-lg md:text-xl text-white/70 font-light max-w-2xl mx-auto leading-relaxed">
            A curated collection of visual stories capturing moments, emotions, and the beauty of our world
          </p>
          <div className="mt-8 h-px w-24 bg-white/40 mx-auto" />
        </div>
      </section>

      {/* Filters & Grid */}
      <section id="gallery" className="relative z-10 px-6 md:px-12 pb-24">
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
