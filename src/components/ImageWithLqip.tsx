"use client";
import React from 'react';
import Image from 'next/image';
import useBlurDataUrl from '../lib/useBlurDataUrl';
import { thumbUrl } from '../lib/cloudinaryUrl';

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
}: {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  transformOpts?: { w?: number; h?: number; fit?: 'cover' | 'crop' | 'fill' | 'scale' | 'contain'; q?: string | number; f?: 'auto' | string; dpr?: number | 'auto' };
  priority?: boolean;
  sizes?: string;
  loading?: 'eager' | 'lazy';
}) {
  if (!src || src === "undefined") {
    return <div className={className} style={{ width, height, position: fill ? 'absolute' : 'relative', inset: fill ? 0 : undefined, backgroundColor: 'rgba(255,255,255,0.05)' }} />;
  }
  const blur = useBlurDataUrl(src, { w: Math.min(transformOpts?.w || width || 400, 24), h: Math.min(transformOpts?.h || height || 300, 24), fit: transformOpts?.fit || 'cover' });
  const url = thumbUrl(src, { w: transformOpts?.w || width || 400, h: transformOpts?.h || height || 300, fit: transformOpts?.fit || 'cover', q: transformOpts?.q ?? 'auto', f: transformOpts?.f ?? 'auto', dpr: transformOpts?.dpr });
  const placeholder = blur ? 'blur' as const : undefined;

  // Determine objectFit from className if present, fall back to cover for thumbs and contain for fills
  const hasObjectContain = typeof className === 'string' && className.includes('object-contain');
  const hasObjectCover = typeof className === 'string' && className.includes('object-cover');
  const objectFit: 'cover' | 'contain' = hasObjectContain ? 'contain' : hasObjectCover ? 'cover' : (fill ? 'contain' : 'cover');

  if (fill) {
    // When using `fill`, pass objectFit via style to Next/Image to prevent stretching
    return <Image src={url} alt={alt || ''} fill style={{ objectFit }} className={className} placeholder={placeholder} blurDataURL={blur} priority={priority} sizes={sizes} loading={loading} />;
  }

  return <Image src={url} alt={alt || ''} width={width} height={height} style={{ objectFit }} className={className} placeholder={placeholder} blurDataURL={blur} priority={priority} sizes={sizes} loading={loading} />;
}
