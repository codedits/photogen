"use client";

import React, { memo, useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, LayoutGrid, Search, Grid3X3, List, ChevronDown, Filter, X } from 'lucide-react';
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

function PresetsManagement({ list, listLoading, hasMore, loadMore, onCreate, onEdit, onDelete }: PresetsManagementProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    list.forEach((item) => item.tags?.forEach((t: string) => tags.add(t)));
    return Array.from(tags).sort();
  }, [list]);

  const filteredList = useMemo(() => {
    return list.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => item.tags?.includes(tag));
      return matchesSearch && matchesTags;
    });
  }, [list, searchQuery, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Presets</h2>
          <p className="text-sm text-zinc-500">
            {filteredList.length} items{list.length !== filteredList.length ? ` of ${list.length}` : ''}
          </p>
        </div>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
        >
          <Plus size={15} />
          New Preset
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search presets"
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 py-2 pl-9 pr-9 text-sm text-zinc-100 outline-none focus:border-zinc-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm ${
              showFilters || selectedTags.length > 0 ? 'border-zinc-600 bg-zinc-800 text-zinc-100' : 'border-zinc-700 bg-zinc-950 text-zinc-400'
            }`}
          >
            <Filter size={14} />
            Filters
          </button>
          <div className="inline-flex rounded-md border border-zinc-700 bg-zinc-950">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500'}`}
              title="Grid"
            >
              <Grid3X3 size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500'}`}
              title="List"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {showFilters && allTags.length > 0 && (
        <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Tags</p>
            {selectedTags.length > 0 && (
              <button onClick={() => setSelectedTags([])} className="text-xs text-zinc-400 hover:text-zinc-200">
                Clear
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`rounded-md border px-2 py-1 text-xs ${
                  selectedTags.includes(tag) ? 'border-zinc-500 bg-zinc-800 text-zinc-100' : 'border-zinc-700 bg-zinc-950 text-zinc-400'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {listLoading && list.length === 0 ? (
        <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-10 text-center text-sm text-zinc-500">Loading presets...</div>
      ) : filteredList.length === 0 ? (
        <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-10 text-center">
          <LayoutGrid size={26} className="mx-auto text-zinc-600" />
          <p className="mt-2 text-sm text-zinc-500">No presets found</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
              <div key={preset.id} className="rounded-md border border-zinc-800 bg-zinc-900/60 overflow-hidden">
                <div className="relative aspect-[4/3] bg-zinc-950">
                  {preset.images?.[0] ? (
                    <ImageWithLqip
                      src={preset.images[0].url}
                      alt={preset.name}
                      fill
                      className="object-cover"
                      transformOpts={{ w: 400, h: 300, fit: 'cover' }}
                    />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-zinc-700">
                      <LayoutGrid size={32} />
                    </div>
                  )}
                </div>
                <div className="space-y-2 p-3">
                  <h4 className="truncate text-sm font-medium text-zinc-100">{preset.name}</h4>
                  <p className="truncate text-xs text-zinc-500">{preset.description || 'No description'}</p>
                  <div className="flex flex-wrap gap-1">
                    {preset.tags?.slice(0, 2).map((tag) => (
                      <span key={tag} className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button onClick={() => onEdit(preset)} className="rounded border border-zinc-700 px-2 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800">
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${preset.name}"?`)) onDelete(preset);
                      }}
                      className="rounded border border-red-900 bg-red-950/40 px-2 py-1.5 text-xs text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-900/60 divide-y divide-zinc-800">
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
              <div key={preset.id} className="flex items-center gap-3 p-3">
                <div className="h-14 w-14 overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 shrink-0">
                  {preset.images?.[0] ? (
                    <ImageWithLqip src={preset.images[0].url} alt={preset.name} width={56} height={56} className="h-full w-full object-cover" transformOpts={{ w: 112, h: 112, fit: 'cover' }} />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-zinc-700">
                      <LayoutGrid size={18} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-zinc-100">{preset.name}</p>
                  <p className="truncate text-xs text-zinc-500">{preset.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => onEdit(preset)} className="rounded border border-zinc-700 p-1.5 text-zinc-300 hover:bg-zinc-800" title="Edit">
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${preset.name}"?`)) onDelete(preset);
                    }}
                    className="rounded border border-red-900 bg-red-950/40 p-1.5 text-red-300"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={loadMore}
            disabled={listLoading}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-900 disabled:opacity-50"
          >
            <ChevronDown size={14} />
            {listLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(PresetsManagement);
