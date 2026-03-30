'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { cloudinaryPresetUrl } from '@/lib/cloudinaryUrl';

interface ProductLightboxProps {
  images: string[];
  initialIndex: number;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductLightbox({
  images,
  initialIndex,
  alt,
  isOpen,
  onClose,
}: ProductLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const lastTouchDistance = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom when changing images
  useEffect(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, [currentIndex]);

  // Reset index when lightbox opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
    }
  }, [isOpen, initialIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
          break;
        case 'ArrowRight':
          setCurrentIndex(prev => (prev + 1) % images.length);
          break;
        case '+':
        case '=':
          setZoomLevel(prev => Math.min(prev + 0.5, 4));
          break;
        case '-':
          setZoomLevel(prev => Math.max(prev - 0.5, 1));
          break;
      }
    };

    document.addEventListener('keydown', handleKey);
    // Prevent body scroll while lightbox is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, images.length, onClose]);

  // Pan handling (when zoomed in)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoomLevel <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...panOffset };
  }, [zoomLevel, panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || zoomLevel <= 1) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPanOffset({
      x: panStart.current.x + dx,
      y: panStart.current.y + dy,
    });
  }, [isDragging, zoomLevel]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers for mobile (Pinch to zoom & Pan)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      if (zoomLevel <= 1) return;
      setIsDragging(true);
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      panStart.current = { ...panOffset };
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistance.current = distance;
    }
  }, [zoomLevel, panOffset]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging && zoomLevel > 1) {
      const dx = e.touches[0].clientX - dragStart.current.x;
      const dy = e.touches[0].clientY - dragStart.current.y;
      setPanOffset({
        x: panStart.current.x + dx,
        y: panStart.current.y + dy,
      });
    } else if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );

      const delta = (distance - lastTouchDistance.current) / 100;
      setZoomLevel(prev => {
        const next = Math.max(1, Math.min(prev + delta * 1.5, 4));
        if (next <= 1) setPanOffset({ x: 0, y: 0 });
        return next;
      });
      lastTouchDistance.current = distance;
    }
  }, [isDragging, zoomLevel]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    lastTouchDistance.current = null;
  }, []);

  // Double-click to toggle zoom
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
    } else {
      // Zoom to 2.5× centered on click point
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left - rect.width / 2;
      const clickY = e.clientY - rect.top - rect.height / 2;
      setZoomLevel(2.5);
      setPanOffset({
        x: -clickX * 1.5,
        y: -clickY * 1.5,
      });
    }
  }, [zoomLevel]);

  // Scroll wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.3 : 0.3;
    setZoomLevel(prev => {
      const next = Math.max(1, Math.min(prev + delta, 4));
      if (next <= 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  return (
    <>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox viewer"
          className="fixed inset-0 z-[1000] bg-background flex flex-col animate-in fade-in duration-200"
        >
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-background/90 via-background/50 to-transparent">
            <span className="text-foreground text-sm font-normal tracking-wider uppercase">
              {currentIndex + 1} / {images.length}
            </span>
            <div className="flex items-center gap-4">
              {/* Zoom controls */}
              <div className="flex items-center bg-foreground/10 backdrop-blur-md rounded-full px-2">
                <button
                  onClick={() => setZoomLevel(prev => Math.max(prev - 0.5, 1))}
                  aria-label="Zoom out"
                  className="focus-ring w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  disabled={zoomLevel <= 1}
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <span className="text-foreground text-[11px] font-normal min-w-[50px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel(prev => Math.min(prev + 0.5, 4))}
                  aria-label="Zoom in"
                  className="focus-ring w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  disabled={zoomLevel >= 4}
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={onClose}
                aria-label="Close lightbox"
                className="focus-ring w-10 h-10 flex items-center justify-center bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors shadow-lg"
              >
                <X className="w-6 h-6 stroke-[2.5px]" />
              </button>
            </div>
          </div>

          {/* Main image area */}
          <div
            ref={containerRef}
            className={cn(
              'flex-1 flex items-center justify-center overflow-hidden select-none touch-none',
              zoomLevel > 1 ? 'cursor-grab' : 'cursor-zoom-in',
              isDragging && 'cursor-grabbing',
            )}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={images[currentIndex]}
              src={cloudinaryPresetUrl(images[currentIndex], 'lightbox')}
              alt={`${alt} — view ${currentIndex + 1}`}
              className="w-full h-full object-contain object-center transition-transform duration-150 ease-out"
              style={{
                transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                willChange: 'transform',
              }}
              draggable={false}
            />
          </div>

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={goPrev}
                aria-label="Previous image"
                className="focus-ring absolute left-6 top-1/2 -translate-y-1/2 z-50 w-12 h-12 flex items-center justify-center bg-foreground/20 backdrop-blur-md rounded-full hover:bg-foreground hover:text-background transition-all text-foreground shadow-xl"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
              <button
                onClick={goNext}
                aria-label="Next image"
                className="focus-ring absolute right-6 top-1/2 -translate-y-1/2 z-50 w-12 h-12 flex items-center justify-center bg-foreground/20 backdrop-blur-md rounded-full hover:bg-foreground hover:text-background transition-all text-foreground shadow-xl"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            </>
          )}

          {/* Bottom thumbnail strip */}
          {images.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-background/60 to-transparent py-4 px-6">
              <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`Show image ${idx + 1}`}
                    className={cn(
                      'focus-ring relative w-14 h-14 md:w-16 md:h-16 shrink-0 overflow-hidden border-2 transition-all bg-white/5',
                      idx === currentIndex
                        ? 'border-white opacity-100'
                        : 'border-transparent opacity-50 hover:opacity-80',
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cloudinaryPresetUrl(img, 'card')}
                      alt=""
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Double-click hint (shows briefly) */}
          {zoomLevel <= 1 && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 text-muted-foreground text-[11px] font-normal uppercase tracking-widest pointer-events-none bg-background/20 backdrop-blur-sm px-4 py-1 rounded-full">
              Pinch or Scroll to zoom · Arrows to navigate
            </div>
          )}
        </div>
      )}
    </>
  );
}
