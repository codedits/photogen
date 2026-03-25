import React from "react";
// We replace the generic layout components with custom Tailwind wrappers to control the full theme
import LiveSearchPresets from '../../components/LiveSearchPresets';
import getDatabase, { ensurePresetIndexes } from "../../lib/mongodb";
import { getCache, setCache } from '../../lib/simpleCache';
import { ObjectId } from 'mongodb';

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
    <main className="min-h-screen w-full text-foreground selection:bg-foreground/20 relative">
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 pt-32 pb-24">
        
        {/* Header */}
        <header className="mb-16 pb-8 border-b border-border">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-6 flex items-center gap-2">
            <span className="w-4 h-px bg-border" />
            Library
          </p>
          <h1 className="text-3xl md:text-4xl font-normal tracking-tight text-foreground leading-[0.95]">
            Presets
          </h1>
          <p className="text-[13px] text-muted-foreground mt-4 max-w-md leading-relaxed">
            Curated grading tools for intelligent photography.
          </p>
        </header>

        {/* Content */}
        <div className="w-full">
          <LiveSearchPresets initial={presets} />
        </div>

      </div>
    </main>
  );
}