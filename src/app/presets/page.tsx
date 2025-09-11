import React from "react";
import { PageContainer, Section } from "../../components/layout/Primitives";
// PresetCard removed from this page; LiveSearchPresets handles rendering
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
  type RawDoc = {
    _id: { toString(): string } | ObjectId;
    name?: string;
    description?: string;
    prompt?: string;
    tags?: string[];
    image?: string | null;
    images?: { url: string; public_id: string }[];
  };

  // Kick off index creation if needed but don't await here to avoid blocking SSR.
  // The root layout already starts index creation in the background; this is a soft
  // guard to start it if not already running.
  ensurePresetIndexes(db.databaseName).catch(() => {});

  let docs: RawDoc[];
  const cacheKey = `ssr:presets:q=${q}`;
  const cached = getCache<RawDoc[]>(cacheKey);
  if (cached) {
    docs = cached;
  } else {
    if (!q) {
      // Limit SSR payload to a reasonable page size to reduce latency and match client defaults.
      docs = await coll.find({}, { projection: { name: 1, description: 1, prompt: 1, tags: 1, image: 1, images: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(20).toArray() as RawDoc[];
    } else {
      // Try a text search first; if text index isn't suitable, fall back to regex OR queries.
      try {
  docs = await coll.find({ $text: { $search: q } }, { projection: { name: 1, description: 1, prompt: 1, tags: 1, image: 1, images: 1, createdAt: 1, score: { $meta: 'textScore' } } }).sort({ score: { $meta: 'textScore' } as unknown as 1 }).limit(20).toArray() as RawDoc[];
  } catch {
        // Fallback to regex search across fields
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
  // Cache SSR results for a short period to speed repeated visits.
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

export default async function PresetsPage({ searchParams }: { searchParams?: { q?: string } | Promise<{ q?: string }> }) {
  // `searchParams` may be a dynamic API that needs to be awaited in Next.js app router.
  const sp = (await (searchParams as Promise<{ q?: string }> | { q?: string } | undefined)) || { q: '' };
  const q = (sp.q || '').trim();
  const presets = await getPresetsFiltered(q);

  return (
    <PageContainer>
      <Section className="pt-24 pb-8">
        <h2 className="text-2xl sm:text-3xl font-semibold mb-6">Presets</h2>
  {/* Live client-side search component — shows defaults when empty */}
  <LiveSearchPresets initial={presets} />
      </Section>
    </PageContainer>
  );
}
