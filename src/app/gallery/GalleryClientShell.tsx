"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import GalleryGrid from './GalleryGrid';
import GalleryFilters from './GalleryFilters';
import { cn } from '../../lib/utils';

interface GalleryItem {
  _id: string;
  name: string;
  description?: string;
  images: { url: string; public_id: string }[];
  category: string;
  tags: string[];
  featured: boolean;
  visibility: 'public' | 'private';
  uploadDate: Date;
  photographer?: string;
  location?: string;
  equipment?: string;
  metadata?: {
    aperture?: string;
    shutter?: string;
    iso?: number;
    focal_length?: string;
  };
}

interface GalleryClientShellProps {
  initialItems: GalleryItem[];
  totalCount: number;
  headerText?: string;
  apiUrl?: string;
  basePath?: string;
}

export default function GalleryClientShell({ 
  initialItems, 
  totalCount,
  headerText = "Archive / Collection",
  apiUrl = "/api/gallery",
  basePath = "/gallery"
}: GalleryClientShellProps) {
  const [filters, setFilters] = useState({
    category: '',
    featured: false,
    search: ''
  });
  const [resetSignal, setResetSignal] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  const handleResetFilters = () => {
    setFilters({ category: '', featured: false, search: '' });
    setResetSignal((prev) => prev + 1);
  };

  // Handle scroll for sticky header effect
  useEffect(() => {
    let rafId = 0;
    const handleScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        const next = window.scrollY > 50;
        setIsScrolled((prev) => (prev === next ? prev : next));
        rafId = 0;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Memoize filters to prevent unnecessary re-renders
  const memoizedFilters = useMemo(() => filters, [filters.category, filters.featured, filters.search]);

  return (
    <main className="min-h-screen text-foreground selection:bg-foreground/20">
      {/* Minimal Header */}
      <section className="pt-24 pb-12 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="text-[12px] uppercase tracking-[0.3em] text-foreground font-medium">
              {headerText}
            </h1>
          </motion.div>
          
          {totalCount > 0 && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest"
            >
              Index_{totalCount.toString().padStart(3, '0')}
            </motion.span>
          )}
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="relative z-10 pb-20">
        {/* Filter Bar Container */}
        <div className={cn(
          "relative z-40 w-full transition-all duration-700 border-b",
          isScrolled 
            ? "bg-background/90 backdrop-blur-2xl border-border py-6" 
            : "border-transparent py-8"
        )}>
          <div className="max-w-7xl mx-auto px-6 md:px-12">
            <GalleryFilters onFiltersChange={setFilters} resetSignal={resetSignal} />
          </div>
        </div>
        
        {/* Full-Bleed Grid Container */}
        <div className="max-w-[100vw] mx-auto px-0 mt-8 md:mt-12">
          <GalleryGrid 
            filters={memoizedFilters} 
            initialItems={initialItems} 
            initialTotal={totalCount} 
            onResetFilters={handleResetFilters}
            apiUrl={apiUrl}
            basePath={basePath}
          />
        </div>
      </section>

      {/* Extreme Minimal Footer */}
      <footer className="py-20 border-t border-border mx-6 md:mx-12">
        <div className="max-w-7xl mx-auto flex justify-between items-center opacity-20 hover:opacity-100 transition-opacity duration-700">
          <span className="text-[9px] uppercase tracking-[0.4em] text-foreground">PhotoGen Portfolio</span>
          <span className="text-[9px] uppercase tracking-[0.4em] text-foreground">© 2025</span>
        </div>
      </footer>
    </main>
  );
}
