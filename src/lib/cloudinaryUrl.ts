/**
 * Client-safe helper to build Cloudinary transformed URLs from an existing secure URL.
 * It inserts a transform string after the `/upload/` segment in Cloudinary delivery URLs.
 * If the input is not a full URL (e.g., a public_id), it will return the source unchanged.
 */
export type ThumbOpts = { w?: number; h?: number; fit?: 'cover' | 'crop' | 'fill' | 'scale' | 'contain'; q?: string | number; f?: 'auto' | string; dpr?: number | 'auto'; g?: string };

export type CloudinaryPreset = 'hero' | 'hero_mobile' | 'card' | 'content' | 'social' | 'lqip' | 'lightbox';

const CLOUDINARY_HOST = 'res.cloudinary.com';

const PRESET_DEFAULTS: Record<CloudinaryPreset, ThumbOpts> = {
  hero: { w: 1920, h: 1080, fit: 'cover', q: 'auto:best', f: 'auto', g: 'auto' },
  hero_mobile: { w: 1080, h: 2160, fit: 'cover', q: 'auto:best', f: 'auto', g: 'auto' },
  card: { w: 960, h: 640, fit: 'cover', q: 'auto:good', f: 'auto', g: 'auto' },
  content: { w: 1280, h: 960, fit: 'contain', q: 'auto:good', f: 'auto' },
  social: { w: 1200, h: 630, fit: 'cover', q: 'auto:best', f: 'auto' },
  lqip: { w: 64, h: 64, fit: 'cover', q: 'auto:eco', f: 'auto', dpr: 1 },
  lightbox: { w: 2048, h: 2048, fit: 'contain', q: 'auto:best', f: 'auto' },
};

export function thumbUrl(source: string, opts: ThumbOpts = {}) {
  const { w = 400, h = 300, fit = 'cover', q = 'auto', f = 'auto', dpr, g } = opts;
  if (!source) return source;
  if (!source.startsWith('http')) return source;

  // Map our fit -> cloudinary crop
  const cropMap: Record<string, string> = { cover: 'fill', crop: 'crop', fill: 'fill', scale: 'scale', contain: 'fit' };
  const c = cropMap[fit] || 'fill';
  const dp = typeof dpr !== 'undefined' ? `,dpr_${dpr}` : '';
  const grav = typeof g !== 'undefined' ? `,g_${g}` : '';
  const t = `c_${c},w_${Math.round(w)},h_${Math.round(h)},q_${q},f_${f},fl_progressive:none${dp}${grav}`;

  try {
    const u = new URL(source);

    // Native Cloudinary upload URL
    const parts = u.pathname.split('/upload/');
    if (parts.length === 2) {
      // Check if the URL already has transformation-like characters in the path
      // But be careful not to skip URLs just because they have folders
      if (parts[1].includes('c_') && (parts[1].includes('w_') || parts[1].includes('h_'))) {
        return source;
      }

      const resourcePath = parts[1].replace(/^\//, '');
      const newPath = `${parts[0]}/upload/${t}/${resourcePath}`;
      return `${u.protocol}//${u.host}${newPath}`;
    }

    // External URL fallback: route through Cloudinary fetch delivery if cloud name is available
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (cloudName) {
      const fetchPath = `/image/fetch/${t}/${encodeURIComponent(source)}`;
      return `${u.protocol}//${CLOUDINARY_HOST}/${cloudName}${fetchPath}`;
    }

    return source;
  } catch {
    return source;
  }
}

export function cloudinaryPresetUrl(source: string, preset: CloudinaryPreset, overrides: ThumbOpts = {}) {
  return thumbUrl(source, { ...PRESET_DEFAULTS[preset], ...overrides });
}

export default thumbUrl;
