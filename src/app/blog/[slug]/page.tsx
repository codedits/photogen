import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import getDatabase from '../../../lib/mongodb';
import { cloudinaryPresetUrl } from '../../../lib/cloudinaryUrl';
import { wrapImagesInFiguresRegex } from '../../../lib/imageCardUtils';
import { sanitizeRichHtml } from '../../../lib/sanitizeHtml';
import type { BlogDoc } from '../../api/blog/route';
import BlogShareButtons from './BlogShareButtons';

export const revalidate = 300;

type Params = { slug: string };

async function getPublishedPost(slug: string) {
  const db = await getDatabase();
  const coll = db.collection<BlogDoc>('blog');
  return coll.findOne({ slug, status: 'published', publishedAt: { $ne: null } });
}

async function getRelatedPosts(tags: string[], excludeSlug: string, limit = 3) {
  const db = await getDatabase();
  const coll = db.collection<BlogDoc>('blog');

  const filter: Record<string, any> = {
    status: 'published',
    publishedAt: { $ne: null },
    slug: { $ne: excludeSlug },
  };

  if (tags.length > 0) {
    filter.tags = { $in: tags };
  }

  const posts = await coll
    .find(filter, { projection: { contentHtml: 0, contentText: 0 } as any })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .toArray();

  return posts.map((p: any) => ({
    id: p._id.toString(),
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    tags: p.tags || [],
    readingTime: p.readingTime || 1,
    publishedAt: p.publishedAt,
    coverImage: p.coverImage || null,
  }));
}

function formatDate(value: string | Date | null) {
  if (!value) return 'Draft';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Draft';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: 'Post not found' };

  const title = post.seoTitle?.trim() || post.title;
  const description = post.seoDescription?.trim() || post.excerpt;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: post.coverImage?.url ? [cloudinaryPresetUrl(post.coverImage.url, 'social')] : undefined,
    },
  };
}

