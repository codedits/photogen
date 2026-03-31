import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import cloudinary from '../../../../lib/cloudinary';
import { isAdminRequest } from '../../../../lib/auth';
import getDatabase from '../../../../lib/mongodb';
import { invalidateWallpaperContent } from '../../../../lib/contentInvalidation';
import type { WallpaperDoc } from '../route';

function isValidObjectId(id: string) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

type WallpaperImageRef = { url: string; public_id: string };

function sanitizeWallpaperImage(input: unknown): WallpaperImageRef | null {
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


// GET: Get single wallpaper by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams?.id;
    
    if (!id || !isValidObjectId(id)) {
      return NextResponse.json({ ok: false, error: 'Invalid ID' }, { status: 400 });
    }
    
    const db = await getDatabase();
    const coll = db.collection<WallpaperDoc>('wallpapers');
    const item = await coll.findOne({ _id: new ObjectId(id) });
    
    if (!item) {
      return NextResponse.json({ ok: false, error: 'Wallpaper not found' }, { status: 404 });
    }
    
    return NextResponse.json({ ok: true, success: true, item });
    
  } catch (error) {
    console.error('Wallpaper GET by ID error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch wallpaper' }, { status: 500 });
  }
}

// PUT: Update wallpaper (Admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdminRequest(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const resolvedParams = await params;
    const id = resolvedParams?.id;
    
    if (!id || !isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 400 });
    }
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const payload = body as any;
    const db = await getDatabase();
    const coll = db.collection<WallpaperDoc>('wallpapers');
    const existing = await coll.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return NextResponse.json({ error: 'Wallpaper not found' }, { status: 404 });
    }
    
    const updateDoc: any = {};
    
    if (payload.name !== undefined) {
      const nextName = typeof payload.name === 'string' ? payload.name.trim() : '';
      if (!nextName) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      }
      updateDoc.name = nextName;
    }
    if (payload.description !== undefined) updateDoc.description = payload.description?.trim() || '';
    if (Array.isArray(payload.images)) {
      const nextImages = payload.images
        .map((img: unknown) => sanitizeWallpaperImage(img))
        .filter(Boolean) as WallpaperImageRef[];

      if (nextImages.length === 0) {
        return NextResponse.json({ error: 'At least one image is required' }, { status: 400 });
      }
      if (nextImages.length > 5) {
        return NextResponse.json({ error: 'Maximum 5 images allowed per wallpaper item' }, { status: 400 });
      }

      updateDoc.images = nextImages;
    }
    if (payload.category?.trim()) updateDoc.category = payload.category.trim();
    if (payload.tags !== undefined) updateDoc.tags = normalizeTags(payload.tags);
    if (payload.featured !== undefined) updateDoc.featured = Boolean(payload.featured);
    if (payload.visibility) updateDoc.visibility = payload.visibility === 'private' ? 'private' : 'public';
    if (payload.photographer !== undefined) updateDoc.photographer = payload.photographer?.trim() || '';
    
    const result = await coll.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Wallpaper not found' }, { status: 404 });
    }
    
    const existingImageIds = new Set((existing.images || []).map((img: { public_id: string }) => img.public_id).filter(Boolean));
    const currentImages = Array.isArray(updateDoc.images) ? updateDoc.images : (existing.images || []);
    const currentImageIds = new Set(currentImages.map((img: { public_id: string }) => img.public_id).filter(Boolean));
    const requestedRemovals: string[] = Array.isArray(payload.removePublicIds)
      ? payload.removePublicIds.filter((pid: unknown): pid is string => typeof pid === 'string' && pid.trim().length > 0)
      : [];
    const removablePublicIds = requestedRemovals.filter((pid) => existingImageIds.has(pid) && !currentImageIds.has(pid));

    if (removablePublicIds.length > 0) {
      const deletePromises = removablePublicIds.map((pid: string) =>
        cloudinary.uploader.destroy(pid, { invalidate: true }).catch((e: unknown) => {
          console.error(`Failed to delete Cloudinary image ${pid}:`, e);
          return null;
        })
      );
      await Promise.allSettled(deletePromises);
    }

    invalidateWallpaperContent({ detailPath: `/wallpapers/${id}` });
    
    return NextResponse.json({
      ok: true,
      success: true,
      message: 'Wallpaper updated successfully'
    });
    
  } catch (error) {
    console.error('Wallpaper PUT error:', error);
    return NextResponse.json({ error: 'Failed to update wallpaper' }, { status: 500 });
  }
}

// DELETE: Remove wallpaper (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdminRequest(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const resolvedParams = await params;
    const id = resolvedParams?.id;
    
    if (!id || !isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }
    
    const db = await getDatabase();
    const coll = db.collection<WallpaperDoc>('wallpapers');
    
    const item = await coll.findOne({ _id: new ObjectId(id) });
    
    if (!item) {
      return NextResponse.json({ error: 'Wallpaper not found' }, { status: 404 });
    }
    
    const result = await coll.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Wallpaper not found' }, { status: 404 });
    }

    invalidateWallpaperContent({ detailPath: `/wallpapers/${id}` });
    
    if (item.images && item.images.length > 0) {
      const publicIds = item.images
        .map(img => img.public_id)
        .filter(Boolean);
        
      if (publicIds.length > 0) {
        const imgDeletes = publicIds.map((publicId) =>
          cloudinary.uploader.destroy(publicId, { invalidate: true }).catch((e: unknown) => {
            console.error(`Failed to delete Cloudinary image ${publicId}:`, e);
            return null;
          })
        );
        await Promise.allSettled(imgDeletes);
      }
    }
    
    return NextResponse.json({
      ok: true,
      success: true,
      message: 'Wallpaper deleted successfully'
    });
    
  } catch (error) {
    console.error('Wallpaper DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete wallpaper' }, { status: 500 });
  }
}
