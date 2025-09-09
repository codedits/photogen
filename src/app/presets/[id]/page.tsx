import React from 'react';
import Image from 'next/image';
import Carousel from '../../../components/Carousel';
import getDatabase from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import Link from 'next/link';

type PresetDoc = {
  _id: ObjectId;
  name?: string;
  description?: string;
  images?: { url: string; public_id: string }[];
  tags?: string[];
  dng?: { url: string; public_id?: string; format?: string } | null;
};

async function getPreset(id: string) {
  const db = await getDatabase();
  const coll = db.collection('presets');
  const doc = await coll.findOne({ _id: new ObjectId(id) });
  return doc as PresetDoc | null;
}

export default async function PresetDetail({ params }: { params?: { id: string } | Promise<{ id: string }> }) {
  const p = (await (params as Promise<{ id: string }> | { id: string } | undefined)) || { id: '' };
  const preset = await getPreset(p.id);
  if (!preset) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-slate-400">Preset not found</div>
    </div>
  );

  const images = Array.isArray(preset.images) ? preset.images : [];

  return (
    <div className="min-h-screen px-6 pt-24 pb-8">
      <div className="max-w-5xl mx-auto">
        <Link href="/presets" className="text-sm text-slate-300 hover:text-white">← Back to presets</Link>
        <h1 className="text-4xl sm:text-5xl font-semibold mt-4 glow-sm">{preset.name || 'Untitled'}</h1>

        {/* Two-column layout: carousel left, details right on md+ */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-12 md:gap-8 items-start">
          <div className="md:col-span-7">
            {images.length ? (
              <Carousel items={images.map(i => ({ url: i.url, alt: preset.name || 'Preset' }))} />
            ) : (
              <div className="w-full h-[280px] rounded-lg flex items-center justify-center bg-slate-800/60 text-slate-200">No images</div>
            )}
          </div>

          <aside className="mt-6 md:mt-0 md:col-span-5 space-y-4">
            {/* Description */}
            <section aria-labelledby="preset-desc" className="bg-black/6 p-4 rounded-lg border border-white/6">
              <h2 id="preset-desc" className="text-lg font-semibold mb-2">Description</h2>
              <div className="text-slate-200/90 leading-relaxed text-sm">
                {preset.description ? preset.description : <span className="text-slate-400">No description provided.</span>}
              </div>
            </section>

            {/* Tags */}
            <section aria-labelledby="preset-tags" className="bg-black/6 p-4 rounded-lg border border-white/6">
              <h3 id="preset-tags" className="text-sm font-medium mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(preset.tags) && preset.tags.length ? (
                  preset.tags.map((t: string) => (
                    <span key={t} className="text-xs bg-white/6 text-slate-200 px-2 py-1 rounded-full">{t}</span>
                  ))
                ) : (
                  <span className="text-slate-400 text-sm">No tags</span>
                )}
              </div>
            </section>

            {/* Files / Download */}
            <section aria-labelledby="preset-files" className="bg-black/6 p-4 rounded-lg border border-white/6">
              <h3 id="preset-files" className="text-sm font-medium mb-2">Files</h3>
              <div className="flex items-center gap-3">
                <a
                  href={preset.dng?.url || '#'}
                  target={preset.dng?.url ? '_blank' : undefined}
                  rel={preset.dng?.url ? 'noopener noreferrer' : undefined}
                  className="inline-flex items-center px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  Download 
                  <Image src="/download.svg" alt="DNG" width={18} height={18} className="ml-2" />
                </a>
              </div>
              
            </section>
          </aside>
        </div>
        
      </div>
    </div>
  );
}
