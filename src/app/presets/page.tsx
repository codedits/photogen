import React from "react";
// We replace the generic layout components with custom Tailwind wrappers to control the full theme
import LiveSearchPresets from '../../components/LiveSearchPresets';
import getDatabase, { ensurePresetIndexes } from "../../lib/mongodb";
import { getCache, setCache } from '../../lib/simpleCache';
import { ObjectId } from 'mongodb';
import { Layers } from "lucide-react"; // Optional: Add an icon if you have lucide-react

type PresetShape = {
  id: string;
  name: string;
  description?: string;
  prompt?: string;
  image?: string | null;
  images?: { url: string; public_id: string }[];
  tags?: string[];
};

async function getPresetsFiltered(q: string): Promise<PresetShape[]> {
  const db = await getDatabase();
  const coll = db.collection('presets');
  
  // -- Type Definition for Raw DB Doc --
  type RawDoc = {
    _id: { toString(): string } | ObjectId;
    name?: string;
    description?: string;
    prompt?: string;
    tags?: string[];
    image?: string | null;
    images?: { url: string; public_id: string }[];
  };

  // Background index check (non-blocking)
  ensurePresetIndexes(db.databaseName).catch(() => {});

  let docs: RawDoc[];
  const cacheKey = `ssr:presets:q=${q}`;
  const cached = getCache<RawDoc[]>(cacheKey);

  if (cached) {
    docs = cached;
  } else {
    if (!q) {
      // Default load: Limit to 20 recent
      docs = await coll.find({}, { projection: { name: 1, description: 1, prompt: 1, tags: 1, image: 1, images: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(20).toArray() as RawDoc[];
    } else {
      // Search logic
      try {
        docs = await coll.find({ $text: { $search: q } }, { projection: { name: 1, description: 1, prompt: 1, tags: 1, image: 1, images: 1, createdAt: 1, score: { $meta: 'textScore' } } }).sort({ score: { $meta: 'textScore' } as unknown as 1 }).limit(20).toArray() as RawDoc[];
      } catch {
        const filter: Record<string, unknown> = {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
            { tags: { $elemMatch: { $regex: q, $options: 'i' } } },
          ],
        };
        docs = await coll.find(filter, { projection: { name: 1, description: 1, prompt: 1, tags: 1, image: 1, images: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(100).toArray() as RawDoc[];
      }
    }
    setCache(cacheKey, docs, 60);
  }

  return docs.map((doc) => ({
    id: typeof doc._id === 'string' ? doc._id : String((doc._id as { toString(): string }).toString()),
    name: doc.name || 'Untitled',
    description: doc.description || '',
    prompt: doc.prompt || undefined,
    tags: doc.tags || [],
    image: doc.image || null,
    images: Array.isArray(doc.images) ? doc.images : undefined,
  }));
}

export async function generateMetadata({ searchParams }: { searchParams?: { q?: string } | Promise<{ q?: string }> }) {
  const sp = (await (searchParams as Promise<{ q?: string }> | { q?: string } | undefined)) || { q: '' };
  const q = (sp.q || '').trim();
  
  return {
    title: q ? `Search Results for "${q}" | PhotoGen Presets` : 'Explore Presets | PhotoGen',
    description: 'Browse our collection of professional photography presets.',
  };
}

export default async function PresetsPage({ searchParams }: { searchParams?: { q?: string } | Promise<{ q?: string }> }) {
  const sp = (await (searchParams as Promise<{ q?: string }> | { q?: string } | undefined)) || { q: '' };
  const q = (sp.q || '').trim();
  const presets = await getPresetsFiltered(q);

  return (
    <main className="min-h-screen w-full bg-[#050505] text-[#e1e1e1] selection:bg-white/20 relative overflow-x-hidden">
      
      {/* --- BACKGROUND TEXTURE --- */}
      {/* Noise */}
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
           style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />
      {/* Technical Grid */}
      <div className="fixed inset-0 z-0 opacity-[0.05] pointer-events-none" 
        style={{ 
          backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }} 
      />

      <div className="relative z-10 container mx-auto px-6 pt-32 pb-24">
        
        {/* --- HEADER SECTION --- */}
        <header className="mb-24 border-b border-white/10 pb-12">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="space-y-4">
                 <div className="flex items-center gap-3 text-white/40 mb-2">
                    <Layers className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-[0.2em]">Library / Index</span>
                 </div>
                 
                 <h1 className="text-[12vw] md:text-[8vw] leading-[0.85] font-bold tracking-tighter text-white/90">
                    PRESETS
                 </h1>
                 
                 <p className="text-sm md:text-base uppercase tracking-[0.2em] text-white/50 max-w-lg mt-6 border-l border-white/20 pl-4">
                    Curated grading tools <br/> for intelligent photography.
                 </p>
              </div>

              
           </div>
        </header>

        {/* --- CONTENT AREA --- */}
        <div className="w-full">
           {/* Passing presets to the client component */}
           <LiveSearchPresets initial={presets} />
        </div>

      </div>
    </main>
  );
}