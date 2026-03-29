import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { isAdminRequest } from '../../../lib/auth';
import getDatabase, { ensureGalleryIndexes } from '../../../lib/mongodb';
import { getCache, setCache } from '../../../lib/simpleCache';
import { invalidateGalleryContent } from '../../../lib/contentInvalidation';
import { applyCacheControl, CACHE_CONTROL } from '../../../lib/httpCache';

// Gallery document type
export type GalleryDoc = {
  _id?: ObjectId;
  name: string;
  description?: string;
  images: { url: string; public_id: string }[];
  category: string; // 'portrait' | 'landscape' | 'architecture' | 'street' | 'nature' etc.
  tags: string[];
  featured: boolean;
  visibility: 'public' | 'private'; // control what's shown on public gallery
  uploadDate: Date;
  photographer?: string; // credit field
  location?: string; // where photo was taken
  equipment?: string; // camera/lens info
  metadata?: { // exif-like data
    aperture?: string;
    shutter?: string;
    iso?: number;
    focal_length?: string;
  };
};

type GalleryImageRef = { url: string; public_id: string };

function sanitizeGalleryImage(input: unknown): GalleryImageRef | null {
  if (!input || typeof input !== 'object') return null;
  const src = input as Record<string, unknown>;
  const url = typeof src.url === 'string' ? src.url.trim() : '';
  const publicId = typeof src.public_id === 'string' ? src.public_id.trim() : '';
  if (!url || !publicId) return null;
  return { url, public_id: publicId };
}

function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((tag) => String(tag || '').trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 30);
}

function parseIso(input: unknown): number | undefined {
  if (input === undefined || input === null || input === '') return undefined;
  const parsed = Number.parseInt(String(input), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

// Ensure indexes only once per server lifecycle (not per request)
let indexesEnsured: Promise<void> | null = null;
function ensureIndexesOnce() {
  if (!indexesEnsured) {
    indexesEnsured = ensureGalleryIndexes().catch(() => { indexesEnsured = null; });
  }
  return indexesEnsured;
}

// GET: List gallery items with filtering
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    // Non-blocking index check (only runs once)
    ensureIndexesOnce();
    const db = await getDatabase();
    const coll = db.collection<GalleryDoc>('gallery');
    
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const skip = Math.max(parseInt(url.searchParams.get('skip') || '0'), 0);
    const category = url.searchParams.get('category');
    const featured = url.searchParams.get('featured');
    // Require admin auth to view private/all items
    const isAdmin = isAdminRequest(req);
    const requestedVisibility = url.searchParams.get('visibility') || 'public';
    const visibility = (!isAdmin && (requestedVisibility === 'all' || requestedVisibility === 'private'))
      ? 'public'
      : requestedVisibility;
    const search = url.searchParams.get('q');
    
    // Build filter
    const filter: any = {};
    if (category) filter.category = category;
    if (featured === 'true') filter.featured = true;
    
    if (visibility === 'all') {
      // Admin view: don't filter by visibility
    } else if (visibility.includes(',')) {
      // For multi-value, strip 'private' if not admin
      const vals = visibility.split(',').filter(v => isAdmin || v !== 'private');
      if (vals.length) filter.visibility = { $in: vals };
      else filter.visibility = 'public';
    } else {
      filter.visibility = visibility;
    }
    
    // Text search across name, description, tags
    if (search && search.length > 1) {
      filter.$text = { $search: search };
    }
    
    const listCacheEligible = visibility === 'public' && !search;
    const listCacheKey = `gallery:list:${JSON.stringify({ category: category || null, featured: featured || null, visibility, skip, limit })}`;
    if (listCacheEligible) {
      const cached = getCache<{ success: boolean; items: GalleryDoc[]; total: number; pagination: { total: number; skip: number; limit: number; hasMore: boolean } }>(listCacheKey);
      if (cached) {
        const response = NextResponse.json(cached);
        applyCacheControl(response, CACHE_CONTROL.PUBLIC_FEED, true);
        return response;
      }
    }

    // Execute query with pagination
    const cursor = coll.find(filter)
      .sort({ uploadDate: -1 })
      .skip(skip)
      .limit(limit);

    const items = await cursor.toArray();
    const countCacheEligible = !search;
    const countCacheKey = `gallery:count:${JSON.stringify({ category: category || null, featured: featured || null, visibility })}`;
    let total: number;
    if (countCacheEligible) {
      const cachedTotal = getCache<number>(countCacheKey);
      if (typeof cachedTotal === 'number') {
        total = cachedTotal;
      } else {
        total = await coll.countDocuments(filter);
        setCache(countCacheKey, total, 120);
      }
    } else {
      total = await coll.countDocuments(filter);
    }
    
    const payload = {
      success: true,
      items,
      total,
      pagination: {
        total,
        skip,
        limit,
        hasMore: skip + limit < total
      }
    };

    const response = NextResponse.json(payload);

    if (listCacheEligible) {
      setCache(listCacheKey, payload, 120);
    }

    // Cache public requests for 120 seconds
    if (visibility === 'public') {
      applyCacheControl(response, CACHE_CONTROL.PUBLIC_FEED, true);
    }

    return response;
  } catch (error) {
    console.error('Gallery GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch gallery' }, { status: 500 });
  }
}

// POST: Create new gallery entry (Admin only)
export async function POST(req: NextRequest) {
  try {
    if (!isAdminRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ ok: false, error: 'Content-Type must be application/json' }, { status: 400 });
    }
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
    }
    const payload = body as any;
    
    // Validate required fields
    if (!payload.name?.trim()) {
      return NextResponse.json({ ok: false, error: 'Name is required' }, { status: 400 });
    }
    const images = Array.isArray(payload.images)
      ? payload.images.map((img: unknown) => sanitizeGalleryImage(img)).filter(Boolean) as GalleryImageRef[]
      : [];

    if (images.length === 0) {
      return NextResponse.json({ ok: false, error: 'At least one image is required' }, { status: 400 });
    }
    if (images.length > 18) {
      return NextResponse.json({ ok: false, error: 'Maximum 18 images allowed per gallery item' }, { status: 400 });
    }
    if (!payload.category?.trim()) {
      return NextResponse.json({ ok: false, error: 'Category is required' }, { status: 400 });
    }
    
    const db = await getDatabase();
    const coll = db.collection<GalleryDoc>('gallery');
    
    const galleryDoc: Omit<GalleryDoc, '_id'> = {
      name: payload.name.trim(),
      description: payload.description?.trim() || '',
      images,
      category: payload.category.trim(),
      tags: normalizeTags(payload.tags),
      featured: Boolean(payload.featured),
      visibility: payload.visibility === 'private' ? 'private' : 'public',
      uploadDate: new Date(),
      photographer: payload.photographer?.trim() || '',
      location: payload.location?.trim() || '',
      equipment: payload.equipment?.trim() || '',
      metadata: {
        aperture: payload.metadata?.aperture?.trim() || undefined,
        shutter: payload.metadata?.shutter?.trim() || undefined,
        iso: parseIso(payload.metadata?.iso),
        focal_length: payload.metadata?.focal_length?.trim() || undefined,
      }
    };
    
    const result = await coll.insertOne(galleryDoc);

    invalidateGalleryContent();
    
    return NextResponse.json({
      ok: true,
      success: true,
      id: result.insertedId.toString(),
      message: 'Gallery entry created successfully'
    });
    
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json({ ok: false, error: 'A gallery item with this name and category already exists' }, { status: 409 });
    }
    console.error('Gallery POST error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to create gallery entry' }, { status: 500 });
  }
}