import Hero from "../components/Hero";
import PresetsSection from "../components/PresetsSection";
import ParallaxGallery from "../components/ParallaxGallery";
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

export default async function Home() {
  const presets = await getFeaturedPresets();

  return (
    <PageContainer className="bg-black">
      <FullBleed>
        <Hero />
      </FullBleed>

      <FullBleed>
        <ParallaxGallery />
      </FullBleed>

      <FullBleed>
        <PresetsSection presets={presets} />
      </FullBleed>
    </PageContainer>
  );
}
