"use client";

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpDown, BookOpenText, Calendar, Clock, Edit2, ExternalLink,
  Eye, EyeOff, Plus, Search, Trash2, X,
} from 'lucide-react';

export type BlogRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  tags: string[];
  status: 'draft' | 'published';
  layout?: 'standard' | 'magazine' | 'minimal';
  readingTime?: number;
  publishedAt: string | null;
  updatedAt: string;
  coverImage?: { url: string; public_id: string } | null;
};

interface BlogManagementProps {
  onCreate: () => void;
  onEdit: (post: BlogRow) => void;
  onDelete: (post: BlogRow) => Promise<void>;
}

type SortKey = 'newest' | 'oldest' | 'title';

function BlogManagement({ onCreate, onEdit, onDelete }: BlogManagementProps) {
  const [items, setItems] = useState<BlogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/blog?status=all&limit=100', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setItems((data.posts || []) as BlogRow[]);
      }
    } catch (err) {
      console.error('Failed to load blog posts', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleToggleStatus = useCallback(async (post: BlogRow) => {
    const nextStatus = post.status === 'published' ? 'draft' : 'published';
    setToggling(post.id);
    try {
      const res = await fetch(`/api/blog/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((p) =>
            p.id === post.id ? { ...p, status: nextStatus, publishedAt: nextStatus === 'published' ? new Date().toISOString() : null } : p
          )
        );
      }
    } catch (err) {
      console.error('Toggle status failed:', err);
    } finally {
      setToggling(null);
    }
  }, []);

  const filtered = useMemo(() => {
    let result = items.filter((item) => {
      const matchQuery =
        query === '' ||
        item.title?.toLowerCase().includes(query.toLowerCase()) ||
        item.slug?.toLowerCase().includes(query.toLowerCase()) ||
        item.tags?.some((tag) => tag.toLowerCase().includes(query.toLowerCase()));
      const matchStatus = status === 'all' || item.status === status;
      return matchQuery && matchStatus;
    });

    // Sort
    if (sort === 'newest') {
      result.sort((a, b) => {
        const da = a.publishedAt || a.updatedAt || '';
        const db = b.publishedAt || b.updatedAt || '';
        return db.localeCompare(da);
      });
    } else if (sort === 'oldest') {
      result.sort((a, b) => {
        const da = a.publishedAt || a.updatedAt || '';
        const db = b.publishedAt || b.updatedAt || '';
        return da.localeCompare(db);
      });
    } else if (sort === 'title') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    return result;
  }, [items, query, status, sort]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-medium text-zinc-100">Blog Posts</h2>
          <p className="text-sm text-zinc-500">
            {filtered.length} post{filtered.length !== 1 ? 's' : ''}
            {items.length !== filtered.length ? ` of ${items.length} total` : ''}
          </p>
        </div>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white transition-colors"
        >
          <Plus size={15} />
          New Blog Post
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, slug, tags..."
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 py-2.5 pl-9 pr-9 text-sm text-zinc-100 outline-none focus:border-zinc-500 transition-colors"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {(['all', 'published', 'draft'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setStatus(option)}
              className={`rounded-md border px-3 py-2.5 text-xs capitalize transition-colors ${
                status === option
                  ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
                  : 'border-zinc-700 bg-zinc-950 text-zinc-400 hover:bg-zinc-900'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="relative">
          <ArrowUpDown size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="appearance-none rounded-md border border-zinc-700 bg-zinc-950 py-2.5 pl-8 pr-6 text-xs text-zinc-300 outline-none focus:border-zinc-500 transition-colors"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="title">Title A→Z</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading && items.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-12 text-center text-sm text-zinc-500">Loading blog posts...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-12 text-center">
          <BookOpenText size={28} className="mx-auto text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-500">No blog posts found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all"
            >
              <div className="flex items-start gap-3">
                {/* Thumbnail */}
                <div className="h-16 w-24 shrink-0 rounded-md overflow-hidden border border-zinc-800 bg-zinc-950">
                  {item.coverImage?.url ? (
                    <img
                      src={item.coverImage.url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-zinc-800 to-zinc-950 grid place-items-center">
                      <BookOpenText size={18} className="text-zinc-600" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-100 group-hover:text-white">{item.title}</p>
                      <p className="truncate text-xs text-zinc-500 mt-0.5">/blog/{item.slug}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {item.status === 'published' && (
                        <a
                          href={`/blog/${item.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded border border-zinc-700 p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                          title="View on site"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                      <button
                        onClick={() => onEdit(item)}
                        className="rounded border border-zinc-700 p-1.5 text-zinc-300 hover:bg-zinc-800 transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete \"${item.title}\"?`)) {
                            onDelete(item).then(fetchPosts);
                          }
                        }}
                        className="rounded border border-red-900 bg-red-950/40 p-1.5 text-red-300 hover:bg-red-950 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Meta row */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={11} />
                      {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not published'}
                    </span>

                    {item.readingTime && (
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} />
                        {item.readingTime} min
                      </span>
                    )}

                    {/* Quick toggle */}
                    <button
                      onClick={() => handleToggleStatus(item)}
                      disabled={toggling === item.id}
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide transition-colors ${
                        item.status === 'published'
                          ? 'border-emerald-800 bg-emerald-950/50 text-emerald-400 hover:bg-emerald-950'
                          : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      } disabled:opacity-50`}
                    >
                      {item.status === 'published' ? <Eye size={10} /> : <EyeOff size={10} />}
                      {toggling === item.id ? '...' : item.status}
                    </button>

                    {item.layout && item.layout !== 'standard' && (
                      <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                        {item.layout}
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {item.tags?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.tags.slice(0, 5).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300"
                        >
                          {tag}
                        </span>
                      ))}
                      {item.tags.length > 5 && (
                        <span className="text-[10px] text-zinc-500 self-center">+{item.tags.length - 5}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(BlogManagement);
