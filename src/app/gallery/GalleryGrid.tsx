"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Camera, X, ChevronLeft, ChevronRight, Maximize2, ArrowUpRight, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ImageWithLqip from '../../components/ImageWithLqip';
import type { GalleryDoc } from '../api/gallery/route';
import { cn } from '../../lib/utils';

import Link from 'next/link';

// --- TYPES ---

interface GalleryGridProps {
   filters?: {
      category: string;
      featured: boolean;
      search: string;
   };
}

interface GalleryItem extends Omit<GalleryDoc, '_id'> {
   _id: string;
}

// --- SUB-COMPONENT: GALLERY CARD ---
const GalleryCard = React.memo(({ item, index, onQuickView }: { item: GalleryItem; index: number; onQuickView: (e: React.MouseEvent) => void }) => {
   const dateStr = item.uploadDate ? new Date(item.uploadDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
   }) : '';

   return (
      <motion.div
         initial={{ opacity: 0, y: 20 }}
         whileInView={{ opacity: 1, y: 0 }}
         viewport={{ once: true, margin: "-50px" }}
         transition={{ duration: 1, delay: (index % 3) * 0.1, ease: [0.16, 1, 0.3, 1] }}
         className="w-full"
      >
         <motion.article 
            initial="rest"
            whileHover="hover"
            animate="rest"
            className="group relative w-full bg-neutral-950 border border-white/10 hover:border-white/30 transition-colors duration-300 overflow-hidden"
         >
            <Link href={`/gallery/${item._id}`} className="block">
               {/* ASPECT RATIO CONTAINER - 3:2 for "Large Cinematic Width" */}
               <div className="relative aspect-[3/2] overflow-hidden w-full">
                  
                  {/* --- IMAGE LAYER --- */}
                  <motion.div 
                     className="w-full h-full relative"
                     variants={{
                        rest: { scale: 1 },
                        hover: { scale: 1.05 }
                     }}
                     transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
                  >
                     <ImageWithLqip
                        src={item.images[0].url}
                        alt={item.name}
                        fill
                        className="object-cover transition-all duration-700 opacity-80 group-hover:opacity-100" 
                        transformOpts={{ w: 1000, q: 'auto:best' }}
                        noBlur={true}
                     />
                  </motion.div>

                  {/* --- OVERLAY GRADIENT (Cinematic fade) --- */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90 pointer-events-none" />
                  
                  {/* --- BOTTOM CONTENT AREA --- */}
                  <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
                     
                     {/* Decorative Line that fills on hover */}
                     <div className="w-full h-[1px] bg-white/20 mb-3 overflow-hidden">
                        <motion.div 
                           className="h-full bg-white w-full origin-left"
                           variants={{ rest: { scaleX: 0 }, hover: { scaleX: 1 }}}
                           transition={{ duration: 0.4 }}
                        />
                     </div>

                     {/* Title & Arrow */}
                     <div className="flex justify-between items-start mb-1">
                        <h2 className="text-xl md:text-2xl font-light text-white uppercase tracking-tighter leading-none">
                           {item.name}
                        </h2>
                        <ArrowUpRight className="w-4 h-4 text-white/50 group-hover:text-white group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
                     </div>
                     
                     {/* Tags / Metadata */}
                     <div className="flex items-center justify-between mt-2">
                        <p className="text-[10px] text-white/50 font-mono uppercase tracking-widest truncate max-w-[80%]">
                           {item.category} / {dateStr}
                        </p>
                        
                        {/* Fake ID/Ref number for "Technical" look */}
                        <span className="text-[9px] text-white/20 font-mono">
                           {item._id.substring(0, 4).toUpperCase()}
                        </span>
                     </div>
                  </div>
               </div>
            </Link>
         </motion.article>
      </motion.div>
   );
});

