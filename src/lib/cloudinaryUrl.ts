/**
 * Client-safe helper to build Cloudinary transformed URLs from an existing secure URL.
 * It inserts a transform string after the `/upload/` segment in Cloudinary delivery URLs.
 * If the input is not a full URL (e.g., a public_id), it will return the source unchanged.
 */
export type ThumbOpts = { w?: number; h?: number; fit?: 'cover' | 'crop' | 'fill' | 'scale' | 'contain'; q?: string | number; f?: 'auto' | string; dpr?: number | 'auto' };

export function thumbUrl(source: string, opts: ThumbOpts = {}) {
  const { w = 400, h = 300, fit = 'cover', q = 'auto', f = 'auto', dpr } = opts;
  if (!source) return source;
  // Only operate on full URLs that include /upload/
  if (!source.startsWith('http')) return source;
  try {
    const u = new URL(source);
    const parts = u.pathname.split('/upload/');
    if (parts.length !== 2) return source;
    // Map our fit -> cloudinary crop
  const cropMap: Record<string, string> = { cover: 'fill', crop: 'crop', fill: 'fill', scale: 'scale', contain: 'fit' };
    const c = cropMap[fit] || 'fill';
  const dp = typeof dpr !== 'undefined' ? `,dpr_${dpr}` : '';
  const t = `c_${c},w_${Math.round(w)},h_${Math.round(h)},q_${q},f_${f}${dp}`;
    const newPath = parts[0] + '/upload/' + t + '/' + parts[1].replace(/^\//, '');
    return `${u.protocol}//${u.host}${newPath}`;
  } catch {
    return source;
  }
}

export default thumbUrl;
