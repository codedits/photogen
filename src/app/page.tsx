import Hero from "../components/Hero";
import PresetsSection from "../components/PresetsSection";
import ParallaxGallery from "../components/ParallaxGallery";
import FeaturedGallery from "../components/FeaturedGallery";
import LatestBlog from "../components/LatestBlog";
import { PageContainer, FullBleed } from "../components/layout/Primitives";
import getDatabase from "../lib/mongodb";
import { Preset } from "../components/PresetCard";

export const revalidate = false; // On-demand revalidation only

async function getFeaturedPresets(): Promise<Preset[]> {
  try {
    const db = await getDatabase();
    const coll = db.collection("presets");
    const docs = await coll.find({}).sort({ createdAt: -1 }).limit(3).toArray();
    
    return docs.map(doc => ({
      id: doc._id.toString(),
      name: doc.name || "Untitled",
      description: doc.description,
      image: doc.image,
      images: doc.images,
      tags: doc.tags,
    }));
  } catch (e) {
    console.error("Failed to fetch presets:", e);
    return [];
  }
}

async function getFeaturedGallery(): Promise<any[]> {
  try {
    const db = await getDatabase();
    const coll = db.collection("gallery");
    // Only public, featured items
    const docs = await coll.find({ featured: true, visibility: 'public' }).sort({ uploadDate: -1 }).limit(4).toArray();
    
    return docs.map(doc => ({
      ...doc,
      _id: doc._id.toString()
    }));
  } catch (e) {
    console.error("Failed to fetch featured gallery:", e);
    return [];
  }
}

async function getLatestBlogPosts(): Promise<any[]> {
  try {
    const db = await getDatabase();
    const coll = db.collection("blog");
    const docs = await coll
      .find(
        { status: 'published', publishedAt: { $ne: null } },
        { projection: { title: 1, slug: 1, excerpt: 1, publishedAt: 1, coverImage: 1, inlineImages: 1 } }
      )
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(4)
      .toArray();

    return docs.map((doc) => ({
      id: doc._id.toString(),
      title: doc.title || 'Untitled',
      slug: doc.slug || '',
      excerpt: doc.excerpt || 'Read the full article for details.',
      publishedAt: doc.publishedAt ? new Date(doc.publishedAt).toISOString() : null,
      coverImage: doc.coverImage || null,
      inlineImages: Array.isArray(doc.inlineImages) ? doc.inlineImages : [],
    }));
  } catch (e) {
    console.error("Failed to fetch latest blog posts:", e);
    return [];
  }
}

type HeroSettings = {
  introText?: string;
  mainHeadline?: string;
  image?: {
    url?: string;
    public_id?: string;
  };
};

async function getHeroSettings(): Promise<HeroSettings | null> {
  try {
    const db = await getDatabase();
    const settings = await db.collection("settings").findOne({ _id: "hero_settings" as any });
    if (!settings) return null;

    return {
      introText: settings.introText,
      mainHeadline: settings.mainHeadline,
      image: {
        url: settings.image?.url,
        public_id: settings.image?.public_id,
      },
    };
  } catch (e) {
    console.error("Failed to fetch hero settings:", e);
    return null;
  }
}

export default async function Home() {
  const [presets, featuredGallery, heroSettings, latestBlogPosts] = await Promise.all([
    getFeaturedPresets(),
    getFeaturedGallery(),
    getHeroSettings(),
    getLatestBlogPosts(),
  ]);

  return (
    <PageContainer>
      <FullBleed>
        <Hero settings={heroSettings ?? undefined} />
      </FullBleed>

      <FullBleed className="perf-section">
        <ParallaxGallery />
      </FullBleed>

      {featuredGallery.length > 0 && (
        <FullBleed className="perf-section">
          <FeaturedGallery items={featuredGallery} />
        </FullBleed>
      )}

      <FullBleed className="perf-section">
        <PresetsSection presets={presets} />
      </FullBleed>

      <FullBleed className="perf-section">
        <LatestBlog posts={latestBlogPosts} />
      </FullBleed>
    </PageContainer>
  );
}
