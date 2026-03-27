import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { revalidatePath } from 'next/cache';
import cloudinary from '../../../../lib/cloudinary';
import { isAdminRequest } from '../../../../lib/auth';
import getDatabase from '../../../../lib/mongodb';
import { delCachePrefix } from '../../../../lib/simpleCache';
import { invalidateCachePrefix } from '../../../../lib/multiLayerCache';
import type { BlogDoc } from '../route';

type BlogImageRef = { url: string; public_id: string };

function isValidObjectId(id: string) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

function sanitizeImage(value: unknown): BlogImageRef | null {
  if (!value || typeof value !== 'object') return null;
  const src = value as Record<string, unknown>;
  const url = typeof src.url === 'string' ? src.url.trim() : '';
  const publicId = typeof src.public_id === 'string' ? src.public_id.trim() : '';
  if (!url || !publicId) return null;
  return { url, public_id: publicId };
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => String(t || '').trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
}

function stripHtml(input: string) {
  return input
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeReadingTime(text: string): number {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function serialize(doc: any) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    slug: doc.slug,
    excerpt: doc.excerpt,
    contentHtml: doc.contentHtml,
    contentText: doc.contentText,
    tags: doc.tags || [],
    status: doc.status,
    layout: doc.layout || 'standard',
    readingTime: doc.readingTime || 1,
    publishedAt: doc.publishedAt,
    coverImage: doc.coverImage || null,
    inlineImages: doc.inlineImages || [],
    seoTitle: doc.seoTitle || '',
    seoDescription: doc.seoDescription || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function cloudinaryCleanup(publicIds: string[]) {
  if (!publicIds.length) return;
  Promise.resolve().then(async () => {
    for (const pid of publicIds) {
      try {
        await cloudinary.uploader.destroy(pid, { invalidate: true });
      } catch (e) {
        console.error(`Blog image cleanup failed for ${pid}:`, e);
      }
    }
  }).catch((e) => console.error('Blog image cleanup failed:', e));
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !isValidObjectId(id)) {
      return NextResponse.json({ ok: false, error: 'Invalid ID' }, { status: 400 });
    }

    const db = await getDatabase();
    const coll = db.collection<BlogDoc>('blog');
    const post = await coll.findOne({ _id: new ObjectId(id) });

    if (!post) {
      return NextResponse.json({ ok: false, error: 'Post not found' }, { status: 404 });
    }

    if (post.status !== 'published' && !isAdminRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, post: serialize(post) });
  } catch (error) {
    console.error('Blog GET by ID error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch blog post' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdminRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id || !isValidObjectId(id)) {
      return NextResponse.json({ ok: false, error: 'Invalid ID' }, { status: 400 });
    }

    const body = await req.json();
    const db = await getDatabase();
    const coll = db.collection<BlogDoc>('blog');

    const existing = await coll.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Post not found' }, { status: 404 });
    }

    const updateDoc: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (body?.title !== undefined) {
      const title = String(body.title || '').trim();
      if (!title) {
        return NextResponse.json({ ok: false, error: 'Title is required' }, { status: 400 });
      }
      updateDoc.title = title;
    }

    if (body?.slug !== undefined) {
      const slug = slugify(String(body.slug || ''));
      if (!slug) return NextResponse.json({ ok: false, error: 'Invalid slug' }, { status: 400 });
      updateDoc.slug = slug;
    }

    if (body?.contentHtml !== undefined) {
      const contentHtml = String(body.contentHtml || '').trim();
      if (!contentHtml) {
        return NextResponse.json({ ok: false, error: 'Content is required' }, { status: 400 });
      }
      updateDoc.contentHtml = contentHtml;
      updateDoc.contentText = stripHtml(contentHtml);
      updateDoc.readingTime = computeReadingTime(updateDoc.contentText);
    }

    if (body?.excerpt !== undefined) {
      updateDoc.excerpt = String(body.excerpt || '').trim();
    }

    if (body?.tags !== undefined) {
      updateDoc.tags = normalizeTags(body.tags);
    }

    if (body?.status !== undefined) {
      const nextStatus = body.status === 'published' ? 'published' : 'draft';
      updateDoc.status = nextStatus;
      if (nextStatus === 'published' && !existing.publishedAt) {
        updateDoc.publishedAt = new Date();
      }
      if (nextStatus === 'draft') {
        updateDoc.publishedAt = null;
      }
    }

    if (body?.seoTitle !== undefined) {
      updateDoc.seoTitle = String(body.seoTitle || '').trim();
    }

    if (body?.seoDescription !== undefined) {
      updateDoc.seoDescription = String(body.seoDescription || '').trim();
    }

    if (body?.layout !== undefined) {
      const validLayouts = ['standard', 'magazine', 'minimal'];
      updateDoc.layout = validLayouts.includes(body.layout) ? body.layout : 'standard';
    }

    if (body?.coverImage !== undefined) {
      updateDoc.coverImage = sanitizeImage(body.coverImage);
    }

    if (body?.inlineImages !== undefined) {
      updateDoc.inlineImages = Array.isArray(body.inlineImages)
        ? body.inlineImages.map((img: unknown) => sanitizeImage(img)).filter(Boolean)
        : [];
    }

    // Auto-generate excerpt if missing but content changed.
    if ((updateDoc.excerpt === undefined || !updateDoc.excerpt) && typeof updateDoc.contentText === 'string') {
      updateDoc.excerpt = `${updateDoc.contentText.slice(0, 180)}${updateDoc.contentText.length > 180 ? '...' : ''}`;
    }

    await coll.updateOne({ _id: new ObjectId(id) }, { $set: updateDoc });

    const nextInline = Array.isArray(updateDoc.inlineImages) ? updateDoc.inlineImages : (existing.inlineImages || []);
    const oldInlineIds = new Set((existing.inlineImages || []).map((img) => img.public_id).filter(Boolean));
    const newInlineIds = new Set((nextInline || []).map((img: BlogImageRef) => img.public_id).filter(Boolean));

    const oldCoverId = existing.coverImage?.public_id;
    const newCoverId = (updateDoc.coverImage ?? existing.coverImage)?.public_id;

    const removedIds: string[] = [];
    oldInlineIds.forEach((pid) => {
      if (!newInlineIds.has(pid)) removedIds.push(pid);
    });

    if (oldCoverId && oldCoverId !== newCoverId) {
      removedIds.push(oldCoverId);
    }

    cloudinaryCleanup(Array.from(new Set(removedIds)));

    delCachePrefix('blog:list:');
    invalidateCachePrefix('home:');
    revalidatePath('/blog');
    revalidatePath(`/blog/${existing.slug}`);
    if (updateDoc.slug && updateDoc.slug !== existing.slug) {
      revalidatePath(`/blog/${updateDoc.slug}`);
    }

    return NextResponse.json({ ok: true, message: 'Blog post updated' });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json({ ok: false, error: 'Slug already exists' }, { status: 409 });
    }
    console.error('Blog PATCH error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to update blog post' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isAdminRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id || !isValidObjectId(id)) {
      return NextResponse.json({ ok: false, error: 'Invalid ID' }, { status: 400 });
    }

    const db = await getDatabase();
    const coll = db.collection<BlogDoc>('blog');
    const existing = await coll.findOne({ _id: new ObjectId(id) });

    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Post not found' }, { status: 404 });
    }

    await coll.deleteOne({ _id: new ObjectId(id) });

    const imageIds = [
      ...(existing.inlineImages || []).map((img) => img.public_id),
      existing.coverImage?.public_id || '',
    ].filter(Boolean);
    cloudinaryCleanup(Array.from(new Set(imageIds)));

    delCachePrefix('blog:list:');
    invalidateCachePrefix('home:');
    revalidatePath('/blog');
    revalidatePath(`/blog/${existing.slug}`);

    return NextResponse.json({ ok: true, message: 'Blog post deleted' });
  } catch (error) {
    console.error('Blog DELETE error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to delete blog post' }, { status: 500 });
  }
}
