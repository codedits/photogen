"use client";

import React, { useState, useCallback } from 'react';
import { Filter, Grid, Camera, Tag, Star, Search } from 'lucide-react';

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

  const handleCategoryChange = useCallback((category: string) => {
    const nextCategory = category === 'All' ? '' : category;
    setActiveCategory(category);
    // send explicit values to avoid stale closure issues
    onFiltersChange({
      category: nextCategory,
      featured: isFeatured,
      search: searchQuery
    });
  }, [isFeatured, searchQuery, onFiltersChange]);

  const toggleFeatured = useCallback(() => {
    // use functional updater to ensure we read the latest state
    setIsFeatured(prev => {
      const nextFeatured = !prev;
      onFiltersChange({
        category: activeCategory === 'All' ? '' : activeCategory,
        featured: nextFeatured,
        search: searchQuery
      });
      return nextFeatured;
    });
  }, [activeCategory, searchQuery, onFiltersChange]);

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
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Categories - Scrollable on mobile, wrapped on desktop */}
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-4 py-1.5 rounded-full text-[9px] uppercase tracking-[0.2em] transition-all duration-500 border ${
                activeCategory === cat
                  ? 'bg-white text-black border-white font-bold shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                  : 'bg-white/[0.03] text-white/30 border-white/5 hover:border-white/20 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search & Featured Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            type="button"
            aria-pressed={isFeatured}
            onClick={toggleFeatured}
            className={`flex items-center justify-center gap-2 px-5 py-2 rounded-full text-[9px] uppercase tracking-[0.2em] transition-all duration-500 border ${
              isFeatured 
                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.05)]' 
                : 'bg-white/[0.03] text-white/30 border-white/5 hover:border-white/20 hover:text-white'
            }`}
            title={isFeatured ? 'Disable featured filter' : 'Show featured only'}
          >
            <Star className={`w-3 h-3 ${isFeatured ? 'fill-yellow-500' : ''}`} />
            <span>Featured</span>
          </button>

          <div className="relative group flex-1 sm:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 group-focus-within:text-white/60 transition-colors" />
            <input
              type="text"
              placeholder="SEARCH COLLECTION"
              value={searchQuery}
              onChange={handleSearch}
              className="bg-white/[0.03] border border-white/5 rounded-full py-2 pl-10 pr-4 text-[9px] tracking-[0.2em] focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all w-full placeholder:text-white/10"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
