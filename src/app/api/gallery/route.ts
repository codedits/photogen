import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { isAdminRequest } from '../../../lib/auth';
import getDatabase, { ensureGalleryIndexes } from '../../../lib/mongodb';
import { delCachePrefix, getCache, setCache } from '../../../lib/simpleCache';
import { revalidatePath } from 'next/cache';

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
    const visibility = url.searchParams.get('visibility') || 'public';
    const search = url.searchParams.get('q');
    
    // Build filter
    const filter: any = {};
    if (category) filter.category = category;
    if (featured === 'true') filter.featured = true;
    
    if (visibility === 'all') {
      // Admin view: don't filter by visibility
    } else if (visibility.includes(',')) {
      filter.visibility = { $in: visibility.split(',') };
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
        response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
        response.headers.set('Vary', 'Accept-Encoding');
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
      response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
      response.headers.set('Vary', 'Accept-Encoding');
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
    
    const body = await req.json();
    
    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json({ ok: false, error: 'Name is required' }, { status: 400 });
    }
    if (!body.images?.length) {
      return NextResponse.json({ ok: false, error: 'At least one image is required' }, { status: 400 });
    }
    if (!body.category?.trim()) {
      return NextResponse.json({ ok: false, error: 'Category is required' }, { status: 400 });
    }
    
    const db = await getDatabase();
    const coll = db.collection<GalleryDoc>('gallery');
    
    const galleryDoc: Omit<GalleryDoc, '_id'> = {
      name: body.name.trim(),
      description: body.description?.trim() || '',
      images: body.images.map((img: any) => ({
        url: img.url,
        public_id: img.public_id
      })),
      category: body.category.trim(),
      tags: Array.isArray(body.tags) ? body.tags.filter(Boolean) : [],
      featured: Boolean(body.featured),
      visibility: body.visibility === 'private' ? 'private' : 'public',
      uploadDate: new Date(),
      photographer: body.photographer?.trim() || '',
      location: body.location?.trim() || '',
      equipment: body.equipment?.trim() || '',
      metadata: {
        aperture: body.metadata?.aperture?.trim() || undefined,
        shutter: body.metadata?.shutter?.trim() || undefined,
        iso: body.metadata?.iso ? parseInt(body.metadata.iso) : undefined,
        focal_length: body.metadata?.focal_length?.trim() || undefined,
      }
    };
    
    const result = await coll.insertOne(galleryDoc);

    delCachePrefix('gallery:list:');
    delCachePrefix('gallery:count:');
    revalidatePath('/gallery');
    
    return NextResponse.json({
      ok: true,
      success: true,
      id: result.insertedId,
      message: 'Gallery entry created successfully'
    });
    
  } catch (error) {
    console.error('Gallery POST error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to create gallery entry' }, { status: 500 });
  }
}