// --- SUB-COMPONENT: LIGHTBOX ---
const Lightbox = ({ item, onClose }: { item: GalleryItem; onClose: () => void }) => {
   const [index, setIndex] = useState(0);
   const [isLoaded, setIsLoaded] = useState(false);

   const next = (e?: React.MouseEvent) => { e?.stopPropagation(); setIsLoaded(false); setIndex((prev) => (prev + 1) % item.images.length); };
   const prev = (e?: React.MouseEvent) => { e?.stopPropagation(); setIsLoaded(false); setIndex((prev) => (prev - 1 + item.images.length) % item.images.length); };

   useEffect(() => {
      const handleKey = (e: KeyboardEvent) => {
         if (e.key === 'Escape') onClose();
         if (e.key === 'ArrowRight') next();
         if (e.key === 'ArrowLeft') prev();
      };
      window.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
      return () => {
         window.removeEventListener('keydown', handleKey);
         document.body.style.overflow = '';
      };
   }, []);

   return (
      <motion.div
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         exit={{ opacity: 0 }}
         className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col"
      >
         {/* Top Toolbar */}
         <div className="flex items-center justify-between p-8 md:p-12 z-50">
            <div className="flex flex-col">
               <h2 className="text-white text-xl font-extralight tracking-tight uppercase">
                  {item.name}
               </h2>
               <div className="text-white/30 text-[10px] font-mono tracking-[0.3em] uppercase mt-2">
                  {index + 1} / {item.images.length} — {item.category}
               </div>
            </div>
            <div className="flex items-center gap-6">
               <Link
                  href={`/gallery/${item._id}`}
                  className="hidden md:flex items-center gap-4 px-8 py-3 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-[0.3em] text-white hover:bg-white hover:text-black transition-all"
               >
                  Explore Details
               </Link>
               <button onClick={onClose} className="p-4 rounded-full bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all group">
                  <X className="w-5 h-5" />
               </button>
            </div>
         </div>

         {/* Main Stage */}
         <div className="flex-1 relative flex items-center justify-center p-6 md:p-20" onClick={onClose}>
            <AnimatePresence mode="wait">
               <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
                  className="relative w-full h-full flex items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
               >
                  {!isLoaded && (
                     <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 border-t-2 border-white/40 rounded-full animate-spin" />
                     </div>
                  )}
                  <ImageWithLqip
                     src={item.images[index].url}
                     alt=""
                     width={2400}
                     height={1800}
                     className={`max-w-full max-h-full object-contain ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                     transformOpts={{ w: 2400, q: 'auto:best' }}
                     onLoad={() => setIsLoaded(true)}
                     priority
                     noBlur={true}
                  />
               </motion.div>
            </AnimatePresence>

            {/* Arrows */}
            {item.images.length > 1 && (
               <>
                  <button onClick={prev} className="absolute left-8 md:left-12 p-5 rounded-full bg-black/20 border border-white/5 text-white/30 hover:text-white hover:bg-white/10 transition-all backdrop-blur-md">
                     <ChevronLeft className="w-8 h-8" />
                  </button>
                  <button onClick={next} className="absolute right-8 md:right-12 p-5 rounded-full bg-black/20 border border-white/5 text-white/30 hover:text-white hover:bg-white/10 transition-all backdrop-blur-md">
                     <ChevronRight className="w-8 h-8" />
                  </button>
               </>
            )}
         </div>
      </motion.div>
   );
};

// --- MAIN COMPONENT ---

export default function GalleryGrid({ filters }: GalleryGridProps) {
   const [items, setItems] = useState<GalleryItem[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [hasMore, setHasMore] = useState(true);
   const [page, setPage] = useState(0);
   const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

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

         const res = await fetch(`/api/gallery?${params}`, { cache: 'no-store' });
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

   // Initial Load
   useEffect(() => {
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 lg:gap-10">
               {items.map((item, index) => (
                  <GalleryCard
                     key={item._id}
                     item={item}
                     index={index}
                     onQuickView={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedItem(item);
                     }}
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
                  <span className="text-[10px] uppercase tracking-[0.5em] text-white/20">Loading Volume</span>
               </div>
            )}
            {!loading && items.length === 0 && !error && (
               <div className="text-center py-20">
                  <Camera className="w-12 h-12 mx-auto mb-6 text-white/5" />
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-light italic">No frames found in this category</p>
               </div>
            )}
         </div>

         {/* Lightbox Modal */}
         <AnimatePresence>
            {selectedItem && (
               <Lightbox
                  item={selectedItem}
                  onClose={() => setSelectedItem(null)}
               />
            )}
         </AnimatePresence>
      </div>
   );
}