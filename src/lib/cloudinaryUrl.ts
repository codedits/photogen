/**
 * Client-safe helper to build Cloudinary transformed URLs from an existing secure URL.
 * It inserts a transform string after the `/upload/` segment in Cloudinary delivery URLs.
 * If the input is not a full URL (e.g., a public_id), it will return the source unchanged.
 */
export type ThumbOpts = { w?: number; h?: number; fit?: 'cover' | 'crop' | 'fill' | 'scale' | 'contain'; q?: string | number; f?: 'auto' | string; dpr?: number | 'auto'; g?: string };

export type CloudinaryPreset = 'hero' | 'hero_mobile' | 'card' | 'content' | 'social' | 'lqip';

const PRESET_DEFAULTS: Record<CloudinaryPreset, ThumbOpts> = {
  hero: { w: 1920, h: 1080, fit: 'cover', q: 'auto:good', f: 'auto', dpr: 'auto', g: 'auto' },
  hero_mobile: { w: 1080, h: 2160, fit: 'cover', q: 'auto:good', f: 'auto', dpr: 'auto', g: 'auto' },
  card: { w: 960, h: 640, fit: 'cover', q: 'auto:good', f: 'auto', dpr: 'auto', g: 'auto' },
  content: { w: 1280, h: 960, fit: 'contain', q: 'auto:good', f: 'auto', dpr: 'auto' },
  social: { w: 1200, h: 630, fit: 'cover', q: 'auto:good', f: 'auto', dpr: 1 },
  lqip: { w: 24, h: 24, fit: 'cover', q: 'auto:eco', f: 'auto', dpr: 1 },
};

export function thumbUrl(source: string, opts: ThumbOpts = {}) {
  const { w = 400, h = 300, fit = 'cover', q = 'auto', f = 'auto', dpr, g } = opts;
  if (!source) return source;
  // Only operate on full URLs that include /upload/
  if (!source.startsWith('http')) return source;
  try {
    const u = new URL(source);
    const parts = u.pathname.split('/upload/');
    if (parts.length !== 2) return source;

    // Check if the URL already has transformation-like characters in the path
    // But be careful not to skip URLs just because they have folders
    if (parts[1].includes('c_') && (parts[1].includes('w_') || parts[1].includes('h_'))) {
      return source;
    }

    // Map our fit -> cloudinary crop
    const cropMap: Record<string, string> = { cover: 'fill', crop: 'crop', fill: 'fill', scale: 'scale', contain: 'fit' };
    const c = cropMap[fit] || 'fill';
    const dp = typeof dpr !== 'undefined' ? `,dpr_${dpr}` : '';
    const grav = typeof g !== 'undefined' ? `,g_${g}` : '';
    // Simplify parameters to the bare essentials if previous high-quality params were too strict
    const t = `c_${c},w_${Math.round(w)},h_${Math.round(h)},q_auto,f_auto${dp}${grav}`;
    
    // Check if parts[1] starts with a version number like v123456789/
    // If it DOES NOT, and there are folders, Cloudinary sometimes expects the transform 
    // to be before the folders OR the version.
    let resourcePath = parts[1].replace(/^\//, '');
    
    const newPath = `${parts[0]}/upload/${t}/${resourcePath}`;
    return `${u.protocol}//${u.host}${newPath}`;
  } catch {
    return source;
  }
}

export function cloudinaryPresetUrl(source: string, preset: CloudinaryPreset, overrides: ThumbOpts = {}) {
  return thumbUrl(source, { ...PRESET_DEFAULTS[preset], ...overrides });
}

export default thumbUrl;
