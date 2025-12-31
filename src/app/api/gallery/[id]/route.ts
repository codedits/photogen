import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import cloudinary from '../../../../lib/cloudinary';
import getDatabase from '../../../../lib/mongodb';
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
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }
    
    const db = await getDatabase();
    const coll = db.collection<GalleryDoc>('gallery');
    
    const item = await coll.findOne({ _id: new ObjectId(id) });
    
    if (!item) {
      return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, item });
    
  } catch (error) {
    console.error('Gallery GET by ID error:', error);
    return NextResponse.json({ error: 'Failed to fetch gallery item' }, { status: 500 });
  }
}

// PUT: Update gallery item (Admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin session
    const sessionRes = await fetch(new URL('/api/admin/session', req.url), {
      headers: { cookie: req.headers.get('cookie') || '' }
    });
    const session = await sessionRes.json();
    
    if (!session.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const resolvedParams = await params;
    const id = resolvedParams?.id;
    
    if (!id || !isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }
    
    const body = await req.json();
    const db = await getDatabase();
    const coll = db.collection<GalleryDoc>('gallery');
    
    // Build update object (only update provided fields)
    const updateDoc: any = {};
    
    if (body.name?.trim()) updateDoc.name = body.name.trim();
    if (body.description !== undefined) updateDoc.description = body.description?.trim() || '';
    if (body.images?.length) {
      updateDoc.images = body.images.map((img: any) => ({
        url: img.url,
        public_id: img.public_id
      }));
    }
    if (body.category?.trim()) updateDoc.category = body.category.trim();
    if (Array.isArray(body.tags)) updateDoc.tags = body.tags.filter(Boolean);
    if (body.featured !== undefined) updateDoc.featured = Boolean(body.featured);
    if (body.visibility) updateDoc.visibility = body.visibility === 'private' ? 'private' : 'public';
    if (body.photographer !== undefined) updateDoc.photographer = body.photographer?.trim() || '';
    if (body.location !== undefined) updateDoc.location = body.location?.trim() || '';
    if (body.equipment !== undefined) updateDoc.equipment = body.equipment?.trim() || '';
    
    if (body.metadata) {
      updateDoc.metadata = {
        aperture: body.metadata?.aperture?.trim() || undefined,
        shutter: body.metadata?.shutter?.trim() || undefined,
        iso: body.metadata?.iso ? parseInt(body.metadata.iso) : undefined,
        focal_length: body.metadata?.focal_length?.trim() || undefined,
      };
    }
    
    const result = await coll.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateDoc }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 });
    }
    
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
    // Check admin session
    const sessionRes = await fetch(new URL('/api/admin/session', req.url), {
      headers: { cookie: req.headers.get('cookie') || '' }
    });
    const session = await sessionRes.json();
    
    if (!session.ok) {
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
    
    // Then try to delete images from Cloudinary (non-blocking)
    if (galleryItem.images && galleryItem.images.length > 0) {
      const publicIds = galleryItem.images
        .map(img => img.public_id)
        .filter(Boolean); // Remove any undefined/null public_ids
        
      if (publicIds.length > 0) {
        // Delete from Cloudinary in the background (don't wait for it)
        setTimeout(async () => {
          try {
            for (const publicId of publicIds) {
              await cloudinary.uploader.destroy(publicId);
              console.log(`Deleted image from Cloudinary: ${publicId}`);
            }
          } catch (cloudinaryError) {
            // Log the error but don't fail the API response since DB deletion succeeded
            console.error('Failed to delete some images from Cloudinary:', cloudinaryError);
          }
        }, 0);
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