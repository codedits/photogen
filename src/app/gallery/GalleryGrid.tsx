"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Eye, MapPin, Camera, X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import ImageWithLqip from '../../components/ImageWithLqip';
import type { GalleryDoc } from '../api/gallery/route';

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
// Handles the display of a single item in the grid
const GalleryCard = React.memo(({ item, onClick }: { item: GalleryItem; onClick: () => void }) => {
  return (
    <div className="break-inside-avoid mb-6 group cursor-zoom-in" onClick={onClick}>
      <div className="relative bg-neutral-900 rounded-sm overflow-hidden">
        
        {/* Image Container - Using w-full h-auto for natural aspect ratio */}
        <div className="relative w-full">
           <ImageWithLqip
              src={item.images[0].url}
              alt={item.name}
              width={600} // Fetch decent resolution
              height={800} // Aspect ratio placeholder
              className="w-full h-auto block transition-transform duration-700 ease-in-out group-hover:scale-[1.02]"
              transformOpts={{ w: 600, q: 'auto:good' }}
            />
            
            {/* Hover Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Top Right Badge */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
               {item.images.length > 1 && (
                  <span className="bg-black/50 backdrop-blur text-white/80 px-2 py-1 text-[10px] font-mono rounded uppercase tracking-widest flex items-center gap-1">
                     <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                     +{item.images.length - 1}
                  </span>
               )}
            </div>

            {/* Bottom Info Overlay (Appears on Hover) */}
            <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
               <h3 className="text-white font-medium text-lg leading-tight mb-1">{item.name}</h3>
               <div className="flex items-center gap-3 text-xs text-white/60 font-mono uppercase tracking-widest">
                  <span>{item.category}</span>
                  {item.location && (
                     <span className="flex items-center gap-1 truncate max-w-[120px]">
                        <MapPin className="w-3 h-3" /> {item.location}
                     </span>
                  )}
               </div>
            </div>
        </div>
      </div>
    </div>
  );
});

// --- SUB-COMPONENT: LIGHTBOX ---
// Full screen modal to view images
const Lightbox = ({ item, onClose }: { item: GalleryItem; onClose: () => void }) => {
   const [index, setIndex] = useState(0);

   // Navigation handlers
   const next = (e?: React.MouseEvent) => { e?.stopPropagation(); setIndex((prev) => (prev + 1) % item.images.length); };
   const prev = (e?: React.MouseEvent) => { e?.stopPropagation(); setIndex((prev) => (prev - 1 + item.images.length) % item.images.length); };

   // Keyboard support
   useEffect(() => {
      const handleKey = (e: KeyboardEvent) => {
         if (e.key === 'Escape') onClose();
         if (e.key === 'ArrowRight') next();
         if (e.key === 'ArrowLeft') prev();
      };
      window.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden'; // Lock scroll
      return () => { 
         window.removeEventListener('keydown', handleKey);
         document.body.style.overflow = ''; 
      };
   }, []);

   return (
      <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-200">
         
         {/* Top Toolbar */}
         <div className="flex items-center justify-between p-4 md:p-6 z-50">
            <div className="text-white/50 text-xs font-mono tracking-widest uppercase">
               {index + 1} / {item.images.length}
            </div>
            <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
               <X className="w-5 h-5" />
            </button>
         </div>

         {/* Main Stage */}
         <div className="flex-1 relative flex items-center justify-center p-4 md:p-8" onClick={onClose}>
            {/* Image Wrapper */}
            <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
               <ImageWithLqip
                  src={item.images[index].url}
                  alt=""
                  width={1600}
                  height={1200}
                  className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-sm"
                  transformOpts={{ w: 1600, q: 'auto:best' }}
                  priority
               />
               
               {/* Caption on Mobile (Below Image) */}
               <div className="md:hidden mt-4 text-center">
                  <h3 className="text-white font-medium">{item.name}</h3>
                  <p className="text-white/60 text-xs mt-1">{item.description}</p>
               </div>
            </div>

            {/* Arrows */}
            {item.images.length > 1 && (
               <>
                  <button onClick={prev} className="absolute left-2 md:left-8 p-3 md:p-4 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-all">
                     <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
                  </button>
                  <button onClick={next} className="absolute right-2 md:right-8 p-3 md:p-4 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-all">
                     <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
                  </button>
               </>
            )}
         </div>

         {/* Desktop Bottom Metadata Bar */}
         <div className="hidden md:block bg-neutral-900/50 border-t border-white/5 p-6 backdrop-blur-md">
            <div className="max-w-6xl mx-auto flex justify-between items-center">
               <div>
                  <h2 className="text-xl text-white font-medium">{item.name}</h2>
                  {item.description && <p className="text-white/60 text-sm mt-1 max-w-2xl">{item.description}</p>}
               </div>
               <div className="flex gap-8 text-xs text-white/40 font-mono uppercase tracking-widest">
                  {item.location && <span>{item.location}</span>}
                  {item.photographer && <span>By {item.photographer}</span>}
               </div>
            </div>
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
   const ITEMS_PER_PAGE = 15;

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
      <div className="min-h-screen p-4 md:p-8">
         {error ? (
            <div className="text-center py-20">
               <p className="text-red-400 mb-4">{error}</p>
               <button onClick={() => fetchItems(true)} className="px-6 py-2 bg-white/10 rounded-full text-white text-xs">Retry</button>
            </div>
         ) : (
            /* Responsive Masonry Layout */
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
               {items.map((item) => (
                  <GalleryCard 
                     key={item._id} 
                     item={item} 
                     onClick={() => setSelectedItem(item)} 
                  />
               ))}
            </div>
         )}

         {/* Loading Indicators */}
         <div ref={observerRef} className="py-12 flex justify-center w-full">
            {loading && (
               <div className="flex gap-2">
                  <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-white rounded-full animate-bounce" />
               </div>
            )}
            {!loading && items.length === 0 && !error && (
               <div className="text-center text-white/40">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No images found</p>
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