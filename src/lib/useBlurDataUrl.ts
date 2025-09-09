"use client";
import { useEffect, useState } from 'react';
import { thumbUrl } from './cloudinaryUrl';

type Opts = { w?: number; h?: number; fit?: 'cover' | 'crop' | 'fill' | 'scale' };

/**
 * Fetch a tiny transformed image and return a base64 data URL for use as blurDataURL.
 * Caches results in sessionStorage to avoid repeated network round-trips in a session.
 */
export default function useBlurDataUrl(src?: string, opts: Opts = { w: 8, h: 8, fit: 'cover' }) {
  const [blur, setBlur] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!src) return;
    if (typeof window === 'undefined') return;
    const key = `lqip:${src}`;
    try {
      const cached = sessionStorage.getItem(key);
      if (cached) {
        setBlur(cached);
        return;
      }
    } catch {
      // ignore sessionStorage errors
    }

    let aborted = false;
    const controller = new AbortController();

    (async () => {
      try {
        const tinyUrl = thumbUrl(src, { w: opts.w || 8, h: opts.h || 8, fit: opts.fit || 'cover', q: 'auto', f: 'auto' });
        const res = await fetch(tinyUrl, { signal: controller.signal });
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (aborted) return;
          const b64 = String(reader.result || '');
          try { sessionStorage.setItem(key, b64); } catch {}
          setBlur(b64);
        };
        reader.readAsDataURL(blob);
      } catch {
        // noop
      }
    })();

    return () => {
      aborted = true;
      try { controller.abort(); } catch {}
    };
  }, [src, opts.w, opts.h, opts.fit]);

  return blur;
}
