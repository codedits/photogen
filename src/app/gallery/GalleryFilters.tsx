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
    setActiveCategory(category);
    onFiltersChange({
      category: category === 'All' ? '' : category,
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
    <div className="flex flex-col space-y-6 mb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Categories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-4 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-white text-black font-bold'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-white/60 transition-colors" />
          <input
            type="text"
            placeholder="SEARCH GALLERY..."
            value={searchQuery}
            onChange={handleSearch}
            className="bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-xs tracking-widest focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all w-full md:w-64"
          />
        </div>
      </div>

      {/* Secondary Filters */}
      <div className="flex items-center gap-4 border-t border-white/5 pt-6">
        <button
          onClick={toggleFeatured}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-[10px] uppercase tracking-[0.2em] transition-all ${
            isFeatured 
              ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' 
              : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'
          }`}
        >
          <Star className={`w-3 h-3 ${isFeatured ? 'fill-yellow-500' : ''}`} />
          Featured Only
        </button>
        
        <div className="h-4 w-px bg-white/10" />
        
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/20">
          Showing {activeCategory} {isFeatured ? 'Featured' : ''} Works
        </div>
      </div>
    </div>
  );
}
