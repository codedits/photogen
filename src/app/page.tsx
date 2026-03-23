import Hero from "../components/Hero";
import PresetsSection from "../components/PresetsSection";
import ParallaxGallery from "../components/ParallaxGallery";
import FeaturedGallery from "../components/FeaturedGallery";
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

export default async function Home() {
  const [presets, featuredGallery] = await Promise.all([
    getFeaturedPresets(),
    getFeaturedGallery()
  ]);

  return (
    <PageContainer className="bg-black">
      <FullBleed>
        <Hero />
      </FullBleed>

      <FullBleed>
        <ParallaxGallery />
      </FullBleed>

      {featuredGallery.length > 0 && (
        <FullBleed>
          <FeaturedGallery items={featuredGallery} />
        </FullBleed>
      )}

      <FullBleed>
        <PresetsSection presets={presets} />
      </FullBleed>
    </PageContainer>
  );
}
