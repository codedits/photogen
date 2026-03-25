"use client";

import React, { useState, useCallback } from 'react';
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
}

export default function GalleryFilters({ onFiltersChange }: GalleryFiltersProps) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [isFeatured, setIsFeatured] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleCategoryChange = useCallback((category: string) => {
    const nextCategory = category === 'All' ? '' : category;
    setActiveCategory(category);
    onFiltersChange({
      category: nextCategory,
      featured: isFeatured,
      search: searchQuery
    });
  }, [isFeatured, searchQuery, onFiltersChange]);

  const toggleFeatured = useCallback(() => {
    const nextFeatured = !isFeatured;
    setIsFeatured(nextFeatured);
    onFiltersChange({
      category: activeCategory === 'All' ? '' : activeCategory,
      featured: nextFeatured,
      search: searchQuery
    });
  }, [isFeatured, activeCategory, searchQuery, onFiltersChange]);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onFiltersChange({
      category: activeCategory === 'All' ? '' : activeCategory,
      featured: isFeatured,
      search: query
    });
  }, [activeCategory, isFeatured, onFiltersChange]);

  return (
    <div className="flex items-center justify-between w-full">
      {/* Category List - Minimal Horizontal Scroll */}
      <div className="flex items-center gap-8 md:gap-12 overflow-x-auto no-scrollbar py-2 overflow-y-hidden">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className={`whitespace-nowrap text-[11px] md:text-[12px] uppercase tracking-widest transition-all duration-700 relative group ${
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
          className={`text-[11px] md:text-[12px] uppercase tracking-widest transition-all duration-700 whitespace-nowrap ${
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
            className={`transition-all duration-700 ${isSearchOpen ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

