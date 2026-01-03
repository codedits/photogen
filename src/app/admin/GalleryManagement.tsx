"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Camera, Star, Eye, EyeOff, MapPin, Edit2, Trash2, Image as ImageIcon, Search, Grid3X3, List, Filter, X, ChevronDown } from 'lucide-react';
import ImageWithLqip from '../../components/ImageWithLqip';

interface GalleryManagementProps {
  onCreate: () => void;
  onEdit: (item: any) => void;
  onDelete: (item: any) => Promise<void>;
}

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'landscape', label: 'Landscape' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'street', label: 'Street' },
  { id: 'nature', label: 'Nature' },
  { id: 'fashion', label: 'Fashion' },
  { id: 'event', label: 'Event' },
  { id: 'commercial', label: 'Commercial' },
];

export default function GalleryManagement({ onCreate, onEdit, onDelete }: GalleryManagementProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const fetchGalleryItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/gallery?limit=100&visibility=all');
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch gallery items:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGalleryItems();
  }, [fetchGalleryItems]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = searchQuery === '' ||
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesVisibility = visibilityFilter === 'all' || item.visibility === visibilityFilter;
      
      return matchesSearch && matchesCategory && matchesVisibility;
    });
  }, [items, searchQuery, selectedCategory, visibilityFilter]);

  const stats = useMemo(() => ({
    total: items.length,
    public: items.filter(i => i.visibility === 'public').length,
    featured: items.filter(i => i.featured).length,
  }), [items]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white">Gallery</h2>
          <p className="text-zinc-400 text-sm mt-1">
            {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
            {items.length !== filteredItems.length && ` (filtered from ${items.length})`}
          </p>
        </div>
        <button 
          onClick={onCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/20 text-sm"
        >
          <Camera size={18} />
          <span className="hidden sm:inline">Add to Gallery</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-zinc-900/30 border border-white/[0.06]">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-zinc-500 mt-1">Total Items</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/30 border border-white/[0.06]">
          <p className="text-2xl font-bold text-emerald-400">{stats.public}</p>
          <p className="text-xs text-zinc-500 mt-1">Public</p>
        </div>
        <div className="p-4 rounded-xl bg-zinc-900/30 border border-white/[0.06]">
          <p className="text-2xl font-bold text-yellow-400">{stats.featured}</p>
          <p className="text-xs text-zinc-500 mt-1">Featured</p>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search gallery..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/50 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
        
        <div className="flex gap-2">
          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all flex items-center gap-2 ${
              showFilters || selectedCategory !== 'all' || visibilityFilter !== 'all'
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                : 'bg-zinc-900/50 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
            }`}
          >
            <Filter size={16} />
            <span className="hidden sm:inline">Filters</span>
          </button>

          {/* View Toggle */}
          <div className="flex rounded-xl border border-white/10 bg-zinc-900/50 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white'}`}
              title="Grid View"
            >
              <Grid3X3 size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white'}`}
              title="List View"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 rounded-xl bg-zinc-900/30 border border-white/[0.06] space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-wrap gap-4">
            {/* Category Filter */}
            <div className="flex-1 min-w-[200px]">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Category</p>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-sm focus:outline-none focus:border-indigo-500/50"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Visibility Filter */}
            <div className="flex-1 min-w-[200px]">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">Visibility</p>
              <div className="flex gap-2">
                {(['all', 'public', 'private'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setVisibilityFilter(v)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                      visibilityFilter === v
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {(selectedCategory !== 'all' || visibilityFilter !== 'all') && (
            <button
              onClick={() => { setSelectedCategory('all'); setVisibilityFilter('all'); }}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {loading && items.length === 0 ? (
        <div className="p-16 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 mb-4">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-zinc-500">Loading gallery...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-16 text-center bg-zinc-900/20 border border-white/[0.06] rounded-2xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 text-indigo-400 mb-4">
            <ImageIcon size={32} />
          </div>
          <h3 className="text-lg font-semibold text-white">
            {items.length === 0 ? 'Gallery is empty' : 'No matching items'}
          </h3>
          <p className="text-zinc-500 mt-1 text-sm max-w-sm mx-auto">
            {items.length === 0 
              ? 'Start showcasing your work by adding images.' 
              : 'Try adjusting your search or filters.'}
          </p>
          {items.length === 0 && (
            <button 
              onClick={onCreate}
              className="mt-6 px-5 py-2.5 rounded-xl bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-colors text-sm font-medium"
            >
              Add First Image
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <div 
              key={item._id} 
              className="group relative bg-zinc-900/30 border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/10 transition-all hover:shadow-xl hover:shadow-black/20"
            >
              {/* Image */}
              <div className="aspect-square bg-zinc-800 relative overflow-hidden">
                {item.images && item.images[0] ? (
                  <ImageWithLqip 
                    src={item.images[0].url} 
                    alt={item.name} 
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500" 
                    transformOpts={{ w: 400, h: 400, fit: 'cover' }} 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-700">
                    <ImageIcon size={48} />
                  </div>
                )}
                
                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                  {item.featured && (
                    <div className="px-2 py-1 rounded-lg bg-yellow-500/90 backdrop-blur-sm flex items-center gap-1">
                      <Star size={12} className="fill-white text-white" />
                      <span className="text-[10px] font-semibold text-white uppercase">Featured</span>
                    </div>
                  )}
                  <div className={`px-2 py-1 rounded-lg backdrop-blur-sm flex items-center gap-1 ${
                    item.visibility === 'public' ? 'bg-emerald-500/90' : 'bg-zinc-600/90'
                  }`}>
                    {item.visibility === 'public' ? <Eye size={12} className="text-white" /> : <EyeOff size={12} className="text-white" />}
                    <span className="text-[10px] font-semibold text-white uppercase">{item.visibility}</span>
                  </div>
                </div>
                
                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                    <button 
                      onClick={() => onEdit(item)}
                      className="flex-1 py-2 rounded-lg bg-white/90 text-black font-medium text-sm hover:bg-white transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm(`Delete "${item.name}"?`)) {
                          onDelete(item).then(fetchGalleryItems);
                        }
                      }}
                      className="p-2 rounded-lg bg-red-500/90 text-white hover:bg-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Image Count Badge */}
                {item.images && item.images.length > 1 && (
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs font-medium">
                    +{item.images.length - 1}
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="p-4">
                <h4 className="font-semibold text-white truncate">{item.name}</h4>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500">
                  <span className="capitalize px-2 py-0.5 rounded bg-white/5">{item.category}</span>
                  {item.location && (
                    <span className="flex items-center gap-1 truncate">
                      <MapPin size={10} />
                      {item.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-zinc-900/30 border border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
          {filteredItems.map((item) => (
            <div key={item._id} className="flex items-center gap-4 sm:gap-6 p-4 hover:bg-white/[0.02] transition-colors group">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-zinc-800 border border-white/[0.06] flex-shrink-0 relative">
                {item.images && item.images[0] ? (
                  <ImageWithLqip 
                    src={item.images[0].url} 
                    alt={item.name} 
                    width={80} 
                    height={80} 
                    className="object-cover w-full h-full" 
                    transformOpts={{ w: 160, h: 160, fit: 'cover' }} 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    <ImageIcon size={24} />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-white truncate">{item.name}</h4>
                  {item.featured && <Star size={14} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />}
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded flex-shrink-0 ${
                    item.visibility === 'public' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                  }`}>
                    {item.visibility}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                  <span className="capitalize">{item.category}</span>
                  {item.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={10} />
                      {item.location}
                    </span>
                  )}
                  <span>{item.images?.length || 0} images</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => onEdit(item)}
                  className="p-2 sm:p-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Edit Item"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => {
                    if (confirm(`Delete "${item.name}"?`)) {
                      onDelete(item).then(fetchGalleryItems);
                    }
                  }}
                  className="p-2 sm:p-2.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete Item"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
