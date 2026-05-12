"use client";
import React from 'react';
import Image from 'next/image';
import useBlurDataUrl from '../lib/useBlurDataUrl';
import { thumbUrl } from '../lib/cloudinaryUrl';

const FALLBACK_SHIMMER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iMzAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjMwIiBmaWxsPSIjMTEwZjE0Ii8+PGxpbmVhckdyYWRpZW50IGlkPSJnIiB4MT0iMCIgeDI9IjEiIHkxPSIwIiB5Mj0iMSI+PHN0b3Agc3RvcC1jb2xvcj0iIzExMGYxNCIvPjxzdG9wIG9mZnNldD0iMC41IiBzdG9wLWNvbG9yPSIjMWYxYjI0Ii8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMTEwZjE0Ii8+PC9saW5lYXJHcmFkaWVudD48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iMzAiIGZpbGw9InVybCgjZykiIG9wYWNpdHk9IjAuNyIvPjwvc3ZnPg==';

// Wrapper that conditionally uses the blur hook
function useOptionalBlur(src: string | undefined, opts: { w: number; h: number; fit: 'cover' | 'crop' | 'fill' | 'scale' | 'contain' }, skip: boolean) {
  // Always call the hook (React rules), but pass undefined src to skip the work
  return useBlurDataUrl(skip ? undefined : src, opts);
}

export default function ImageWithLqip({
  src,
  alt,
  width,
  height,
  fill,
  className,
  transformOpts,
  priority,
  sizes,
  loading,
  onLoad,
  noBlur = false,
}: {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  transformOpts?: { w?: number; h?: number; fit?: 'cover' | 'crop' | 'fill' | 'scale' | 'contain'; q?: string | number; f?: 'auto' | string; dpr?: number | 'auto'; g?: string };
  priority?: boolean;
  sizes?: string;
  loading?: 'eager' | 'lazy';
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  noBlur?: boolean;
}) {
  // Skip blur fetches entirely when noBlur is true (saves 14+ network requests on gallery page)
  const blur = useOptionalBlur(src, { w: Math.min(transformOpts?.w || width || 400, 64), h: Math.min(transformOpts?.h || height || 300, 64), fit: transformOpts?.fit || 'cover' }, noBlur);
  
  if (!src || src === "undefined") {
    return <div className={className} style={{ width, height, position: fill ? 'absolute' : 'relative', inset: fill ? 0 : undefined, backgroundColor: 'rgba(255,255,255,0.05)' }} />;
  }
  
  const fit = transformOpts?.fit || 'cover';
  
  // For the main image URL, only append explicit dimensions. 
  // If `fill` is used, we rely on `next/image` and `cloudinaryLoader` to append `w_${width}` dynamically.
  // Avoid forcing arbitrary aspect ratios (like 400x300) onto the image.
  const requestedWidth = transformOpts?.w || width;
  const requestedHeight = transformOpts?.h || height;

  const url = thumbUrl(src, { 
    w: requestedWidth,
    h: requestedHeight,
    fit,
    q: transformOpts?.q ?? 'auto:good', 
    f: transformOpts?.f ?? 'auto', 
    dpr: transformOpts?.dpr,
    g: transformOpts?.g ?? (fit === 'cover' ? 'auto' : undefined)
  });

  const effectiveSizes =
    sizes ||
    (fill
      ? `${requestedWidth}px`
      : typeof width === 'number'
        ? `${Math.max(1, Math.round(width))}px`
        : '100vw');
  const effectiveBlurDataUrl = !noBlur ? (blur || FALLBACK_SHIMMER) : undefined;
  const placeholder = effectiveBlurDataUrl ? ('blur' as const) : undefined;

  // Determine objectFit from className if present, fall back to cover for thumbs and contain for fills
  const hasObjectContain = typeof className === 'string' && className.includes('object-contain');
  const hasObjectCover = typeof className === 'string' && className.includes('object-cover');
  const objectFit: 'cover' | 'contain' = hasObjectContain ? 'contain' : hasObjectCover ? 'cover' : (fill ? 'contain' : 'cover');

  if (fill) {
    return <Image src={url} alt={alt || ''} fill style={{ objectFit }} className={className} placeholder={placeholder} blurDataURL={effectiveBlurDataUrl} priority={priority} sizes={effectiveSizes} loading={loading} onLoad={onLoad} />;
  }

  return <Image src={url} alt={alt || ''} width={width} height={height} style={{ objectFit }} className={className} placeholder={placeholder} blurDataURL={effectiveBlurDataUrl} priority={priority} sizes={effectiveSizes} loading={loading} onLoad={onLoad} />;
}
