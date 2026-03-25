"use client";

import React from 'react';
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
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const scrollScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const scale = useSpring(scrollScale, { stiffness: 100, damping: 30 });

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
      ref={containerRef}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
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
            
            <motion.div 
              className="w-full h-full relative"
              style={{ scale: parallax ? scale : undefined }}
              variants={!parallax ? {
                rest: { scale: 1 },
                hover: { scale: 1.05 }
              } : undefined}
              transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
            >
              <ImageWithLqip
                src={item.images[0]?.url}
                alt={item.name}
                fill
                sizes={sizes}
                priority={priority}
                className="object-cover transition-all duration-700 opacity-80 group-hover:opacity-100" 
                transformOpts={transformOpts}
                noBlur={true}
              />
            </motion.div>

            {/* --- OVERLAY GRADIENT (Cinematic fade) --- */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90 pointer-events-none" />
            
            {/* --- BOTTOM CONTENT AREA --- */}
            <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
              
              {/* Decorative Line that fills on hover */}
              <div className="w-full h-[1px] bg-white/20 mb-3 overflow-hidden text-glow">
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
                <p className="text-[10px] text-white/50 font-mono uppercase tracking-[0.2em] truncate max-w-[80%]">
                  {item.category} / {dateStr}
                </p>
                
                {/* Fake ID/Ref number for "Technical" look */}
                <span className="text-[9px] text-white/30 font-mono">
                  {item._id.substring(0, 4).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </Link>
      </motion.article>
    </motion.div>
  );
};

export default React.memo(GalleryCard);
