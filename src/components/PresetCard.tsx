"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Layers, Image as ImageIcon } from "lucide-react";
import ImageWithLqip from './ImageWithLqip';


export type Preset = {
  id: string;
  name: string;
  description?: string;
  prompt?: string;
  image?: string;
  images?: { url: string; public_id?: string }[];
  tags?: string[];
};

interface PresetCardProps {
  preset: Preset;
  className?: string;
  priority?: boolean;
}

export default function PresetCard({ preset, className = "", priority = false }: PresetCardProps) {
  // Logic to grab the main image (unchanged)
  const thumbnails = (preset.images && preset.images.length)
    ? preset.images.slice(0, 3).map(i => i.url)
    : (preset.image ? [preset.image] : []);
  
  const mainImage = thumbnails[0];
  const imageCount = preset.images?.length || 0;

  return (
    <motion.article 
      initial="rest"
      whileHover="hover"
      animate="rest"
      className={`group relative w-full bg-neutral-950 border border-white/10 hover:border-white/30 transition-colors duration-300 overflow-hidden ${className}`}
    >
      {/* ASPECT RATIO CONTAINER 
        Using 4:5 (Standard Portrait) for a "Photo Studio" feel
      */}
      <div className="relative aspect-[4/5] overflow-hidden w-full">
        
        {/* --- IMAGE LAYER --- */}
        {mainImage ? (
           <motion.div 
             className="w-full h-full relative"
             variants={{
               rest: { scale: 1 },
               hover: { scale: 1.05 }
             }}
             transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
           >
             <ImageWithLqip
                src={mainImage}
                alt={preset.name}
                fill
                className="object-cover transition-all duration-700 opacity-80 group-hover:opacity-100" 
                transformOpts={{ w: 600, h: 800, fit: 'cover', q: 'auto:good' }}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                priority={priority}
             />
           </motion.div>
        ) : (
           <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-neutral-700">
             <Layers className="w-12 h-12 opacity-20" />
           </div>
        )}

        {/* --- OVERLAY GRADIENT (Cinematic fade) --- */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90 pointer-events-none" />
        
        {/* --- INTERACTIVE TOP BADGE --- */}
        <motion.div 
          variants={{ rest: { y: -10, opacity: 0 }, hover: { y: 0, opacity: 1 }}}
          transition={{ duration: 0.3 }}
          className="absolute top-3 right-3 z-20 flex gap-2"
        >
          {imageCount > 1 && (
            <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md border border-white/10 px-2 py-1 text-[9px] text-white uppercase tracking-widest">
              <ImageIcon className="w-3 h-3" />
              <span>{imageCount}</span>
            </div>
          )}
          <div className="bg-white text-black px-2 py-1 text-[9px] font-bold uppercase tracking-widest">
            Open
          </div>
        </motion.div>

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
             <h3 className="text-xl md:text-2xl font-light text-white uppercase tracking-tighter leading-none">
               {preset.name}
             </h3>
             <ArrowUpRight className="w-4 h-4 text-white/50 group-hover:text-white group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
           </div>
           
           {/* Tags / Metadata */}
           <div className="flex items-center justify-between mt-2">
             {preset.tags && preset.tags.length > 0 ? (
               <p className="text-[10px] text-white/50 font-mono uppercase tracking-widest truncate max-w-[80%]">
                 {preset.tags.slice(0, 3).join(" / ")}
               </p>
             ) : (
               <p className="text-[10px] text-white/30 font-mono uppercase tracking-widest">RAW</p>
             )}
             
             {/* Fake ID number for "Technical" look */}
             <span className="text-[9px] text-white/20 font-mono">
               {preset.id.substring(0, 4).toUpperCase()}
             </span>
           </div>
        </div>
      </div>
      </motion.article>
  );
}