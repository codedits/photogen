"use client";

import React, { useState, useMemo, useEffect } from 'react';
import GalleryGrid from './GalleryGrid';
import GalleryFilters from './GalleryFilters';
import { cn } from '../../lib/utils';

export default function GalleryPage() {
  const [filters, setFilters] = useState({
    category: '',
    featured: false,
    search: ''
  });
  const [isScrolled, setIsScrolled] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // Fetch total count for the hero
  useEffect(() => {
    fetch('/api/gallery?limit=1')
      .then(res => res.json())
      .then(data => setTotalCount(data.total || null))
      .catch(() => {});
  }, []);

  // Handle scroll for sticky header effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Memoize filters to prevent unnecessary re-renders
  const memoizedFilters = useMemo(() => filters, [filters.category, filters.featured, filters.search]);

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-white/20 overflow-x-hidden">
      {/* Top Banner - compact, avoids navbar overlap */}
      <div className="pt-24 md:pt-28 pb-6 bg-transparent">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="py-6 md:py-8">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-light tracking-tight uppercase">Creative Archive</h1>
            <p className="text-sm text-white/50 mt-2">A curated collection of visual stories.</p>
          </div>
        </div>
      </div>

      {/* Gallery Section with Sticky Filters */}
      <section id="gallery" className="relative z-10 pb-40">
        {/* Sticky Filter Bar Container */}
        <div className={cn(
          "sticky top-20 md:top-24 z-40 w-full transition-all duration-500 border-b",
          isScrolled 
            ? "bg-black/80 backdrop-blur-xl border-white/10 py-4" 
            : "bg-transparent border-transparent py-8"
        )}>
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <GalleryFilters onFiltersChange={setFilters} />
          </div>
        </div>
        
        {/* Grid Container */}
        <div className="max-w-7xl mx-auto px-6 md:px-12 mt-12">
          <GalleryGrid filters={memoizedFilters} />
        </div>
      </section>

      {/* Minimal Footer Decoration */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </main>
  );
}
