import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import getDatabase, { ensureGalleryIndexes } from '../../../lib/mongodb';

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

// GET: List gallery items with filtering
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    console.log('GET /api/gallery', url.search);
    
    await ensureGalleryIndexes();
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
    
    // Execute query with pagination
    const cursor = coll.find(filter)
      .sort({ uploadDate: -1 })
      .skip(skip)
      .limit(limit);
      
    const items = await cursor.toArray();
    const total = await coll.countDocuments(filter);
    
    const response = NextResponse.json({ 
      success: true, 
      items,
      pagination: {
        total,
        skip,
        limit,
        hasMore: skip + limit < total
      }
    });

    // Cache public requests for 60 seconds
    if (visibility === 'public') {
      response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
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
    // Check admin session (reuse existing auth pattern)
    const sessionRes = await fetch(new URL('/api/admin/session', req.url), {
      headers: { cookie: req.headers.get('cookie') || '' }
    });
    const session = await sessionRes.json();
    
    if (!session.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    
    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!body.images?.length) {
      return NextResponse.json({ error: 'At least one image is required' }, { status: 400 });
    }
    if (!body.category?.trim()) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
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
    
    return NextResponse.json({
      success: true,
      id: result.insertedId,
      message: 'Gallery entry created successfully'
    });
    
  } catch (error) {
    console.error('Gallery POST error:', error);
    return NextResponse.json({ error: 'Failed to create gallery entry' }, { status: 500 });
  }
}