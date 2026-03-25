'use client';

import React, { useState } from 'react';
import ImageWithLqip from './ImageWithLqip';
import { ProductLightbox } from './ProductLightbox';
import { Maximize2 } from 'lucide-react';

interface GalleryImageGridProps {
  images: { url: string }[];
  userName: string;
}

export default function GalleryImageGrid({ images, userName }: GalleryImageGridProps) {
  const [lightboxState, setLightboxState] = useState<{ isOpen: boolean; index: number }>({
    isOpen: false,
    index: 0,
  });

  const openLightbox = (index: number) => {
    setLightboxState({ isOpen: true, index });
  };

  const closeLightbox = () => {
    setLightboxState(prev => ({ ...prev, isOpen: false }));
  };

  const leftColImages = images.filter((_, i) => i % 2 === 0);
  const rightColImages = images.filter((_, i) => i % 2 === 1);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[2px]">
        {/* Left Column */}
        <div className="flex flex-col gap-[2px]">
          {leftColImages.map((img, idx) => {
            const originalIndex = idx * 2;
            return (
              <div 
                key={idx} 
                className="relative group w-full overflow-hidden rounded-lg bg-background cursor-zoom-in"
                onClick={() => openLightbox(originalIndex)}
              >
                <ImageWithLqip 
                  src={img.url} 
                  alt={`${userName} - Plate ${originalIndex + 1}`} 
                  width={800}
                  height={1067}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="w-full h-auto object-cover transition-transform duration-[2s] ease-out group-hover:scale-[1.03]"
                  transformOpts={{ w: 800, q: 'auto:good' }}
                  priority={idx === 0}
                  noBlur={true}
                />
                


                <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                   <span className="text-[10px] uppercase tracking-[0.4em] font-mono text-white/60">
                     {/* Numbering removed */}
                   </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-[2px] lg:mt-20">
          {rightColImages.map((img, idx) => {
            const originalIndex = idx * 2 + 1;
            return (
              <div 
                key={idx} 
                className="relative group w-full overflow-hidden rounded-lg bg-background cursor-zoom-in"
                onClick={() => openLightbox(originalIndex)}
              >
                <ImageWithLqip 
                  src={img.url} 
                  alt={`${userName} - Plate ${originalIndex + 1}`} 
                  width={800}
                  height={1067}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="w-full h-auto object-cover transition-transform duration-[2s] ease-out group-hover:scale-[1.03]"
                  transformOpts={{ w: 800, q: 'auto:good' }}
                  noBlur={true}
                />



                <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                   <span className="text-[10px] uppercase tracking-[0.4em] font-mono text-white/60">
                     {/* Numbering removed */}
                   </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ProductLightbox 
        isOpen={lightboxState.isOpen}
        images={images.map(img => img.url)}
        initialIndex={lightboxState.index}
        onClose={closeLightbox}
        alt={userName}
      />
    </>
  );
}
