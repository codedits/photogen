import Link from 'next/link';
import getDatabase from '../../lib/mongodb';
import { cloudinaryPresetUrl } from '../../lib/cloudinaryUrl';
import type { BlogDoc } from '../api/blog/route';

export const revalidate = 300;

async function getPublishedPosts() {
  const db = await getDatabase();
  const coll = db.collection<BlogDoc>('blog');
  const posts = await coll
    .find({ status: 'published', publishedAt: { $ne: null } }, { projection: { contentHtml: 0, contentText: 0 } as any })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(100)
    .toArray();

  return posts.map((post: any) => ({
    id: post._id.toString(),
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    tags: post.tags || [],
    readingTime: post.readingTime || 1,
    publishedAt: post.publishedAt,
    coverImage: post.coverImage || null,
  }));
}

function getAllTags(posts: { tags: string[] }[]): string[] {
  const tagSet = new Set<string>();
  posts.forEach((p) => p.tags?.forEach((t) => tagSet.add(t)));
  return Array.from(tagSet).sort();
}

function formatDate(value: string | Date | null) {
  if (!value) return 'Unscheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unscheduled';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const posts = await getPublishedPosts();
  const allTags = getAllTags(posts);
  const resolvedParams = await searchParams;
  const activeTag = resolvedParams?.tag || '';

  const filteredPosts = activeTag
    ? posts.filter((p) => p.tags?.includes(activeTag))
    : posts;

  const featured = filteredPosts[0];
  const rest = filteredPosts.slice(1);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero header */}
      <section className="mx-auto max-w-7xl px-6 pt-24 pb-12 md:pt-32 md:pb-16">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">Journal</p>
        <h1 className="text-4xl font-light tracking-tight md:text-6xl lg:text-7xl leading-[1.05]">
          Stories & process notes
        </h1>
        <p className="mt-5 max-w-2xl text-muted-foreground text-lg leading-relaxed">
          Editorial timeline of workflows, experiments, and behind-the-scenes notes from PhotoGen.
        </p>
      </section>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/blog"
              className={`rounded-full border px-4 py-1.5 text-xs transition-colors ${
                !activeTag
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
              }`}
            >
              All
            </Link>
            {allTags.map((tag) => (
              <Link
                key={tag}
                href={`/blog?tag=${encodeURIComponent(tag)}`}
                className={`rounded-full border px-4 py-1.5 text-xs capitalize transition-colors ${
                  activeTag === tag
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground'
                }`}
              >
                {tag}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Posts */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        {filteredPosts.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card/40 p-16 text-center text-muted-foreground">
            {activeTag ? `No posts tagged "${activeTag}" yet.` : 'No published posts yet.'}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Featured post */}
            {featured && (
              <Link
                href={`/blog/${featured.slug}`}
                className="group block relative rounded-2xl overflow-hidden min-h-[400px] md:min-h-[500px] bg-card border border-border"
              >
                {featured.coverImage?.url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cloudinaryPresetUrl(featured.coverImage.url, 'hero', { w: 1600, h: 960 })}
                      alt={featured.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="eager"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
                )}

                <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 z-10">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {featured.tags?.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="rounded-full bg-white/15 backdrop-blur-md border border-white/10 px-3 py-1 text-[11px] text-white/90 capitalize">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-2xl md:text-4xl lg:text-5xl font-medium leading-[1.1] text-white mb-3">
                    {featured.title}
                  </h2>
                  <p className="text-zinc-300 text-[15px] leading-relaxed max-w-2xl line-clamp-2 mb-4">
                    {featured.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-zinc-400 text-sm">
                    <time>{formatDate(featured.publishedAt)}</time>
                    <span>·</span>
                    <span>{featured.readingTime} min read</span>
                  </div>
                </div>
              </Link>
            )}

            {/* Grid */}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map((post) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:border-foreground/15 transition-all duration-300 hover:shadow-lg hover:shadow-black/10"
                  >
                    {/* Image */}
                    <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                      {post.coverImage?.url ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={cloudinaryPresetUrl(post.coverImage.url, 'card', { w: 960, h: 600 })}
                            alt={post.title}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            loading="lazy"
                          />
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/80 to-zinc-950 grid place-items-center">
                          <span className="text-5xl font-thin text-zinc-700">{post.title?.[0] || '?'}</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex flex-col flex-grow p-5">
                      {/* Tags */}
                      {post.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {post.tags.slice(0, 2).map((tag: string) => (
                            <span
                              key={tag}
                              className="rounded-full border border-border px-2.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <h3 className="text-lg font-medium leading-snug text-foreground mb-2 line-clamp-2 group-hover:text-foreground/90">
                        {post.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4 flex-grow">
                        {post.excerpt}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-3 border-t border-border">
                        <time>{formatDate(post.publishedAt)}</time>
                        <span>·</span>
                        <span>{post.readingTime} min read</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
