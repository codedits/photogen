import Hero from "../components/Hero";
import PresetsSection from "../components/PresetsSection";
import ParallaxGallery from "../components/ParallaxGallery";
import { PageContainer, FullBleed } from "../components/layout/Primitives";
import getDatabase from "../lib/mongodb";
import { Preset } from "../components/PresetCard";

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

import BlurGradient from "../components/BlurGradient";

export default async function Home() {
  const presets = await getFeaturedPresets();

  return (
    <PageContainer className="bg-black">
      <FullBleed className="-mt-4">
        <Hero />
      </FullBleed>
      


      <FullBleed>
        <ParallaxGallery />
      </FullBleed>

      <FullBleed>
        <PresetsSection presets={presets} />
      </FullBleed>


      <FullBleed>
        <section className="py-24 bg-[#0a0a0a] border-t border-white/5">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-4xl font-light tracking-tighter text-white mb-8 font-sans">
              Elevate Your Craft
            </h2>
            <p className="text-white/40 max-w-xl mx-auto mb-12 leading-relaxed font-sans">
              Our AI-driven studio provides the tools you need to transform raw captures into professional masterpieces. Minimal effort, maximum impact.
            </p>
            <div className="flex justify-center">
              <div className="w-px h-24 bg-gradient-to-b from-white/20 to-transparent" />
            </div>
          </div>
        </section>
      </FullBleed>

      {/* Fixed bottom overlay */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 h-40 z-40">
        <BlurGradient blur={10} direction="toBottom" borderRadius={0} hideOnMobile={true} />
      </div>
    </PageContainer>
  );
}
