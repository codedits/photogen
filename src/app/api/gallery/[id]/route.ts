import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import cloudinary from '../../../../lib/cloudinary';
import { revalidatePath } from 'next/cache';
import { isAdminRequest } from '../../../../lib/auth';
import getDatabase from '../../../../lib/mongodb';
import { delCachePrefix } from '../../../../lib/simpleCache';
import { invalidateCachePrefix } from '../../../../lib/multiLayerCache';
import type { GalleryDoc } from '../route';

// Helper: Check if string is valid MongoDB ID
function isValidObjectId(id: string) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// GET: Get single gallery item by ID
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
    const coll = db.collection<GalleryDoc>('gallery');
    
    const item = await coll.findOne({ _id: new ObjectId(id) });
    
    if (!item) {
      return NextResponse.json({ ok: false, error: 'Gallery item not found' }, { status: 404 });
    }
    
    return NextResponse.json({ ok: true, success: true, item });
    
  } catch (error) {
    console.error('Gallery GET by ID error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch gallery item' }, { status: 500 });
  }
}

// PUT: Update gallery item (Admin only)
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
    const coll = db.collection<GalleryDoc>('gallery');
    
    // Build update object (only update provided fields)
    const updateDoc: any = {};
    
    if (payload.name?.trim()) updateDoc.name = payload.name.trim();
    if (payload.description !== undefined) updateDoc.description = payload.description?.trim() || '';
    if (payload.images?.length) {
      updateDoc.images = payload.images.map((img: any) => ({
        url: img.url,
        public_id: img.public_id
      }));
    }
    if (payload.category?.trim()) updateDoc.category = payload.category.trim();
    if (Array.isArray(payload.tags)) updateDoc.tags = payload.tags.filter(Boolean);
    if (payload.featured !== undefined) updateDoc.featured = Boolean(payload.featured);
    if (payload.visibility) updateDoc.visibility = payload.visibility === 'private' ? 'private' : 'public';
    if (payload.photographer !== undefined) updateDoc.photographer = payload.photographer?.trim() || '';
    if (payload.location !== undefined) updateDoc.location = payload.location?.trim() || '';
    if (payload.equipment !== undefined) updateDoc.equipment = payload.equipment?.trim() || '';
    
    if (payload.metadata) {
      updateDoc.metadata = {
        aperture: payload.metadata?.aperture?.trim() || undefined,
        shutter: payload.metadata?.shutter?.trim() || undefined,
        iso: payload.metadata?.iso ? parseInt(payload.metadata.iso) : undefined,
        focal_length: payload.metadata?.focal_length?.trim() || undefined,
      };
    }
    
    const result = await coll.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc }
    );
    
    // Process removals from Cloudinary (awaited to prevent serverless cutoff)
    if (Array.isArray(payload.removePublicIds) && payload.removePublicIds.length > 0) {
      const deletePromises = payload.removePublicIds.map((pid: string) =>
        cloudinary.uploader.destroy(pid, { invalidate: true }).catch((e: unknown) => {
          console.error(`Failed to delete Cloudinary image ${pid}:`, e);
          return null;
        })
      );
      await Promise.allSettled(deletePromises);
    }
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 });
    }

    delCachePrefix('gallery:list:');
    delCachePrefix('gallery:count:');
    invalidateCachePrefix('home:');
    revalidatePath('/gallery');
    revalidatePath(`/gallery/${id}`);
    
    return NextResponse.json({
      success: true,
      message: 'Gallery item updated successfully'
    });
    
  } catch (error) {
    console.error('Gallery PUT error:', error);
    return NextResponse.json({ error: 'Failed to update gallery item' }, { status: 500 });
  }
}

// DELETE: Remove gallery item (Admin only)
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
    const coll = db.collection<GalleryDoc>('gallery');
    
    // First, get the gallery item to retrieve image public_ids for Cloudinary cleanup
    const galleryItem = await coll.findOne({ _id: new ObjectId(id) });
    
    if (!galleryItem) {
      return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 });
    }
    
    // Delete from database first
    const result = await coll.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 });
    }

    delCachePrefix('gallery:list:');
    delCachePrefix('gallery:count:');
    invalidateCachePrefix('home:');
    revalidatePath('/gallery');
    revalidatePath(`/gallery/${id}`);
    
    // Then try to delete images from Cloudinary (non-blocking)
    if (galleryItem.images && galleryItem.images.length > 0) {
      const publicIds = galleryItem.images
        .map(img => img.public_id)
        .filter(Boolean);
        
      if (publicIds.length > 0) {
        // Await Cloudinary cleanup to prevent serverless cutoff
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
      success: true,
      message: 'Gallery item deleted successfully'
    });
    
  } catch (error) {
    console.error('Gallery DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete gallery item' }, { status: 500 });
  }
}