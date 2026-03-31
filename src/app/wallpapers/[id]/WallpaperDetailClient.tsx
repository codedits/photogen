'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Monitor, ArrowDownToLine, Share2, Info, Maximize2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import ImageWithLqip from '../../../components/ImageWithLqip';
import LiquidRiseCTA from '../../../components/LiquidRiseCTA';

// --- TYPES ---
interface WallpaperItem {
  _id: string;
  name: string;
  category: string;
  description?: string;
  photographer?: string;
  images: { url: string }[];
  visibility: string;
}

interface WallpaperDetailClientProps {
  item: WallpaperItem;
  downloadUrl: string;
}

export default function WallpaperDetailClient({ item, downloadUrl }: WallpaperDetailClientProps) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  
  const mainImage = item.images[0];
  if (!mainImage) return null;

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setDims({ w: img.naturalWidth, h: img.naturalHeight });
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground font-sans selection:bg-foreground/20 overflow-x-hidden">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-10 pt-28 md:pt-40 pb-10">
        
        {/* Main Layout Grid - Matching Gallery Style */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-24 relative items-start">
          
          {/* --- LEFT SIDEBAR (Sticky on Desktop) --- */}
          <aside className="w-full lg:w-[400px] xl:w-[440px] flex-shrink-0 lg:sticky lg:top-40 flex flex-col gap-12 pb-10 lg:pb-0">
            
            <div className="flex flex-col gap-10">
              {/* Back to Wallpapers */}
              <Link 
                href="/wallpapers" 
                className="group flex items-center gap-3 text-muted-foreground hover:text-foreground transition-all duration-500 w-fit"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span className="text-[11px] uppercase tracking-[0.4em] font-medium">Back to Papers</span>
              </Link>

              {/* Header: Item Info (Album Style) */}
              <div className="flex items-center gap-4">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative w-14 h-14 rounded-xl overflow-hidden border border-white/10 shadow-lg shrink-0"
                >
                  <ImageWithLqip 
                    src={mainImage.url} 
                    alt="Wallpaper Thumbnail" 
                    fill
                    className="object-cover scale-150"
                    transformOpts={{ w: 100, q: 20 }}
                    noBlur={true}
                  />
                </motion.div>
                <div>
                  <h1 className="text-foreground font-light text-2xl tracking-tighter leading-tight">{item.name}</h1>
                  <p className="text-muted-foreground text-[12px] uppercase tracking-[0.25em] mt-1 opacity-70">{item.category}</p>
                </div>
              </div>

              {/* Main Description (Large/Bold matching Gallery vibe) */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="prose prose-invert max-w-none text-[1.4rem] md:text-[1.65rem] leading-[1.3] font-medium tracking-tight text-muted-foreground [&_strong]:text-foreground [&_strong]:font-semibold [&_em]:text-foreground [&_em]:italic"
                dangerouslySetInnerHTML={{ __html: item.description || '<p>High-resolution digital asset curated for visual perfection.</p>' }} 
              />

              {/* Action (LiquidRiseCTA) */}
              <div className="flex flex-col gap-6 pt-2">
                <LiquidRiseCTA 
                    href={downloadUrl}
                    className="w-full h-16 rounded-2xl group-hover/cta:scale-[1.02] active:scale-[0.98] transition-all border-foreground/10 cursor-pointer shadow-xl"
                    icon={<ArrowDownToLine className="w-5 h-5" />}
                >
                    Download Original
                </LiquidRiseCTA>
                
                <div className="flex items-center gap-2 text-muted-foreground text-[11px] uppercase tracking-widest pl-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                  Commercial license included
                </div>
              </div>

              {/* Divider */}
              <div className="w-full h-[1px] bg-border/50"></div>

              {/* Technical Details */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col gap-8"
              >
                <div>
                  <h3 className="text-foreground font-medium text-[15px] mb-4 uppercase tracking-widest">Metadata</h3>
                  <p className="text-muted-foreground text-[14px] leading-relaxed font-light">
                    High-resolution digital master optimized for modern displays. This asset captures maximum dynamic range and color accuracy for professional-grade aesthetics.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                  {dims && (
                    <div>
                      <span className="text-foreground font-medium text-sm block mb-1 uppercase tracking-tight">
                        {dims.w} &times; {dims.h}
                      </span>
                      <span className="text-muted-foreground text-[11px] uppercase tracking-[0.2em] opacity-60">Resolution</span>
                    </div>
                  )}
                  {item.photographer && (
                    <div className="overflow-hidden">
                      <span className="text-foreground font-medium text-sm block mb-1 uppercase tracking-tight truncate">
                        {item.photographer}
                      </span>
                      <span className="text-muted-foreground text-[11px] uppercase tracking-[0.2em] opacity-60">Curator</span>
                    </div>
                  )}
                  <div>
                    <span className="text-foreground font-medium text-sm block mb-1 uppercase tracking-tight">sRGB High-Bit</span>
                    <span className="text-muted-foreground text-[11px] uppercase tracking-[0.2em] opacity-60">Format</span>
                  </div>
                </div>
              </motion.div>

            </div>
          </aside>

          {/* --- RIGHT PREVIEW (Natural Orientation) --- */}
          <main className="flex-1 w-full">
            <motion.div 
                initial={{ opacity: 0, x: 20, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 1.2, ease: [0.19, 1, 0.22, 1] }}
                className="relative w-full lg:w-[40vw] lg:max-w-[55vh] h-[80vh] mx-auto shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)] rounded-2xl overflow-hidden border border-white/5 bg-zinc-900/50 group"
            >
                <ImageWithLqip
                  src={mainImage.url}
                  alt={item.name}
                  fill
                  className="object-cover transition-transform duration-[4s] ease-out group-hover:scale-[1.02]"
                  sizes="(max-width: 1024px) 100vw, 85vw"
                  priority
                  transformOpts={{ w: 2560, h: 2560, fit: 'cover', q: 'auto:best', g: 'center' }}
                  onLoad={handleImageLoad}
                />
                
                {/* Visual Interactivity */}
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                
                {/* Floating Fullscreen (Visual) */}
                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white cursor-pointer hover:bg-white/20 transition-colors">
                        <Maximize2 className="w-5 h-5" />
                    </div>
                </div>
            </motion.div>
          </main>

        </div>
      </div>


    </main>
  );
}
