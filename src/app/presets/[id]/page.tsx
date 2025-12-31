import React from 'react';
import { ObjectId } from 'mongodb';
import Link from 'next/link';
import { ArrowLeft, Download, Hash, Info, Layers, AlertCircle } from 'lucide-react';
import getDatabase from '../../../lib/mongodb';
import PresetGallery from './PresetGallery'; // Import the component from Part 1

// --- TYPES ---
type PresetDoc = {
  _id: ObjectId;
  name?: string;
  description?: string;
  images?: { url: string; public_id: string }[];
  tags?: string[];
  dng?: { url: string; public_id?: string; format?: string } | null;
};

// --- DATABASE HELPERS ---
function isValidObjectId(id: string) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

async function getPreset(id: string) {
  if (!id || !isValidObjectId(id)) return null;
  try {
    const db = await getDatabase();
    const coll = db.collection('presets');
    const doc = await coll.findOne({ _id: new ObjectId(id) });
    return doc as PresetDoc | null;
  } catch (e) {
    console.error("DB Error:", e);
    return null;
  }
}

// --- SSG / ISR CONFIG ---
export const revalidate = 3600; // Revalidate every hour

export async function generateStaticParams() {
  try {
    const db = await getDatabase();
    const presets = await db.collection('presets').find({}, { projection: { _id: 1 } }).toArray();
    return presets.map((preset) => ({
      id: preset._id.toString(),
    }));
  } catch (e) {
    console.error("Failed to generate static params:", e);
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id || '';
  const preset = await getPreset(id);
  
  if (!preset) {
    return {
      title: 'Preset Not Found | PhotoGen',
    };
  }

  return {
    title: `${preset.name || 'Untitled'} Preset | PhotoGen`,
    description: preset.description || 'Professional photography preset.',
    openGraph: {
      images: preset.images?.[0]?.url ? [preset.images[0].url] : [],
    },
  };
}

// --- MAIN PAGE COMPONENT ---
export default async function PresetDetail({ params }: { params: Promise<{ id: string }> }) {
  // Await params for Next.js 15 compatibility
  const resolvedParams = await params;
  const id = resolvedParams?.id || '';
  const preset = await getPreset(id);

  // --- 404 STATE ---
  if (!preset) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-white space-y-6">
        <div className="relative">
          <Layers className="w-16 h-16 text-neutral-800" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-light tracking-tighter uppercase mb-2">Asset Not Found</h2>
          <p className="text-neutral-500 text-xs font-mono uppercase tracking-widest mb-8">
            ID: {id || 'UNDEFINED'}
          </p>
          <Link 
            href="/presets" 
            className="px-6 py-3 border border-white/20 hover:bg-white hover:text-black hover:border-transparent text-xs font-bold uppercase tracking-[0.2em] transition-all"
          >
            Return to Index
          </Link>
        </div>
      </div>
    );
  }

  // Safe data extraction
  const images = Array.isArray(preset.images) ? preset.images : [];

  return (
    <main className="min-h-screen bg-[#050505] text-[#e1e1e1] selection:bg-white/20">
      
      {/* Global Grain Texture */}
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none mix-blend-overlay" 
           style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />

      {/* --- FLOATING NAV --- */}
      <nav className="fixed top-0 left-0 h-16 px-6 z-50 flex items-center">
        <Link 
          href="/presets" 
          className="group flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-full hover:bg-white hover:text-black transition-all"
        >
          <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
          <span className="text-[10px] uppercase tracking-widest font-bold">Back</span>
        </Link>
      </nav>

      {/* --- SPLIT LAYOUT --- */}
      <div className="flex flex-col lg:flex-row min-h-screen">
        
        {/* LEFT: IMMERSIVE GALLERY (65% width) */}
        <div className="w-full lg:w-[65%] xl:w-[70%] relative z-10">
          <PresetGallery images={images} presetName={preset.name || 'Untitled'} />
        </div>

        {/* RIGHT: DETAILS SIDEBAR (35% width) */}
        <aside className="w-full lg:w-[35%] xl:w-[30%] bg-[#050505] border-l-0 lg:border-l border-white/10 flex flex-col relative z-20">
          
          <div className="p-8 lg:p-12 flex-grow">
            
            {/* Header Block */}
            <div className="mb-12 pt-8 lg:pt-16">
              <div className="flex items-center gap-2 text-emerald-500 mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[9px] uppercase tracking-widest font-mono text-white/60">Active Asset</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium uppercase tracking-tighter leading-[0.9] text-white mb-6">
                {preset.name || 'Untitled'}
              </h1>
              
              <div className="w-12 h-[1px] bg-white/50" />
            </div>

            {/* Description */}
            <div className="mb-12">
              <h3 className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40 mb-3 font-mono">
                <Info className="w-3 h-3" /> Info
              </h3>
              <p className="text-sm leading-7 text-white/70 font-light">
                {preset.description || (
                  <span className="italic opacity-50">No description provided for this grading asset.</span>
                )}
              </p>
            </div>

            {/* Tags */}
            <div className="mb-12">
              <h3 className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40 mb-3 font-mono">
                <Hash className="w-3 h-3" /> Attributes
              </h3>
              <div className="flex flex-wrap gap-2">
                {preset.tags && preset.tags.length > 0 ? (
                  preset.tags.map((tag) => (
                    <span 
                      key={tag} 
                      className="px-2 py-1 bg-white/5 border border-white/5 text-[10px] uppercase tracking-wider text-white/60"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-white/20 font-mono">NULL</span>
                )}
              </div>
            </div>

            {/* Metadata (Visual Filler) */}
            <div className="grid grid-cols-2 gap-4 pt-8 border-t border-white/10">
               <div>
                  <span className="block text-[9px] uppercase tracking-widest text-white/30 mb-1">ID</span>
                  <span className="font-mono text-[10px] text-white/60">{preset._id.toString().slice(-6).toUpperCase()}</span>
               </div>
               <div>
                  <span className="block text-[9px] uppercase tracking-widest text-white/30 mb-1">Type</span>
                  <span className="font-mono text-[10px] text-white/60">DIGITAL ASSET</span>
               </div>
            </div>
          </div>

          {/* Sticky Bottom Actions */}
          <div className="sticky bottom-0 p-8 bg-[#050505]/90 backdrop-blur-lg border-t border-white/10">
            {preset.dng?.url ? (
              <a
                href={preset.dng.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative w-full flex items-center justify-center gap-3 py-4 bg-white text-black hover:bg-neutral-200 transition-colors"
              >
                <span className="text-xs font-bold uppercase tracking-[0.2em]">Download Asset</span>
                <Download className="w-4 h-4" />
                {/* Hover Effect Line */}
                <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-black transition-all duration-300 group-hover:w-full" />
              </a>
            ) : (
              <button disabled className="w-full flex items-center justify-center gap-2 py-4 bg-white/5 text-white/20 cursor-not-allowed border border-white/5">
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">Unavailable</span>
              </button>
            )}
            <p className="text-center mt-3 text-[9px] text-white/30 uppercase tracking-widest">
              Commercial License Included
            </p>
          </div>

        </aside>
      </div>
    </main>
  );
}