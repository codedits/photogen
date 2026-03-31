"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertCircle, Camera, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import type { GalleryDoc } from '../api/gallery/route';
import GalleryCard from '../../components/GalleryCard';
// --- TYPES ---

interface GalleryGridProps {
   filters?: {
      category: string;
      featured: boolean;
      search: string;
   };
   initialItems?: GalleryItem[];
   initialTotal?: number;
   onResetFilters?: () => void;
   apiUrl?: string;
   basePath?: string;
}

interface GalleryItem extends Omit<GalleryDoc, '_id'> {
   _id: string;
}

// --- MAIN COMPONENT ---

export default function GalleryGrid({ filters, initialItems, initialTotal, onResetFilters, apiUrl = '/api/gallery', basePath = '/gallery' }: GalleryGridProps) {
   const hasInitialData = !!(initialItems && initialItems.length > 0);
   const [items, setItems] = useState<GalleryItem[]>(initialItems || []);
   const [loading, setLoading] = useState(!hasInitialData);
   const [error, setError] = useState<string | null>(null);
   const [hasMore, setHasMore] = useState(hasInitialData ? (initialTotal ? initialItems!.length < initialTotal : true) : true);
   const [, setPage] = useState(hasInitialData ? 1 : 0);

   const observerRef = useRef<HTMLDivElement>(null);
   const pageRef = useRef(hasInitialData ? 1 : 0);
   const hasMoreRef = useRef(hasInitialData ? (initialTotal ? initialItems!.length < initialTotal : true) : true);
   const loadingRef = useRef(false);
   const abortRef = useRef<AbortController | null>(null);
   const ITEMS_PER_PAGE = 14; // Even number for better grid fit
   const hasActiveFilters = !!(filters?.category || filters?.featured || filters?.search);

   const fetchItems = useCallback(async (reset = false) => {
      if (loadingRef.current && !reset) return;
      if (!reset && !hasMoreRef.current) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
         loadingRef.current = true;
         setLoading(true);
         const skip = reset ? 0 : pageRef.current * ITEMS_PER_PAGE;
         const params = new URLSearchParams({
            limit: ITEMS_PER_PAGE.toString(),
            skip: skip.toString(),
            visibility: 'public'
         });

         if (filters?.category) params.set('category', filters.category);
         if (filters?.featured) params.set('featured', 'true');
         if (filters?.search) params.set('q', filters.search);

         const res = await fetch(`${apiUrl}?${params}`, { signal: controller.signal });
         const data = await res.json();
         if (!res.ok) throw new Error(data?.error || 'Failed to load gallery items');

         if (reset) {
            setItems(data.items || []);
            setPage(1);
            pageRef.current = 1;
         } else {
            setItems(prev => [...prev, ...(data.items || [])]);
            setPage(prev => {
               const nextPage = prev + 1;
               pageRef.current = nextPage;
               return nextPage;
            });
         }
         const nextHasMore = data.pagination?.hasMore || false;
         hasMoreRef.current = nextHasMore;
         setHasMore(nextHasMore);
         setError(null);
      } catch (err) {
         if ((err as Error)?.name === 'AbortError') return;
         setError(err instanceof Error ? err.message : 'Error');
      } finally {
         loadingRef.current = false;
         setLoading(false);
      }
   }, [filters]);

   // Initial Load — skip if we have server-provided initial data and no filters active
   const isDefaultFilters = !filters?.category && !filters?.featured && !filters?.search;
   useEffect(() => {
      if (hasInitialData && isDefaultFilters) return;
      setItems([]);
      setPage(0);
      pageRef.current = 0;
      hasMoreRef.current = true;
      setHasMore(true);
      fetchItems(true);
      return () => {
         abortRef.current?.abort();
      };
   }, [filters, fetchItems, hasInitialData, isDefaultFilters]);

   // Infinite Scroll
   useEffect(() => {
      if (!hasMore || loading || !observerRef.current) return;
      const observer = new IntersectionObserver((entries) => {
         if (entries[0].isIntersecting) fetchItems();
      }, { threshold: 0.1 });
      observer.observe(observerRef.current);
      return () => observer.disconnect();
   }, [hasMore, loading, fetchItems]);

   return (
      <div className="min-h-screen">
         {error ? (
            <div className="text-center py-32">
               <AlertCircle className="w-10 h-10 mx-auto mb-5 text-destructive/70" />
               <p className="text-destructive font-mono text-[10px] uppercase tracking-widest mb-2">Connection Error</p>
               <p className="text-muted-foreground text-xs mb-6">{error}</p>
               <button onClick={() => fetchItems(true)} className="focus-ring px-8 py-3 border border-border rounded-full text-foreground text-[10px] uppercase tracking-widest hover:bg-foreground hover:text-background transition-all">Retry Connection</button>
            </div>
         ) : (
            /* Refined Responsive Grid - 3 Columns on Desktop */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[2px]">
               {items.map((item, index) => (
                  <GalleryCard
                     key={item._id}
                     item={item}
                     index={index}
                     aspectRatio="4/5"
                     sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                     basePath={basePath}
                  />
               ))}
            </div>
         )}

         {/* Loading Indicators */}
         <div ref={observerRef} className="py-24 flex flex-col items-center justify-center w-full">
            {loading && items.length === 0 && (
               <div className="w-full max-w-[1400px] px-4 md:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[2px]">
                  {Array.from({ length: 6 }).map((_, i) => (
                     <div key={i} className="relative aspect-[4/5] bg-card/40 border border-border/60 overflow-hidden">
                        <motion.div
                           className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                           animate={{ x: ['-100%', '100%'] }}
                           transition={{ duration: 1.2, repeat: Infinity, ease: 'linear', delay: i * 0.08 }}
                        />
                     </div>
                  ))}
               </div>
            )}

            {loading && items.length > 0 && (
               <div className="flex flex-col items-center gap-6">
                  <div className="w-12 h-12 relative">
                     <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border border-border rounded-full"
                     />
                     <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-[30%] bg-foreground/20 rounded-full"
                     />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground">Loading Volume</span>
               </div>
            )}

            {!loading && items.length === 0 && !error && (
               <div className="text-center py-20">
                  <Camera className="w-12 h-12 mx-auto mb-6 text-muted-foreground/20" />
                  <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-light mb-3">
                     {hasActiveFilters ? 'No frames match the current filters' : 'No frames found in this category'}
                  </p>
                  {hasActiveFilters && (
                     <button
                        onClick={onResetFilters}
                        className="focus-ring inline-flex items-center gap-2 px-5 py-2 border border-border rounded-full text-[10px] uppercase tracking-[0.2em] text-foreground hover:bg-foreground hover:text-background transition-all"
                     >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Clear Filters
                     </button>
                  )}
               </div>
            )}
         </div>
      </div>
   );
}