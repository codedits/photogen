import type { ImageLoaderProps } from 'next/image';

const CLOUDINARY_HOST = 'res.cloudinary.com';

function isHttpUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}

function qualityToken(quality?: number): string {
  return quality ? `q_${quality}` : '';
}

function ensureTransformToken(tokens: string[], keyPrefix: string, value: string) {
  const idx = tokens.findIndex((t) => t.startsWith(keyPrefix));
  if (idx >= 0) tokens[idx] = value;
  else tokens.push(value);
}

function rewriteTransformForWidth(transform: string, width: number, quality?: number): string {
  const tokens = transform.split(',').filter(Boolean);

  const originalW = Number(tokens.find((t) => t.startsWith('w_'))?.slice(2));
  const originalH = Number(tokens.find((t) => t.startsWith('h_'))?.slice(2));
  const hasRatio = Number.isFinite(originalW) && Number.isFinite(originalH) && originalW > 0;

  ensureTransformToken(tokens, 'w_', `w_${Math.round(width)}`);
  if (hasRatio) {
    const ratio = (originalH as number) / (originalW as number);
    ensureTransformToken(tokens, 'h_', `h_${Math.max(1, Math.round(width * ratio))}`);
  }

  const qualityValue = qualityToken(quality);
  if (qualityValue) {
    ensureTransformToken(tokens, 'q_', qualityValue);
  } else if (!tokens.some((t) => t.startsWith('q_'))) {
    tokens.push('q_auto:good');
  }

  ensureTransformToken(tokens, 'f_', 'f_auto');
  ensureTransformToken(tokens, 'fl_', 'fl_progressive:none');

  if (!tokens.some((t) => t.startsWith('c_'))) {
    tokens.push('c_limit');
  }

  return tokens.join(',');
}

function rewriteCloudinaryPath(pathname: string, width: number, quality?: number): string {
  const markers = ['/upload/', '/image/fetch/'];

  for (const marker of markers) {
    const parts = pathname.split(marker);
    if (parts.length !== 2) continue;

    const suffix = parts[1].replace(/^\//, '');
    const segments = suffix.split('/');
    const first = segments[0] || '';
    const looksLikeTransform = first.includes('_') || first.includes(',');

    if (looksLikeTransform) {
      segments[0] = rewriteTransformForWidth(first, width, quality);
      return `${parts[0]}${marker}${segments.join('/')}`;
    }

    const qualityPart = qualityToken(quality) || 'q_auto:good';
    const inserted = `c_limit,w_${Math.round(width)},${qualityPart},f_auto,fl_progressive:none`;
    return `${parts[0]}${marker}${inserted}/${suffix}`;
  }

  return pathname;
}

function cloudinaryFetchUrl(src: string, width: number, quality?: number): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return src;

  const qualityPart = qualityToken(quality) || 'q_auto:good';
  const transform = `c_limit,w_${Math.round(width)},${qualityPart},f_auto,fl_progressive:none`;
  return `https://${CLOUDINARY_HOST}/${cloudName}/image/fetch/${transform}/${encodeURIComponent(src)}`;
}

export default function cloudinaryLoader({ src, width, quality }: ImageLoaderProps): string {
  if (!src) return src;

  if (src.startsWith('/') || src.startsWith('data:') || src.startsWith('blob:')) {
    return src;
  }

  if (!isHttpUrl(src)) {
    return src;
  }

  try {
    const url = new URL(src);

    if (url.hostname.includes(CLOUDINARY_HOST)) {
      url.pathname = rewriteCloudinaryPath(url.pathname, width, quality);
      return url.toString();
    }

    return cloudinaryFetchUrl(src, width, quality);
  } catch {
    return src;
  }
}
