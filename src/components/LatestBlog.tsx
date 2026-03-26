import Link from 'next/link';
import Image from 'next/image';
import { cloudinaryPresetUrl } from '../lib/cloudinaryUrl';

type LatestBlogItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: string | null;
  coverImage?: { url: string; public_id: string } | null;
  inlineImages?: { url: string; public_id: string }[];
};

interface LatestBlogProps {
  posts: LatestBlogItem[];
}

function formatDate(value: string | null) {
  if (!value) return 'Unscheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unscheduled';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function postImage(post: LatestBlogItem) {
  return post.coverImage?.url || post.inlineImages?.[0]?.url || null;
}

function tagLabel(title: string, index: number) {
  if (/design/i.test(title)) return 'Design';
  if (/color|grading|edit/i.test(title)) return 'Editing';
  if (/brand|strategy/i.test(title)) return 'Strategy';
  if (index === 0) return 'Insights';
  return 'Journal';
}

export default function LatestBlog({ posts }: LatestBlogProps) {
  const featured = posts[0];
  const secondary = posts.slice(1, 4);

  return (
    <section className="min-h-[70vh] md:min-h-screen bg-background text-foreground px-6 py-16 md:px-12 lg:px-20 md:py-24">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-8 mb-12 md:mb-16">
          <div className="max-w-2xl">
            <h2 className="text-[40px] md:text-[56px] lg:text-[64px] font-medium tracking-tight leading-[1.05] mb-5">
              Latest insights from our blog.
            </h2>
            <p className="text-muted-foreground text-lg md:text-[19px] leading-relaxed max-w-lg">
              Thoughts, ideas, and perspectives on
              <br className="hidden sm:block" />
              design, simplicity, and creative process.
            </p>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center justify-center gap-2 bg-foreground text-background px-6 py-3.5 rounded-full font-medium text-[15px] hover:opacity-90 transition-colors self-start whitespace-nowrap group"
          >
            View all articles
            <span className="font-light text-lg leading-none group-hover:translate-x-0.5 transition-transform">+</span>
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
            No published blog posts yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 items-stretch">
            {featured && (
              <Link
                href={`/blog/${featured.slug}`}
                className="md:col-span-2 relative rounded-[20px] overflow-hidden min-h-[450px] lg:min-h-[540px] group cursor-pointer [content-visibility:auto]"
              >
                {postImage(featured) ? (
                  <Image
                    src={cloudinaryPresetUrl(postImage(featured) as string, 'hero', { w: 1440, h: 900 })}
                    alt={featured.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    fill
                    loading="lazy"
                    quality={75}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10 transition-opacity duration-500" />

                <div className="absolute top-5 right-5 bg-black/80 md:bg-black/70 md:backdrop-blur-md px-4 py-1.5 rounded-full text-[13px] font-medium text-white/95 z-10 border border-white/5">
                  {tagLabel(featured.title, 0)}
                </div>

                <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 lg:p-10 z-10 flex flex-col justify-end">
                  <time className="text-zinc-300 text-[15px] font-medium mb-3 block">{formatDate(featured.publishedAt)}</time>
                  <h3 className="text-[28px] md:text-[34px] lg:text-[38px] font-medium leading-[1.15] mb-4 text-white">
                    {featured.title}
                  </h3>
                  <p className="text-zinc-200 text-[15px] md:text-[16px] leading-relaxed max-w-2xl line-clamp-2 md:line-clamp-3">
                    {featured.excerpt}
                  </p>
                </div>
              </Link>
            )}

            {secondary.map((post, idx) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="flex flex-col group cursor-pointer [content-visibility:auto]">
                <div className="relative rounded-[20px] overflow-hidden aspect-video mb-5">
                  {postImage(post) ? (
                    <Image
                      src={cloudinaryPresetUrl(postImage(post) as string, 'card', { w: 960, h: 600 })}
                      alt={post.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      fill
                      loading="lazy"
                      quality={75}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950" />
                  )}

                  <div className="absolute top-4 right-4 bg-black/85 md:bg-black/80 md:backdrop-blur-md px-4 py-1.5 rounded-full text-[13px] font-medium text-white/95 border border-white/5 z-10">
                    {tagLabel(post.title, idx + 1)}
                  </div>
                </div>

                <div className="flex flex-col flex-grow">
                  <time className="text-muted-foreground text-[15px] font-medium mb-2.5 block">{formatDate(post.publishedAt)}</time>
                  <h3 className="text-[22px] md:text-[24px] font-medium leading-[1.25] mb-3 text-foreground line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-muted-foreground text-[15px] leading-relaxed line-clamp-3">{post.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
