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
}: {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  transformOpts?: { w?: number; h?: number; fit?: 'cover' | 'crop' | 'fill' | 'scale' };
}) {
  const blur = useBlurDataUrl(src, { w: transformOpts?.w || 8, h: transformOpts?.h || 8, fit: transformOpts?.fit || 'cover' });
  const url = thumbUrl(src, { w: transformOpts?.w || width || 400, h: transformOpts?.h || height || 300, fit: transformOpts?.fit || 'cover', q: 'auto', f: 'auto' });
  const placeholder = blur ? 'blur' as const : undefined;

  if (fill) {
    return <Image src={url} alt={alt || ''} fill className={className} placeholder={placeholder} blurDataURL={blur} />;
  }

  return <Image src={url} alt={alt || ''} width={width} height={height} className={className} placeholder={placeholder} blurDataURL={blur} />;
}
