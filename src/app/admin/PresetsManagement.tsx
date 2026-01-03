"use client";

import React, { memo, useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, LayoutGrid, Search, Grid3X3, List, Download, MoreVertical, Tag, ChevronDown, Filter, X } from 'lucide-react';
import ImageWithLqip from '../../components/ImageWithLqip';

type PresetRow = {
  id: string;
  name: string;
  description?: string;
  prompt?: string;
  tags?: string[];
  images?: { url: string; public_id: string }[];
  dng?: { url?: string; public_id?: string; format?: string } | null;
};

interface PresetsManagementProps {
  list: any[];
  listLoading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  onCreate: () => void;
  onEdit: (preset: PresetRow) => void;
  onDelete: (preset: PresetRow) => Promise<void>;
}

export default function PresetsManagement({
  list,
  listLoading,
  hasMore,
  loadMore,
  onCreate,
  onEdit,
  onDelete
}: PresetsManagementProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    list.forEach(item => item.tags?.forEach((t: string) => tags.add(t)));
    return Array.from(tags).sort();
  }, [list]);

  // Filter items
  const filteredList = useMemo(() => {
    return list.filter(item => {
      const matchesSearch = searchQuery === '' || 
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesTags = selectedTags.length === 0 ||
        selectedTags.some(tag => item.tags?.includes(tag));
      
      return matchesSearch && matchesTags;
    });
  }, [list, searchQuery, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white">Presets</h2>
          <p className="text-zinc-400 text-sm mt-1">
            {filteredList.length} {filteredList.length === 1 ? 'preset' : 'presets'} 
            {list.length !== filteredList.length && ` (filtered from ${list.length})`}
          </p>
        </div>
        <button 
          onClick={onCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/20 text-sm"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">New Preset</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Search & Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search presets..."
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
              showFilters || selectedTags.length > 0
                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                : 'bg-zinc-900/50 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
            }`}
          >
            <Filter size={16} />
            <span className="hidden sm:inline">Filters</span>
            {selectedTags.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center">
                {selectedTags.length}
              </span>
            )}
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

      {/* Tag Filters */}
      {showFilters && allTags.length > 0 && (
        <div className="p-4 rounded-xl bg-zinc-900/30 border border-white/[0.06] space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Filter by Tags</p>
            {selectedTags.length > 0 && (
              <button 
                onClick={() => setSelectedTags([])}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedTags.includes(tag)
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white border border-white/5'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {listLoading && list.length === 0 ? (
        <div className="p-16 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 mb-4">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-zinc-500">Loading presets...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="p-16 text-center bg-zinc-900/20 border border-white/[0.06] rounded-2xl">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 text-indigo-400 mb-4">
            <LayoutGrid size={32} />
          </div>
          <h3 className="text-lg font-semibold text-white">
            {list.length === 0 ? 'No presets yet' : 'No matching presets'}
          </h3>
          <p className="text-zinc-500 mt-1 text-sm max-w-sm mx-auto">
            {list.length === 0 
              ? 'Get started by creating your first preset.' 
              : 'Try adjusting your search or filters.'}
          </p>
          {list.length === 0 && (
            <button 
              onClick={onCreate}
              className="mt-6 px-5 py-2.5 rounded-xl bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-colors text-sm font-medium"
            >
              Create First Preset
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredList.map((item) => {
            const preset: PresetRow = {
              id: item.id,
              name: item.name ?? 'Untitled',
              description: item.description ?? '',
              prompt: item.prompt,
              tags: item.tags ?? [],
              images: item.images ?? [],
              dng: item.dng ?? null,
            };
            return (
              <div 
                key={preset.id} 
                className="group relative bg-zinc-900/30 border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/10 transition-all hover:shadow-xl hover:shadow-black/20"
              >
                {/* Image */}
                <div className="aspect-[4/3] bg-zinc-800 relative overflow-hidden">
                  {preset.images && preset.images[0] ? (
                    <ImageWithLqip 
                      src={preset.images[0].url} 
                      alt={preset.name} 
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500" 
                      transformOpts={{ w: 400, h: 300, fit: 'cover' }} 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700">
                      <LayoutGrid size={48} />
                    </div>
                  )}
                  
                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                      <button 
                        onClick={() => onEdit(preset)}
                        className="flex-1 py-2 rounded-lg bg-white/90 text-black font-medium text-sm hover:bg-white transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(`Delete "${preset.name}"?`)) {
                            onDelete(preset);
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
                  {preset.images && preset.images.length > 1 && (
                    <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs font-medium">
                      +{preset.images.length - 1}
                    </div>
                  )}
                </div>
                
                {/* Content */}
                <div className="p-4">
                  <h4 className="font-semibold text-white truncate">{preset.name}</h4>
                  <p className="text-sm text-zinc-500 truncate mt-0.5">{preset.description || 'No description'}</p>
                  
                  {/* Tags */}
                  {preset.tags && preset.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {preset.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 border border-white/5">
                          {tag}
                        </span>
                      ))}
                      {preset.tags.length > 3 && (
                        <span className="text-[10px] text-zinc-600">+{preset.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-zinc-900/30 border border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
          {filteredList.map((item) => {
            const preset: PresetRow = {
              id: item.id,
              name: item.name ?? 'Untitled',
              description: item.description ?? '',
              prompt: item.prompt,
              tags: item.tags ?? [],
              images: item.images ?? [],
              dng: item.dng ?? null,
            };
            return (
              <div key={preset.id} className="flex items-center gap-4 sm:gap-6 p-4 hover:bg-white/[0.02] transition-colors group">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-zinc-800 border border-white/[0.06] flex-shrink-0">
                  {preset.images && preset.images[0] ? (
                    <ImageWithLqip 
                      src={preset.images[0].url} 
                      alt={preset.name} 
                      width={80} 
                      height={80} 
                      className="object-cover w-full h-full" 
                      transformOpts={{ w: 160, h: 160, fit: 'cover' }} 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700">
                      <LayoutGrid size={24} />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white truncate">{preset.name}</h4>
                  <p className="text-sm text-zinc-500 truncate mt-0.5 hidden sm:block">{preset.description || 'No description'}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {preset.tags?.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-md bg-white/5 text-zinc-400 border border-white/5">
                        {tag}
                      </span>
                    ))}
                    {preset.tags && preset.tags.length > 3 && (
                      <span className="text-[10px] text-zinc-600">+{preset.tags.length - 3}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onEdit(preset)}
                    className="p-2 sm:p-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Edit Preset"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => {
                      if (confirm(`Delete preset "${preset.name}"?`)) {
                        onDelete(preset);
                      }
                    }}
                    className="p-2 sm:p-2.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete Preset"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <button 
            onClick={loadMore}
            disabled={listLoading}
            className="px-6 py-2.5 rounded-xl bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {listLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ChevronDown size={16} />
                Load More Presets
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
    