export default async function BlogDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);

  if (!post) {
    notFound();
  }

  const layout = (post as any).layout || 'standard';
  const readingTime = (post as any).readingTime || Math.max(1, Math.ceil(
    post.contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').length / 220
  ));
  const relatedPosts = await getRelatedPosts(post.tags || [], slug);
  const safeContentHtml = sanitizeRichHtml(wrapImagesInFiguresRegex(post.contentHtml));

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Magazine Layout */}
      {layout === 'magazine' && post.coverImage?.url && (
        <div className="relative w-full min-h-[50vh] md:min-h-[65vh] lg:min-h-[75vh] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cloudinaryPresetUrl(post.coverImage.url, 'hero', { w: 1920, h: 1080 })}
            alt={post.title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
          <div className="absolute bottom-0 left-0 w-full">
            <div className="mx-auto max-w-4xl px-6 pb-12 md:pb-16">
              <div className="flex flex-wrap items-center gap-2 mb-5">
                {post.tags?.slice(0, 4).map((tag: string) => (
                  <Link
                    key={tag}
                    href={`/blog?tag=${encodeURIComponent(tag)}`}
                    className="rounded-full bg-white/15 backdrop-blur-md border border-white/10 px-3 py-1 text-[11px] text-white/90 capitalize hover:bg-white/25 transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-medium leading-[1.08] text-white mb-4">
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-zinc-300 text-sm">
                <time>{formatDate(post.publishedAt)}</time>
                <span className="text-zinc-500">·</span>
                <span>{readingTime} min read</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <article className="mx-auto max-w-5xl lg:max-w-6xl px-4 md:px-6 py-12 md:py-20">
        {/* Standard Layout Header */}
        {layout === 'standard' && (
          <>
            <div className="mb-8 max-w-4xl">
              <div className="flex flex-wrap items-center gap-2 mb-5">
                {post.tags?.slice(0, 4).map((tag: string) => (
                  <Link
                    key={tag}
                    href={`/blog?tag=${encodeURIComponent(tag)}`}
                    className="rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-wide text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
              <h1 className="text-3xl md:text-5xl font-light leading-tight tracking-tight">{post.title}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <time>{formatDate(post.publishedAt)}</time>
                <span>·</span>
                <span>{readingTime} min read</span>
              </div>
            </div>

            {post.coverImage?.url && (
              <div className="mb-10 overflow-hidden rounded-xl border border-border max-w-4xl">
                <div className="relative aspect-video w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cloudinaryPresetUrl(post.coverImage.url, 'content', { w: 1400, h: 900 })}
                    alt={post.title}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="eager"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Minimal Layout Header */}
        {layout === 'minimal' && (
          <div className="mb-12 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {post.tags?.slice(0, 4).map((tag: string) => (
                <Link
                  key={tag}
                  href={`/blog?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full border border-border px-3 py-1 text-[11px] uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-light leading-[1.05] tracking-tight">{post.title}</h1>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <time>{formatDate(post.publishedAt)}</time>
              <span>·</span>
              <span>{readingTime} min read</span>
            </div>
            <div className="mt-8 h-px bg-border" />
          </div>
        )}

        {/* Magazine layout needs spacing after hero */}
        {layout === 'magazine' && (
          <div className="mb-8">
            {/* Excerpt if not shown in hero */}
            {post.excerpt && (
              <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">{post.excerpt}</p>
            )}
          </div>
        )}

        {/* Share buttons */}
        <div className="mb-8 flex items-center gap-3">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Share</span>
          <BlogShareButtons title={post.title} />
        </div>

        {/* Article content */}
        <div
          className="prose max-w-none dark:prose-invert prose-headings:font-normal prose-a:text-foreground prose-a:underline prose-a:underline-offset-2 prose-p:text-foreground/90 [&_h1]:text-3xl [&_h1]:md:text-4xl [&_h1]:leading-tight [&_h1]:font-semibold [&_h1]:mt-12 [&_h1]:mb-6 [&_h2]:text-2xl [&_h2]:md:text-3xl [&_h2]:leading-tight [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-5 [&_h3]:text-xl [&_h3]:md:text-2xl [&_h3]:leading-tight [&_h3]:font-semibold [&_h3]:mt-8 [&_h3]:mb-4 [&_p]:text-[1.05rem] [&_p]:leading-8 [&_ul]:my-6 [&_ul]:list-disc [&_ul]:ml-8 [&_ul]:pl-1 [&_ol]:my-6 [&_ol]:list-decimal [&_ol]:ml-8 [&_ol]:pl-1 [&_li]:pl-1 [&_li]:mb-2 [&_blockquote]:border-l-2 [&_blockquote]:border-foreground/20 [&_blockquote]:pl-6 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_pre]:bg-card [&_pre]:border [&_pre]:border-border [&_pre]:rounded-lg [&_pre]:p-4 [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_hr]:border-border [&_hr]:my-10 [&_figure]:my-8 [&_figure]:rounded-xl [&_figure]:border [&_figure]:border-border [&_figure]:bg-card/50 [&_figure]:overflow-hidden [&_figure]:shadow-sm [&_figure]:hover:shadow-md [&_figure]:transition-all [&_figure]:duration-300 [&_figure]:p-0 [&_img]:m-0 [&_img]:rounded-none [&_img]:border-none [&_img]:shadow-none [&_figcaption]:text-center [&_figcaption]:text-sm [&_figcaption]:text-muted-foreground [&_figcaption]:italic [&_figcaption]:px-4 [&_figcaption]:pb-4 [&_figcaption]:pt-3"
          dangerouslySetInnerHTML={{ __html: safeContentHtml }}
        />

        {/* Bottom tags & share */}
        <div className="mt-16 pt-8 border-t border-border">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {post.tags?.map((tag: string) => (
                <Link
                  key={tag}
                  href={`/blog?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full border border-border px-3 py-1.5 text-xs capitalize text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>
            <BlogShareButtons title={post.title} />
          </div>
        </div>
      </article>

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <section className="border-t border-border bg-card/30">
          <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
            <h2 className="text-2xl font-light tracking-tight mb-8">More articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((rp) => (
                <Link
                  key={rp.id}
                  href={`/blog/${rp.slug}`}
                  className="group flex flex-col rounded-2xl border border-border overflow-hidden hover:border-foreground/15 transition-all duration-300"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                    {rp.coverImage?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cloudinaryPresetUrl(rp.coverImage.url, 'card', { w: 960, h: 600 })}
                        alt={rp.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/80 to-zinc-950 grid place-items-center">
                        <span className="text-4xl font-thin text-zinc-700">{rp.title?.[0] || '?'}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5 flex flex-col flex-grow">
                    <h3 className="text-base font-medium leading-snug text-foreground line-clamp-2 mb-2">{rp.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-grow">{rp.excerpt}</p>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <time>{formatDate(rp.publishedAt)}</time>
                      <span>·</span>
                      <span>{rp.readingTime} min</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
