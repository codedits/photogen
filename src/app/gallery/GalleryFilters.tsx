"use client";

import React, { useState, useCallback, useEffect, memo } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
  'All',
  'portrait',
  'landscape', 
  'architecture',
  'street',
  'nature',
  'fashion',
  'event',
  'commercial'
];

interface GalleryFiltersProps {
  onFiltersChange: (filters: {
    category: string;
    featured: boolean;
    search: string;
  }) => void;
  resetSignal?: number;
}

function useDebouncedValue<T>(value: T, delay = 220) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

function GalleryFilters({ onFiltersChange, resetSignal = 0 }: GalleryFiltersProps) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [isFeatured, setIsFeatured] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250);

  useEffect(() => {
    onFiltersChange({
      category: activeCategory === 'All' ? '' : activeCategory,
      featured: isFeatured,
      search: debouncedSearchQuery,
    });
  }, [activeCategory, isFeatured, debouncedSearchQuery, onFiltersChange]);

  useEffect(() => {
    setActiveCategory('All');
    setIsFeatured(false);
    setSearchQuery('');
    setIsSearchOpen(false);
  }, [resetSignal]);

  const handleCategoryChange = useCallback((category: string) => {
    setActiveCategory(category);
  }, []);

  const toggleFeatured = useCallback(() => {
    setIsFeatured((prev) => !prev);
  }, []);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  return (
    <div className="flex items-center justify-between w-full">
      {/* Category List - Minimal Horizontal Scroll */}
      <div role="tablist" aria-label="Gallery categories" className="flex items-center gap-8 md:gap-12 overflow-x-auto hide-scrollbar py-2 overflow-y-hidden">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            role="tab"
            aria-selected={activeCategory === cat}
            aria-label={`Filter by ${cat}`}
            className={`focus-ring min-h-11 whitespace-nowrap text-[11px] md:text-[12px] uppercase tracking-widest transition-all duration-700 relative group ${
              activeCategory === cat ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat}
            {activeCategory === cat && (
              <motion.div 
                layoutId="activeCategory"
                className="absolute -bottom-2 left-0 right-0 h-px bg-foreground/40"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-8 md:gap-12 pl-8 border-l border-border ml-8">
        {/* Featured Toggle */}
        <button
          onClick={toggleFeatured}
          aria-pressed={isFeatured}
          aria-label="Toggle featured filter"
          className={`focus-ring min-h-11 text-[11px] md:text-[12px] uppercase tracking-widest transition-all duration-700 whitespace-nowrap ${
            isFeatured ? 'text-foreground font-medium italic' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Featured
        </button>

        {/* Dynamic Search */}
        <div className="flex items-center gap-4 relative">
          <AnimatePresence>
            {isSearchOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 180, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                  <input
                  type="text"
                  autoFocus
                  aria-label="Search gallery"
                  placeholder="FILTER BY NAME"
                  value={searchQuery}
                  onChange={handleSearch}
                  className="bg-transparent border-b border-border text-[11px] tracking-widest uppercase w-full py-1 focus:outline-none focus:border-foreground transition-all placeholder:text-muted-foreground"
                />
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            aria-label={isSearchOpen ? 'Close gallery search' : 'Open gallery search'}
            aria-expanded={isSearchOpen}
            className={`focus-ring min-h-11 transition-all duration-700 ${isSearchOpen ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(GalleryFilters);

