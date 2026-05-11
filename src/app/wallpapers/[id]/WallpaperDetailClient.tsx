'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowDownToLine, Share2, LayoutGrid, Smartphone, Flashlight, Camera } from 'lucide-react';
import { motion, PanInfo, AnimatePresence, useAnimation } from 'framer-motion';
import ImageWithLqip from '../../../components/ImageWithLqip';
import LiquidRiseCTA from '../../../components/LiquidRiseCTA';
import GlassSurface from '../../../components/GlassSurface';
import IphonePreviewMockup from '../../../components/IphonePreviewMockup';

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
  prevId?: string;
  nextId?: string;
}

export default function WallpaperDetailClient({ item, downloadUrl, prevId, nextId }: WallpaperDetailClientProps) {
  const router = useRouter();
  const controls = useAnimation();
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const mainImage = item.images[0];
  if (!mainImage) return null;

  const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (isPreviewMode || isNavigating) return; // Disable swipe when previewing or navigating
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    const swipeThreshold = 80;
    const velocityThreshold = 500;

    if (offset < -swipeThreshold || velocity < -velocityThreshold) {
      if (nextId) {
        setIsNavigating(true);
        // Animate out to the left
        await controls.start({ x: -(typeof window !== 'undefined' ? window.innerWidth : 1000), opacity: 0, transition: { duration: 0.25, ease: "easeOut" } });
        router.push(`/wallpapers/${nextId}`);
      }
    } else if (offset > swipeThreshold || velocity > velocityThreshold) {
      if (prevId) {
        setIsNavigating(true);
        // Animate out to the right
        await controls.start({ x: (typeof window !== 'undefined' ? window.innerWidth : 1000), opacity: 0, transition: { duration: 0.25, ease: "easeOut" } });
        router.push(`/wallpapers/${prevId}`);
      }
    } else {
      // Snap back if threshold not met
      controls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 30 } });
    }
  };

  const formatTime = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${minutes}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  return (
    <main className="fixed inset-0 z-[100] bg-black text-white font-sans overflow-hidden">
      {/* Draggable Background Image */}
      <motion.div 
        drag={isPreviewMode || isNavigating ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        onDragEnd={handleDragEnd}
        animate={controls}
        initial={{ opacity: 0, scale: 1.02 }}
        whileInView={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="absolute inset-0 z-0 touch-pan-y cursor-grab active:cursor-grabbing"
      >
        <ImageWithLqip
          src={mainImage.url}
          alt={item.name}
          fill
          className="object-cover"
          sizes="100vw"
          priority
          transformOpts={{ w: 2560, h: 2560, fit: 'contain', q: 'auto:best' }}
          noBlur={true}
        />
        {/* Subtle gradient overlay to ensure text legibility at top and bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/30 pointer-events-none"></div>
      </motion.div>

      {/* Top Header */}
      <header className="absolute top-0 left-0 right-0 z-10 p-6 md:p-10 flex justify-between items-start pointer-events-auto">
        <div className="flex items-center gap-4">
          <Link href="/wallpapers" className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors text-white shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white drop-shadow-md">PhotoGen</h1>
            <span className="text-[10px] md:text-xs uppercase tracking-widest text-white/80 font-medium drop-shadow-md">Wallpapers</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/wallpapers" className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors text-white shrink-0">
            <LayoutGrid className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Bottom Glass Panel */}
      <div className="absolute bottom-6 left-4 right-4 md:bottom-10 md:left-1/2 md:-translate-x-1/2 md:w-[480px] z-10 pointer-events-none">
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 25, stiffness: 200, delay: 0.2 }}
          className="pointer-events-auto w-full"
        >
          <GlassSurface 
            width="100%"
            height="auto"
            borderRadius={32}
            style={{ maxHeight: '35vh' }}
          >
            <div className="flex flex-col gap-5 w-full h-full p-6 md:p-8">
              {/* Pagination / Slider indicator */}
              <div className="flex justify-center gap-1.5 opacity-60 relative z-10 shrink-0">
                <div className="w-5 h-[3px] rounded-full bg-white"></div>
                <div className="w-[3px] h-[3px] rounded-full bg-white/60"></div>
                <div className="w-[3px] h-[3px] rounded-full bg-white/60"></div>
                <div className="w-[3px] h-[3px] rounded-full bg-white/60"></div>
                <div className="w-[3px] h-[3px] rounded-full bg-white/60"></div>
              </div>

              <div className="flex flex-col gap-4 relative z-10 overflow-y-auto no-scrollbar mask-image-bottom">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{item.name}</h2>
                  {item.photographer && (
                    <p className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-white/60 mt-1.5 font-medium">
                      Shot by @{item.photographer.replace('@', '').toUpperCase()}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div 
                  className="prose prose-invert max-w-none text-xs md:text-sm leading-relaxed text-white/80 [&_strong]:text-white [&_strong]:font-semibold [&_em]:text-white [&_em]:italic"
                  dangerouslySetInnerHTML={{ __html: item.description || '<p>High-resolution digital asset curated for visual perfection.</p>' }} 
                />
              </div>

              <div className="flex flex-col gap-3 relative z-10 shrink-0 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between gap-3 md:gap-4">
                  {/* Download Button */}
                  <LiquidRiseCTA 
                      href={downloadUrl}
                      className="flex-1 h-[46px] rounded-2xl group-hover/cta:scale-[1.02] active:scale-[0.98] transition-all border-white/10 cursor-pointer shadow-xl text-sm"
                      icon={<ArrowDownToLine className="w-5 h-5" />}
                  >
                      Download Original
                  </LiquidRiseCTA>

                  {/* Action Buttons */}
                  <button 
                    onClick={() => setIsPreviewMode(true)}
                    className="w-[46px] h-[46px] rounded-2xl bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center border border-white/10 shrink-0 active:scale-95"
                  >
                    <Smartphone className="w-[16px] h-[16px] text-white" />
                  </button>
                  
                  <button className="w-[46px] h-[46px] rounded-2xl bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center border border-white/10 shrink-0 active:scale-95">
                    <Share2 className="w-[16px] h-[16px] text-white" />
                  </button>
                </div>
              </div>
            </div>
          </GlassSurface>
        </motion.div>
      </div>
      
      {/* iOS Lockscreen Preview Overlay using iPhone Mockup */}
      <AnimatePresence>
        {isPreviewMode && (
          <IphonePreviewMockup 
            imageUrl={mainImage.url} 
            imageAlt={item.name} 
            onClose={() => setIsPreviewMode(false)} 
          />
        )}
      </AnimatePresence>

      {/* Add custom style for scrollbar hiding and mask */}
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .mask-image-bottom { -webkit-mask-image: linear-gradient(to bottom, black 80%, transparent 100%); mask-image: linear-gradient(to bottom, black 80%, transparent 100%); }
      `}} />
    </main>
  );
}
