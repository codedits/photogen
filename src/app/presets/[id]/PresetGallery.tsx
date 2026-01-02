"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Maximize2, Minimize2, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { thumbUrl } from "../../../lib/cloudinaryUrl";
import useBlurDataUrl from "../../../lib/useBlurDataUrl";

interface PresetGalleryProps {
  images: { url: string; public_id?: string }[];
  presetName: string;
}

export default function PresetGallery({ images, presetName }: PresetGalleryProps) {
  // "contain" ensures NO CROP. "cover" zooms in to fill.
  const [fitMode, setFitMode] = useState<"contain" | "cover">("contain");
  const [currentIndex, setCurrentIndex] = useState(0);

  // Aggressive preloading of all images in the gallery (idempotent + cleanup)
  useEffect(() => {
    if (!images || images.length <= 1) return;

    const added: HTMLLinkElement[] = [];

    images.forEach((img, idx) => {
      // Skip current image since it is loaded via priority
      if (idx === currentIndex) return;

      const href = thumbUrl(img.url, { w: 1200, h: 1600, fit: 'contain', q: 'auto:good' });
      // Avoid adding duplicates
      if (document.querySelector(`link[rel="preload"][href="${href}"]`)) return;

      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = href;
      document.head.appendChild(link);
      added.push(link);
    });

    return () => {
      // Clean up only the links we added
      for (const l of added) try { l.remove(); } catch {}
    };
  }, [images, currentIndex]);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-[50vh] lg:h-screen bg-[#080808] flex flex-col items-center justify-center text-white/20 border-b lg:border-b-0 lg:border-r border-white/10">
        <ImageIcon className="w-16 h-16 opacity-20 mb-4" />
        <p className="font-mono text-xs uppercase tracking-widest">No Preview Available</p>
      </div>
    );
  }

  const currentImage = images[currentIndex];
  // Construct optimized URL and LQIP blur data (hook only runs when currentImage exists)
  const optimizedUrl = thumbUrl(currentImage.url, { w: 1200, h: 1600, fit: 'contain', q: 'auto:good' });
  const blurData = useBlurDataUrl(currentImage.url, { w: 10, h: 10 });

  const nextImage = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <div className="relative w-full h-[60vh] lg:h-screen bg-[#050505] overflow-hidden group border-b lg:border-b-0 lg:border-r border-white/10">
      
      {/* --- AMBIENCE LAYER (The blurred background) --- */}
      {/* This fills the black bars so 'contain' mode looks elegant */}
      <div className="absolute inset-0 z-0">
        <Image
          src={thumbUrl(currentImage.url, { w: 200, h: 200, fit: 'cover', q: 30 })}
          alt="Ambience"
          fill
          className="object-cover opacity-20 blur-[50px] scale-110"
          unoptimized
        />
      </div>

      {/* --- MAIN IMAGE --- */}
      <div className="relative z-10 w-full h-full p-4 lg:p-12 transition-all duration-500">
        <Image
          key={currentImage.url}
          src={optimizedUrl}
          alt={`${presetName} view ${currentIndex + 1}`}
          fill
          className={`transition-all duration-700 ease-in-out ${
            fitMode === "contain" ? "object-contain" : "object-cover"
          }`}
          sizes="(max-width: 768px) 100vw, 70vw"
          priority
          placeholder={blurData ? "blur" : "empty"}
          blurDataURL={blurData}
          unoptimized
        />
      </div>

      {/* --- CONTROLS --- */}
      
      {/* 1. Fit Toggle (Top Right) */}
      <button
        onClick={() => setFitMode(fitMode === "contain" ? "cover" : "contain")}
        className="absolute top-6 right-6 z-30 p-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-full text-white/70 hover:text-white transition-all hover:bg-white/10"
        title={fitMode === "contain" ? "Fill Screen (Zoom)" : "Fit Image (No Crop)"}
      >
        {fitMode === "contain" ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
      </button>

      {/* 2. Counter (Top Left) */}
      <div className="absolute top-6 left-6 z-20 bg-black/50 backdrop-blur border border-white/10 px-3 py-1 text-[10px] uppercase tracking-widest text-white/80 font-mono rounded-full">
        {(currentIndex + 1).toString().padStart(2, "0")} / {images.length.toString().padStart(2, "0")}
      </div>

      {/* 3. Navigation (Only if > 1 image) */}
      {images.length > 1 && (
        <>
          <button 
            onClick={prevImage}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/20 hover:bg-white/10 text-white/50 hover:text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={nextImage}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/20 hover:bg-white/10 text-white/50 hover:text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Bottom Dots */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? "bg-white w-6" : "bg-white/20 w-1 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}