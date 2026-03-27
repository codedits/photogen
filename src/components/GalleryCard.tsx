"use client";

import React, { memo } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import ImageWithLqip from './ImageWithLqip';
import { cn } from '../lib/utils';

// Simplified Item type for the card
export interface GalleryCardItem {
  _id: string;
  name: string;
  category: string;
  uploadDate?: string | Date;
  images: Array<{ url: string; public_id: string }>;
}

interface GalleryCardProps {
  item: GalleryCardItem;
  index: number;
  aspectRatio?: string; // e.g. "3/2", "4/5"
  className?: string;
  priority?: boolean;
  sizes?: string;
  width?: number; // Base width for Cloudinary transform
  height?: number | string; 
  parallax?: boolean;
}

const ParallaxMedia = memo(function ParallaxMedia({
  children,
}: {
  children: React.ReactNode;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const scrollScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const scale = useSpring(scrollScale, { stiffness: 100, damping: 30 });

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <motion.div
        className="w-full h-full relative"
        style={{ scale }}
        transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
      >
        {children}
      </motion.div>
    </div>
  );
});

const GalleryCard = ({ 
  item, 
  index, 
  aspectRatio = "3/2", 
  className,
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  width = 1200,
  parallax = false,
  height
}: GalleryCardProps) => {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const enableEntranceAnimation = index < 12;

  const dateStr = item.uploadDate ? new Date(item.uploadDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) : '';

  // ... (cloudinary logic remains same)
  let cloudinaryHeight: number | undefined;
  if (typeof height === 'number') {
    cloudinaryHeight = height;
  } else if (typeof height === 'string' && height.endsWith('vh')) {
    const vhValue = parseInt(height);
    cloudinaryHeight = Math.round((width * (vhValue / 100)) * 1.5);
  }

  if (!cloudinaryHeight && aspectRatio?.includes('/')) {
    const [wRatio, hRatio] = aspectRatio.split('/').map(Number);
    if (wRatio && hRatio) {
      cloudinaryHeight = Math.round((width * hRatio) / wRatio);
    }
  }

  const transformOpts = { 
    w: width, 
    h: cloudinaryHeight || 800,
    q: 'auto:good' 
  };

  return (
    <motion.div
      initial={enableEntranceAnimation ? { opacity: 0, y: 8 } : false}
      whileInView={enableEntranceAnimation ? { opacity: 1, y: 0 } : undefined}
      viewport={enableEntranceAnimation ? { once: true, margin: "-50px" } : undefined}
      transition={{ duration: 0.5, delay: index < 6 ? 0 : (index % 3) * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className={cn("w-full font-sans", className)}
    >
      <motion.article 
        initial="rest"
        whileHover="hover"
        animate="rest"
        className="group relative w-full bg-neutral-900 border border-white/10 hover:border-white/30 transition-colors duration-300 overflow-hidden"
      >
        <Link href={`/gallery/${item._id}`} className="block">
          <div 
            className="relative overflow-hidden w-full"
            style={{ 
              aspectRatio: typeof height === 'string' ? undefined : aspectRatio,
              height: typeof height === 'string' ? height : undefined
            }}
          >
            
            {parallax ? (
              <ParallaxMedia>
                <ImageWithLqip
                  src={item.images[0]?.url}
                  alt={item.name}
                  fill
                  sizes={sizes}
                  priority={priority}
                  className="object-cover transition-all duration-700 opacity-100"
                  transformOpts={transformOpts}
                  noBlur={true}
                />
              </ParallaxMedia>
            ) : (
              <motion.div
                className="w-full h-full relative"
                variants={{
                  rest: { scale: 1, filter: 'blur(0px)' },
                  hover: { 
                    scale: 1.02, 
                    filter: isMobile ? 'blur(0px)' : 'blur(5px)' 
                  },
                }}
                transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1] }}
              >
                <ImageWithLqip
                  src={item.images[0]?.url}
                  alt={item.name}
                  fill
                  sizes={sizes}
                  priority={priority}
                  className="object-cover transition-all duration-700 opacity-100"
                  transformOpts={transformOpts}
                  noBlur={true}
                />
              </motion.div>
            )}

            {/* --- OVERLAY GRADIENT (Cinematic fade) --- */}
            <motion.div 
              className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors duration-700 pointer-events-none" 
            />
            
            {/* --- DESKTOP CENTERED CONTENT --- */}
            <div className="absolute inset-0 z-20 hidden md:flex flex-col items-center justify-center p-6 text-center">
              <motion.div
                variants={{
                  rest: { opacity: 0 },
                  hover: { 
                    opacity: 1,
                    transition: { staggerChildren: 0.05, delayChildren: 0.1 }
                  }
                }}
                className="flex flex-col items-center"
              >
                <motion.h2 
                  variants={{
                    rest: { y: -20, opacity: 0 },
                    hover: { y: 0, opacity: 1 }
                  }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="text-xl md:text-2xl font-light text-white uppercase tracking-tighter mb-1 leading-tight"
                >
                  {item.name}
                </motion.h2>
                
                <motion.p 
                  variants={{
                    rest: { y: 20, opacity: 0 },
                    hover: { y: 0, opacity: 1 }
                  }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="text-[9px] text-white/60 font-mono uppercase tracking-tight"
                >
                  {item.category} / {dateStr}
                </motion.p>
              </motion.div>
            </div>

            {/* --- MOBILE/ORIGINAL BOTTOM OVERLAY --- */}
            <div className="absolute bottom-0 left-0 right-0 p-5 z-20 md:hidden bg-gradient-to-t from-black/90 via-black/20 to-transparent">
              <div className="flex justify-between items-start mb-1">
                <h2 className="text-xl font-light text-white uppercase tracking-tighter leading-none">
                  {item.name}
                </h2>
                <ArrowUpRight className="w-4 h-4 text-white/50" />
              </div>
              <p className="text-[10px] text-white/50 font-mono uppercase tracking-widest">
                {item.category}
              </p>
            </div>

            {/* --- DESKTOP BOTTOM RIGHT REFERENCE --- */}
            <div className="absolute bottom-4 right-5 z-20 pointer-events-none hidden md:block">
              <motion.div
                variants={{
                   rest: { opacity: 0.4, y: 0 },
                   hover: { opacity: 0, y: 10 }
                }}
                className="flex flex-col items-end"
              >
                <span className="text-[9px] text-white/40 font-mono tracking-tighter uppercase">
                  Ref_{item._id.substring(item._id.length - 4).toUpperCase()}
                </span>
              </motion.div>
            </div>
          </div>
        </Link>
      </motion.article>
    </motion.div>
  );
};

export default memo(GalleryCard);
