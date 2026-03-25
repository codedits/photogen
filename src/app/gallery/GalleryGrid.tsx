"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Camera, X, ChevronLeft, ChevronRight, Maximize2, ArrowUpRight, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ImageWithLqip from '../../components/ImageWithLqip';
import type { GalleryDoc } from '../api/gallery/route';
import { cn } from '../../lib/utils';

import Link from 'next/link';
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
}

interface GalleryItem extends Omit<GalleryDoc, '_id'> {
   _id: string;
}

// --- MAIN COMPONENT ---

export default function GalleryGrid({ filters, initialItems, initialTotal }: GalleryGridProps) {
   const hasInitialData = !!(initialItems && initialItems.length > 0);
   const [items, setItems] = useState<GalleryItem[]>(initialItems || []);
   const [loading, setLoading] = useState(!hasInitialData);
   const [error, setError] = useState<string | null>(null);
   const [hasMore, setHasMore] = useState(hasInitialData ? (initialTotal ? initialItems!.length < initialTotal : true) : true);
   const [page, setPage] = useState(hasInitialData ? 1 : 0);

   const observerRef = useRef<HTMLDivElement>(null);
   const ITEMS_PER_PAGE = 14; // Even number for better grid fit

   const fetchItems = useCallback(async (reset = false) => {
      try {
         setLoading(true);
         const skip = reset ? 0 : page * ITEMS_PER_PAGE;
         const params = new URLSearchParams({
            limit: ITEMS_PER_PAGE.toString(),
            skip: skip.toString(),
            visibility: 'public'
         });

         if (filters?.category) params.set('category', filters.category);
         if (filters?.featured) params.set('featured', 'true');
         if (filters?.search) params.set('q', filters.search);

         const res = await fetch(`/api/gallery?${params}`);
         const data = await res.json();
         if (!res.ok) throw new Error(data.error);

         if (reset) {
            setItems(data.items || []);
            setPage(1);
         } else {
            setItems(prev => [...prev, ...(data.items || [])]);
            setPage(prev => prev + 1);
         }
         setHasMore(data.pagination?.hasMore || false);
         setError(null);
      } catch (err) {
         setError(err instanceof Error ? err.message : 'Error');
      } finally {
         setLoading(false);
      }
   }, [page, filters]);

   // Initial Load — skip if we have server-provided initial data and no filters active
   const isDefaultFilters = !filters?.category && !filters?.featured && !filters?.search;
   useEffect(() => {
      if (hasInitialData && isDefaultFilters) return;
      setItems([]);
      setPage(0);
      fetchItems(true);
   }, [filters]);

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
               <p className="text-red-400/60 font-mono text-[10px] uppercase tracking-widest mb-6">{error}</p>
               <button onClick={() => fetchItems(true)} className="px-8 py-3 border border-white/10 rounded-full text-white text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all">Retry Connection</button>
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
                  />
               ))}
            </div>
         )}

         {/* Loading Indicators */}
         <div ref={observerRef} className="py-24 flex flex-col items-center justify-center w-full">
            {loading && (
               <div className="flex flex-col items-center gap-6">
                  <div className="w-12 h-12 relative">
                     <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border border-white/5 rounded-full"
                     />
                     <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-[30%] bg-white/20 rounded-full"
                     />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.5em] text-white/45">Loading Volume</span>
               </div>
            )}
            {!loading && items.length === 0 && !error && (
               <div className="text-center py-20">
                  <Camera className="w-12 h-12 mx-auto mb-6 text-white/5" />
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/60 font-light">No frames found in this category</p>
               </div>
            )}
         </div>
      </div>
   );
}