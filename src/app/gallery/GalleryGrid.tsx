"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Eye, MapPin, Camera, X, ChevronLeft, ChevronRight, Maximize2, Star } from 'lucide-react';
import ImageWithLqip from '../../components/ImageWithLqip';
import type { GalleryDoc } from '../api/gallery/route';

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
const GalleryCard = React.memo(({ item, onQuickView }: { item: GalleryItem; onQuickView: (e: React.MouseEvent) => void }) => {
  return (
    <Link href={`/gallery/${item._id}`} className="break-inside-avoid mb-8 block group">
      <div className="relative bg-neutral-900 rounded-sm overflow-hidden border border-white/5 transition-all duration-500 group-hover:border-white/20 group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        
        {/* Image Container */}
        <div className="relative w-full overflow-hidden">
           <ImageWithLqip
              src={item.images[0].url}
              alt={item.name}
              width={800}
              height={1000}
              className="w-full h-auto block transition-transform duration-1000 ease-out group-hover:scale-110 group-hover:rotate-1"
              transformOpts={{ w: 800, q: 'auto:good' }}
            />
            
            {/* Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
            
            {/* Quick View Button */}
            <button 
              onClick={onQuickView}
              className="absolute top-4 right-4 p-3 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 hover:bg-white hover:text-black"
              title="Quick View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Bottom Info */}
            <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
               <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-white/10 backdrop-blur-md border border-white/10 rounded text-[8px] uppercase tracking-[0.2em] text-white/80">
                    {item.category}
                  </span>
                  {item.featured && (
                    <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                  )}
               </div>
               <h3 className="text-white font-light text-xl tracking-tight mb-2">{item.name}</h3>
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[9px] text-white/40 font-mono uppercase tracking-widest">
                    {item.location && (
                       <span className="flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" /> {item.location}
                       </span>
                    )}
                  </div>
                  <span className="text-[9px] text-white/20 font-mono">
                    {item.images.length} {item.images.length === 1 ? 'IMAGE' : 'IMAGES'}
                  </span>
               </div>
            </div>
        </div>
      </div>
    </Link>
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
      <div className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-2xl flex flex-col animate-in fade-in duration-500">
         
         {/* Top Toolbar */}
         <div className="flex items-center justify-between p-6 md:p-10 z-50">
            <div className="flex flex-col">
               <h2 className="text-white text-lg font-light tracking-tight">{item.name}</h2>
               <div className="text-white/30 text-[10px] font-mono tracking-[0.3em] uppercase mt-1">
                  {index + 1} / {item.images.length} — {item.category}
               </div>
            </div>
            <div className="flex items-center gap-4">
               <Link 
                  href={`/gallery/${item._id}`}
                  className="hidden md:flex items-center gap-2 px-5 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-[0.2em] text-white hover:bg-white hover:text-black transition-all"
               >
                  View Details
               </Link>
               <button onClick={onClose} className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/20 text-white transition-all">
                  <X className="w-5 h-5" />
               </button>
            </div>
         </div>

         {/* Main Stage */}
         <div className="flex-1 relative flex items-center justify-center p-4 md:p-12" onClick={onClose}>
            <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
               {!isLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                     <div className="w-10 h-10 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
                  </div>
               )}
               <ImageWithLqip
                  src={item.images[index].url}
                  alt=""
                  width={2400}
                  height={1800}
                  className={`max-w-full max-h-full object-contain transition-all duration-1000 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                  transformOpts={{ w: 2400, q: 'auto:best' }}
                  onLoad={() => setIsLoaded(true)}
                  priority
               />
            </div>

            {/* Arrows */}
            {item.images.length > 1 && (
               <>
                  <button onClick={prev} className="absolute left-4 md:left-12 p-4 rounded-full bg-black/20 border border-white/5 text-white/30 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-md">
                     <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
                  </button>
                  <button onClick={next} className="absolute right-4 md:right-12 p-4 rounded-full bg-black/20 border border-white/5 text-white/30 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-md">
                     <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
                  </button>
               </>
            )}
         </div>

         {/* Mobile Details Link */}
         <div className="md:hidden p-6 border-t border-white/5">
            <Link 
               href={`/gallery/${item._id}`}
               className="flex items-center justify-center gap-2 w-full py-4 bg-white text-black rounded-full text-[10px] uppercase tracking-[0.2em] font-bold"
            >
               View Full Details
            </Link>
         </div>
      </div>
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
   const ITEMS_PER_PAGE = 12;

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
            /* Responsive Masonry Layout */
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-8 space-y-8">
               {items.map((item) => (
                  <GalleryCard 
                     key={item._id} 
                     item={item} 
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
               <div className="flex flex-col items-center gap-4">
                  <div className="flex gap-1.5">
                     <span className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
                     <span className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                     <span className="w-1 h-1 bg-white rounded-full animate-bounce" />
                  </div>
                  <span className="text-[8px] uppercase tracking-[0.4em] text-white/20">Loading Collection</span>
               </div>
            )}
            {!loading && items.length === 0 && !error && (
               <div className="text-center py-20">
                  <Camera className="w-8 h-8 mx-auto mb-4 text-white/10" />
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">No works found in this category</p>
               </div>
            )}
         </div>

         {/* Lightbox Modal */}
         {selectedItem && (
            <Lightbox 
               item={selectedItem} 
               onClose={() => setSelectedItem(null)} 
            />
         )}
      </div>
   );
}