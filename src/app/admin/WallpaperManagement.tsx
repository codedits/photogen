"use client";

import React, { memo, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Camera, Star, Eye, EyeOff, MapPin, Edit2, Trash2, Image as ImageIcon, Search, Grid3X3, List, Filter, X } from 'lucide-react';
import ImageWithLqip from '../../components/ImageWithLqip';
import ConfirmDialog from './components/ConfirmDialog';

interface WallpaperManagementProps {
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

function WallpaperManagement({ onCreate, onEdit, onDelete }: WallpaperManagementProps) {
  const isMountedRef = useRef(true);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'private'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchWallpaperItems = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const res = await fetch('/api/wallpapers?limit=100&visibility=all', {
        cache: 'no-store',
        signal,
      });
      const data = await res.json();
      if (res.ok && isMountedRef.current && !signal?.aborted) {
        setItems(data.items || []);
      }
    } catch (error) {
      if ((error as Error)?.name !== 'AbortError') {
        console.error('Failed to fetch wallpapers:', error);
      }
    } finally {
      if (isMountedRef.current && !signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const controller = new AbortController();
    fetchWallpaperItems(controller.signal);
    return () => {
      isMountedRef.current = false;
      controller.abort();
    };
  }, [fetchWallpaperItems]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesVisibility = visibilityFilter === 'all' || item.visibility === visibilityFilter;
      return matchesSearch && matchesCategory && matchesVisibility;
    });
  }, [items, searchQuery, selectedCategory, visibilityFilter]);

  const requestDelete = (item: any) => setPendingDelete(item);

  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      await onDelete(pendingDelete);
      await fetchWallpaperItems();
    } catch (err) {
      console.error('Failed to delete wallpaper:', err);
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  return (
    <div className="space-y-5">
      <ConfirmDialog
        isOpen={!!pendingDelete}
        title="Delete wallpaper"
        message={pendingDelete ? `This will permanently delete "${pendingDelete.name}".` : ''}
        confirmText="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setPendingDelete(null)}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-normal text-zinc-100">Wallpaper</h2>
          <p className="text-sm text-zinc-500">
            {filteredItems.length} items{items.length !== filteredItems.length ? ` of ${items.length}` : ''}
          </p>
        </div>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
        >
          <Camera size={15} />
          Add Item
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search wallpaper"
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
              showFilters || selectedCategory !== 'all' || visibilityFilter !== 'all'
                ? 'border-zinc-600 bg-zinc-800 text-zinc-100'
                : 'border-zinc-700 bg-zinc-950 text-zinc-400'
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

      {showFilters && (
        <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-500">Visibility</label>
            <div className="grid grid-cols-3 gap-2">
              {(['all', 'public', 'private'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVisibilityFilter(v)}
                  className={`rounded-md border px-2 py-2 text-xs capitalize ${
                    visibilityFilter === v ? 'border-zinc-500 bg-zinc-800 text-zinc-100' : 'border-zinc-700 bg-zinc-950 text-zinc-400'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-10 text-center text-sm text-zinc-500">Loading wallpaper...</div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-10 text-center">
          <ImageIcon size={26} className="mx-auto text-zinc-600" />
          <p className="mt-2 text-sm text-zinc-500">No wallpapers found</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => (
            <div key={item._id} className="rounded-md border border-zinc-800 bg-zinc-900/60 overflow-hidden">
              <div className="relative aspect-square bg-zinc-950">
                {item.images?.[0] ? (
                  <ImageWithLqip src={item.images[0].url} alt={item.name} fill className="object-cover" transformOpts={{ w: 400, h: 400, fit: 'cover' }} />
                ) : (
                  <div className="h-full w-full grid place-items-center text-zinc-700">
                    <ImageIcon size={32} />
                  </div>
                )}
                <div className="absolute left-2 top-2 flex gap-1">
                  {item.featured && (
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-normal text-zinc-900 inline-flex items-center gap-1">
                      <Star size={10} /> Featured
                    </span>
                  )}
                  <span className="rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-zinc-100 inline-flex items-center gap-1">
                    {item.visibility === 'public' ? <Eye size={10} /> : <EyeOff size={10} />}
                    {item.visibility}
                  </span>
                </div>
              </div>
              <div className="space-y-2 p-3">
                <h4 className="truncate text-sm font-medium text-zinc-100">{item.name}</h4>
                <p className="truncate text-xs text-zinc-500">{item.category}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={() => onEdit(item)} className="rounded border border-zinc-700 px-2 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800">
                    Edit
                  </button>
                  <button
                    onClick={() => requestDelete(item)}
                    className="rounded border border-red-900 bg-red-950/40 px-2 py-1.5 text-xs text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-900/60 divide-y divide-zinc-800">
          {filteredItems.map((item) => (
            <div key={item._id} className="flex items-center gap-3 p-3">
              <div className="h-14 w-14 overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 shrink-0">
                {item.images?.[0] ? (
                  <ImageWithLqip src={item.images[0].url} alt={item.name} width={56} height={56} className="h-full w-full object-cover" transformOpts={{ w: 112, h: 112, fit: 'cover' }} />
                ) : (
                  <div className="h-full w-full grid place-items-center text-zinc-700">
                    <ImageIcon size={18} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm text-zinc-100">{item.name}</p>
                  {item.featured && <Star size={12} className="text-zinc-300" />}
                </div>
                <p className="truncate text-xs text-zinc-500 inline-flex items-center gap-1">
                  {item.category}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => onEdit(item)} className="rounded border border-zinc-700 p-1.5 text-zinc-300 hover:bg-zinc-800" title="Edit">
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => requestDelete(item)}
                  className="rounded border border-red-900 bg-red-950/40 p-1.5 text-red-300 hover:bg-red-950"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(WallpaperManagement);
