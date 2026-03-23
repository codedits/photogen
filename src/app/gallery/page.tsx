"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    let isMounted = true;
    fetch('/api/gallery?limit=1')
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        const total = typeof data?.total === 'number' ? data.total : data?.pagination?.total;
        setTotalCount(typeof total === 'number' ? total : null);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle scroll for sticky header effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Memoize filters to prevent unnecessary re-renders
  const memoizedFilters = useMemo(() => filters, [filters.category, filters.featured, filters.search]);

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-white/20">
      {/* Minimal Header */}
      <section className="pt-24 pb-12 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="text-[12px] uppercase tracking-[0.3em] text-white font-medium">
              Archive / Collection
            </h1>
          </motion.div>
          
          {totalCount !== null && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="text-[11px] font-mono text-white/40 uppercase tracking-widest"
            >
              Index_{totalCount.toString().padStart(3, '0')}
            </motion.span>
          )}
        </div>
      </section>

      {/* Gallery Section with Sticky Filters */}
      <section id="gallery" className="relative z-10 pb-40">
        {/* Sticky Filter Bar Container */}
        <div className={cn(
          "sticky top-0 z-40 w-full transition-all duration-700 border-b",
          isScrolled 
            ? "bg-black/90 backdrop-blur-2xl border-white/10 py-6" 
            : "bg-[#050505] border-white/5 py-8"
        )}>
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <GalleryFilters onFiltersChange={setFilters} />
          </div>
        </div>
        
        {/* Grid Container */}
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 mt-8 md:mt-12">
          <GalleryGrid filters={memoizedFilters} />
        </div>
      </section>

      {/* Extreme Minimal Footer */}
      <footer className="py-20 border-t border-white/5 mx-6 md:mx-12">
        <div className="max-w-7xl mx-auto flex justify-between items-center opacity-20 hover:opacity-100 transition-opacity duration-700">
          <span className="text-[9px] uppercase tracking-[0.4em]">PhotoGen Portfolio</span>
          <span className="text-[9px] uppercase tracking-[0.4em]">© 2025</span>
        </div>
      </footer>
    </main>
  );
}


