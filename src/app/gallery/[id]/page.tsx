import React, { cache } from 'react';
import { ObjectId } from 'mongodb';
import Link from 'next/link';
import { ArrowLeft, MapPin, Camera, Info, Calendar, User, Maximize2, Star } from 'lucide-react';
import getDatabase from '../../../lib/mongodb';
import ImageWithLqip from '../../../components/ImageWithLqip';
import GalleryImageGrid from '../../../components/GalleryImageGrid';
import type { GalleryDoc } from '../../api/gallery/route';

// --- TYPES ---
interface GalleryItem extends Omit<GalleryDoc, '_id'> {
  _id: ObjectId;
}

// --- DATABASE HELPERS ---
function isValidObjectId(id: string) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

const getGalleryItem = cache(async (id: string) => {
  if (!id || !isValidObjectId(id)) return null;
  try {
    const db = await getDatabase();
    const coll = db.collection<GalleryDoc>('gallery');
    const doc = await coll.findOne({ _id: new ObjectId(id) });
    return doc as GalleryItem | null;
  } catch (e) {
    console.error("DB Error:", e);
    return null;
  }
});

// --- SSG / ISR CONFIG ---
export const revalidate = false; // On-demand revalidation only

export async function generateStaticParams() {
  try {
    const db = await getDatabase();
    const items = await db.collection('gallery').find({ visibility: 'public' }, { projection: { _id: 1 } }).toArray();
    return items.map((item) => ({
      id: item._id.toString(),
    }));
  } catch (e) {
    console.error("Failed to generate static params:", e);
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id || '';
  const item = await getGalleryItem(id);
  
  if (!item) {
    return { title: 'Item Not Found | PhotoGen Gallery' };
  }

  return {
    title: `${item.name} | PhotoGen Gallery`,
    description: item.description || 'Professional photography showcase.',
    openGraph: {
      images: item.images?.[0]?.url ? [item.images[0].url] : [],
    },
  };
}

// --- MAIN PAGE COMPONENT ---
export default async function GalleryDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id || '';
  const item = await getGalleryItem(id);

  if (!item || item.visibility === 'private') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-white space-y-6">
        <Camera className="w-16 h-16 text-neutral-800" />
        <div className="text-center">
          <h2 className="text-xl font-light tracking-tighter uppercase mb-2">Item Not Found</h2>
          <Link 
            href="/gallery" 
            className="px-6 py-3 border border-white/20 hover:bg-white hover:text-black text-xs font-bold uppercase tracking-[0.2em] transition-all"
          >
            Return to Gallery
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-white font-sans selection:bg-white/20">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-10 pt-28 md:pt-32 pb-4 md:pb-8 lg:pb-10">
        
        {/* Main Layout Grid */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 relative items-start">
          
          {/* --- LEFT SIDEBAR (Fixed/Sticky on Desktop) --- */}
          <aside className="w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 lg:sticky lg:top-32 flex flex-col pb-10 lg:pb-0">
            
            <div className="flex flex-col gap-10">
              {/* Back to Gallery */}
              <Link 
                href="/gallery" 
                className="group flex items-center gap-3 text-[#a1a1aa] hover:text-white transition-colors duration-500 mb-4"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span className="text-[11px] uppercase tracking-[0.4em]">Back to Archive</span>
              </Link>

              {/* Header: Album Info */}
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/10">
                  <ImageWithLqip 
                    src={item.images[0].url} 
                    alt="Album Thumbnail" 
                    fill
                    className="object-cover"
                    transformOpts={{ w: 100, q: 20 }}
                    noBlur={true}
                  />
                </div>
                <div>
                  <h1 className="text-white font-semibold text-[17px] tracking-tight leading-tight">{item.name}</h1>
                  <p className="text-[#a1a1aa] text-[14px] uppercase tracking-widest mt-1 opacity-60">{item.category}</p>
                </div>
              </div>

              {/* Main Description */}
              <h2 className="text-[1.4rem] md:text-[1.65rem] leading-[1.3] font-medium tracking-tight text-[#888888]">
                {item.description ? (
                  item.description.split(/('[^']+')/g).map((part, i) => {
                    const isQuoted = part.startsWith("'") && part.endsWith("'");
                    const content = isQuoted ? part.slice(1, -1) : part;
                    return (
                      <span key={i} className={isQuoted ? 'text-white font-medium' : ''}>
                        {content}
                      </span>
                    );
                  })
                ) : (
                  "Capturing visual stories through light and shadow."
                )}
              </h2>

              {/* Availability & Action */}
              <div className="flex flex-col items-start gap-6">
                <div className="flex items-center gap-2 text-[#a1a1aa] text-[14px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                  Professional prints available upon request.
                </div>
                
                <Link 
                  href="/contact"
                  className="bg-white text-black font-semibold text-[14px] uppercase tracking-widest px-8 py-3.5 rounded-full hover:bg-neutral-200 transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  Inquiry
                </Link>
              </div>

              {/* Divider */}
              <div className="w-full h-[1px] bg-white/[0.08] mt-4"></div>

              {/* Editorial Logos */}
              <div className="flex items-center gap-6 opacity-30 grayscale flex-wrap pointer-events-none">
                <div className="font-bold text-xl tracking-tighter">LUMINA</div>
                <div className="font-bold text-xl tracking-tighter">STUDIO</div>
                <div className="font-bold text-xl tracking-widest uppercase text-sm">Vogue</div>
                <div className="font-bold text-xl tracking-tighter">KINFORK</div>
              </div>

              {/* Technical Details */}
              <div className="mt-8 flex flex-col gap-6">
                <div>
                  <h3 className="text-white font-bold text-[17px] mb-3">About this series.</h3>
                  <p className="text-zinc-300 text-[15px] leading-relaxed max-w-[95%] font-light">
                    This collection was curated to showcase the intersection of environmental context and human narrative. 
                    {item.location && ` Captured in ${item.location}. `}
                    {item.photographer && ` Produced by ${item.photographer}.`}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <span className="text-white font-semibold text-sm block mb-1">{item.images.length}+ Assets</span>
                    <span className="text-[#a1a1aa] text-[13px] uppercase tracking-wider">High-Res Plates</span>
                  </div>
                  {item.equipment && (
                    <div>
                      <span className="text-white font-bold text-sm block mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
                        {item.equipment.split(' ')[0]}
                      </span>
                      <span className="text-[#a1a1aa] text-[13px] uppercase tracking-wider">Primary Optic</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </aside>

          {/* --- RIGHT GALLERY (Two Column Masonry) --- */}
          <main className="flex-1">
            <GalleryImageGrid images={item.images} userName={item.name} />
          </main>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 flex flex-col items-end gap-3 z-50 pointer-events-none hidden md:flex">
        <Link 
          href="/contact"
          className="pointer-events-auto bg-white text-black font-bold text-[11px] uppercase tracking-widest px-6 py-3 rounded-full shadow-2xl hover:bg-neutral-200 transition-transform hover:scale-105 active:scale-95"
        >
          Book a Session
        </Link>
        <button className="pointer-events-auto bg-[#1a1a1a]/80 backdrop-blur-xl text-white/40 font-bold text-[10px] uppercase tracking-widest px-6 py-3 rounded-full border border-white/5 shadow-2xl hover:text-white transition-all">
          Shared with PhotoGen
        </button>
      </div>
    </main>
  );
}


