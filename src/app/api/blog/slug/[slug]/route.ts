import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '../../../../../lib/auth';
import getDatabase from '../../../../../lib/mongodb';
import type { BlogDoc } from '../../route';

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
    publishedAt: doc.publishedAt,
    coverImage: doc.coverImage || null,
    inlineImages: doc.inlineImages || [],
    seoTitle: doc.seoTitle || '',
    seoDescription: doc.seoDescription || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const normalizedSlug = String(slug || '').trim().toLowerCase();
    if (!normalizedSlug) {
      return NextResponse.json({ ok: false, error: 'Invalid slug' }, { status: 400 });
    }

    const db = await getDatabase();
    const coll = db.collection<BlogDoc>('blog');
    const admin = isAdminRequest(req);

    const filter: Record<string, unknown> = { slug: normalizedSlug };
    if (!admin) {
      filter.status = 'published';
      filter.publishedAt = { $ne: null };
    }

    const post = await coll.findOne(filter as any);
    if (!post) {
      return NextResponse.json({ ok: false, error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, post: serialize(post) });
  } catch (error) {
    console.error('Blog slug GET error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch blog post' }, { status: 500 });
  }
}
