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
  dng?: { url: string; public_id: string; format?: string } | null;
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
        <h1 className="text-2xl sm:text-3xl font-semibold mt-4">{preset.name || 'Untitled'}</h1>

        {/* Carousel */}
        <div className="mt-6">
          {images.length ? (
            <Carousel items={images.map(i => ({ url: i.url, alt: preset.name || 'Preset' }))} />
          ) : (
            <div className="w-full h-[280px] rounded-lg flex items-center justify-center bg-slate-800/60 text-slate-200">No images</div>
          )}
        </div>

        {/* Description */}
        {preset.description && (
          <p className="mt-6 text-slate-200/90 leading-relaxed">{preset.description}</p>
        )}

        {/* Download DNG (separate from carousel) */}
        <div className="mt-8">
          <a
            href={`/api/presets/${preset._id.toString()}/download`}
            className="inline-flex items-center px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-500"
          >
            Download This Preset
            {/* use next/image for faster loading */}
            <Image src="/download.svg" alt="DNG" width={20} height={20} className="ml-2" />
          </a>
        </div>
      </div>
    </div>
  );
}
