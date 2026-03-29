import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isAdminRequest } from '../../../lib/auth';
import getDatabase, { ensureBlogIndexes } from '../../../lib/mongodb';
import { delCachePrefix, getCache, setCache } from '../../../lib/simpleCache';
import { invalidateCachePrefix } from '../../../lib/multiLayerCache';

type BlogStatus = 'draft' | 'published';
type BlogLayout = 'standard' | 'magazine' | 'minimal';

type BlogImageRef = {
  url: string;
  public_id: string;
};

export type BlogDoc = {
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  contentText: string;
  tags: string[];
  status: BlogStatus;
  layout: BlogLayout;
  readingTime: number;
  publishedAt: Date | null;
  coverImage?: BlogImageRef | null;
  inlineImages: BlogImageRef[];
  seoTitle?: string;
  seoDescription?: string;
  createdAt: Date;
  updatedAt: Date;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
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

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => String(t || '').trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
}

function sanitizeImage(value: unknown): BlogImageRef | null {
  if (!value || typeof value !== 'object') return null;
  const src = value as Record<string, unknown>;
  const url = typeof src.url === 'string' ? src.url.trim() : '';
  const publicId = typeof src.public_id === 'string' ? src.public_id.trim() : '';
  if (!url || !publicId) return null;
  return { url, public_id: publicId };
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const tag = (searchParams.get('tag') || '').trim().toLowerCase();
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10) || 10, 1), 30);
    const skip = (page - 1) * limit;
    const status = (searchParams.get('status') || 'published').trim().toLowerCase();
    const admin = isAdminRequest(req);

    ensureBlogIndexes();
    const db = await getDatabase();
    const coll = db.collection<BlogDoc>('blog');

    const filter: Record<string, any> = {};
    if (admin && (status === 'draft' || status === 'published')) {
      filter.status = status;
    } else if (admin && status === 'all') {
      // no filter
    } else {
      filter.status = 'published';
      filter.publishedAt = { $ne: null };
    }

    if (tag) {
      filter.tags = tag;
    }

    const hasSearch = q.length > 1;
    if (hasSearch) {
      filter.$text = { $search: q };
    }

    const canCache = !admin && !hasSearch && !tag && page === 1 && status === 'published';
    const cacheKey = `blog:list:${JSON.stringify({ page, limit })}`;
    if (canCache) {
      const cached = getCache<any>(cacheKey);
      if (cached) {
        const response = NextResponse.json(cached);
        response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
        response.headers.set('Vary', 'Accept-Encoding');
        return response;
      }
    }

    const projection: Record<string, 0 | 1 | { $meta: string }> = {
      title: 1,
      slug: 1,
      excerpt: 1,
      contentText: 1,
      tags: 1,
      status: 1,
      layout: 1,
      readingTime: 1,
      publishedAt: 1,
      coverImage: 1,
      inlineImages: 1,
      seoTitle: 1,
      seoDescription: 1,
      createdAt: 1,
      updatedAt: 1,
    };

    const docs = await coll
      .find(filter, { projection })
      .sort(hasSearch ? ({ score: { $meta: 'textScore' } } as any) : { publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit + 1)
      .toArray();

    const hasMore = docs.length > limit;
    const sliced = hasMore ? docs.slice(0, limit) : docs;

    const payload = {
      ok: true,
      posts: sliced.map((doc) => serialize(doc)),
      page,
      limit,
      hasMore,
    };

    if (canCache) {
      setCache(cacheKey, payload, 120);
    }

    const response = NextResponse.json(payload);
    if (canCache) {
      response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
      response.headers.set('Vary', 'Accept-Encoding');
    }
    return response;
  } catch (error) {
    console.error('Blog GET error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch blog posts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isAdminRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const title = String(body?.title || '').trim();
    const contentHtml = String(body?.contentHtml || '').trim();
    const slugInput = String(body?.slug || '').trim();

    if (!title) return NextResponse.json({ ok: false, error: 'Title is required' }, { status: 400 });
    if (!contentHtml) return NextResponse.json({ ok: false, error: 'Content is required' }, { status: 400 });

    const slug = slugify(slugInput || title);
    if (!slug) return NextResponse.json({ ok: false, error: 'Invalid slug' }, { status: 400 });

    const contentText = stripHtml(contentHtml);
    const readingTime = computeReadingTime(contentText);
    const excerptRaw = String(body?.excerpt || '').trim();
    const excerpt = excerptRaw || `${contentText.slice(0, 180)}${contentText.length > 180 ? '...' : ''}`;
    const status: BlogStatus = body?.status === 'published' ? 'published' : 'draft';
    const layoutRaw = typeof body?.layout === 'string' ? body.layout : '';
    const layout: BlogLayout = ['standard', 'magazine', 'minimal'].includes(layoutRaw) ? (layoutRaw as BlogLayout) : 'standard';

    const inlineImages = Array.isArray(body?.inlineImages)
      ? body.inlineImages.map((img: unknown) => sanitizeImage(img)).filter(Boolean)
      : [];

    const coverImage = sanitizeImage(body?.coverImage);

    const db = await getDatabase();
    await ensureBlogIndexes(db.databaseName);
    const coll = db.collection<BlogDoc>('blog');

    const now = new Date();
    const doc: BlogDoc = {
      title,
      slug,
      excerpt,
      contentHtml,
      contentText,
      tags: normalizeTags(body?.tags),
      status,
      layout,
      readingTime,
      publishedAt: status === 'published' ? now : null,
      coverImage,
      inlineImages: inlineImages as BlogImageRef[],
      seoTitle: String(body?.seoTitle || '').trim(),
      seoDescription: String(body?.seoDescription || '').trim(),
      createdAt: now,
      updatedAt: now,
    };

    const result = await coll.insertOne(doc);

    delCachePrefix('blog:list:');
    invalidateCachePrefix('home:');
    revalidatePath('/blog');
    if (doc.status === 'published') {
      revalidatePath(`/blog/${doc.slug}`);
    }

    return NextResponse.json({
      ok: true,
      id: result.insertedId.toString(),
      slug: doc.slug,
      message: 'Blog post created',
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json({ ok: false, error: 'Slug already exists' }, { status: 409 });
    }
    console.error('Blog POST error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to create blog post' }, { status: 500 });
  }
}
