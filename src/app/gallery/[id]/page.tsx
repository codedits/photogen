import React from 'react';
import { ObjectId } from 'mongodb';
import Link from 'next/link';
import { ArrowLeft, MapPin, Camera, Info, Calendar, User, Maximize2 } from 'lucide-react';
import getDatabase from '../../../lib/mongodb';
import ImageWithLqip from '../../../components/ImageWithLqip';
import type { GalleryDoc } from '../../api/gallery/route';

// --- TYPES ---
interface GalleryItem extends Omit<GalleryDoc, '_id'> {
  _id: ObjectId;
}

// --- DATABASE HELPERS ---
function isValidObjectId(id: string) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

async function getGalleryItem(id: string) {
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
}

// --- SSG / ISR CONFIG ---
export const revalidate = 3600; // Revalidate every hour

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
    <main className="min-h-screen bg-[#050505] text-white selection:bg-white/20">
      {/* Global Grain Texture */}
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none mix-blend-overlay" 
           style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />

      {/* --- FLOATING NAV --- */}
      <nav className="fixed top-0 left-0 w-full h-20 px-6 md:px-12 z-50 flex items-center justify-between pointer-events-none">
        <Link 
          href="/gallery" 
          className="group flex items-center gap-2 px-5 py-2.5 bg-black/50 backdrop-blur-xl border border-white/10 rounded-full hover:bg-white hover:text-black transition-all pointer-events-auto"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Back to Gallery</span>
        </Link>
      </nav>

      {/* --- HERO HEADER --- */}
      <header className="relative pt-40 pb-20 px-6 md:px-12 border-b border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-6">
                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-[0.2em] text-white/60">
                  {item.category}
                </span>
                {item.featured && (
                  <span className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-[10px] uppercase tracking-[0.2em] text-yellow-500">
                    Featured
                  </span>
                )}
              </div>
              <h1 className="text-5xl md:text-7xl font-light tracking-tighter uppercase mb-8 leading-[0.9]">
                {item.name}
              </h1>
              {item.description && (
                <p className="text-xl text-white/50 font-light leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>

            {/* Technical Specs Sidebar */}
            <div className="grid grid-cols-2 gap-x-12 gap-y-6 border-l border-white/10 pl-8 md:pl-12">
              {item.location && (
                <div>
                  <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/30 mb-2">
                    <MapPin className="w-3 h-3" /> Location
                  </span>
                  <span className="text-sm font-light">{item.location}</span>
                </div>
              )}
              {item.photographer && (
                <div>
                  <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/30 mb-2">
                    <User className="w-3 h-3" /> Artist
                  </span>
                  <span className="text-sm font-light">{item.photographer}</span>
                </div>
              )}
              {item.equipment && (
                <div className="col-span-2">
                  <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/30 mb-2">
                    <Camera className="w-3 h-3" /> Equipment
                  </span>
                  <span className="text-sm font-light">{item.equipment}</span>
                </div>
              )}
              {item.metadata && (
                <>
                  {item.metadata.aperture && (
                    <div>
                      <span className="block text-[10px] uppercase tracking-widest text-white/30 mb-1">Aperture</span>
                      <span className="text-sm font-mono text-white/80">{item.metadata.aperture}</span>
                    </div>
                  )}
                  {item.metadata.shutter && (
                    <div>
                      <span className="block text-[10px] uppercase tracking-widest text-white/30 mb-1">Shutter</span>
                      <span className="text-sm font-mono text-white/80">{item.metadata.shutter}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* --- IMAGE SHOWCASE --- */}
      <section className="py-20 px-6 md:px-12">
        <div className="max-w-7xl mx-auto space-y-24">
          {item.images.map((img, idx) => (
            <div key={idx} className="relative group">
              <div className="relative overflow-hidden bg-neutral-900 rounded-sm">
                {/* Original Orientation Display */}
                <img 
                  src={img.url} 
                  alt={`${item.name} - ${idx + 1}`}
                  className="w-full h-auto block shadow-2xl"
                  loading={idx === 0 ? "eager" : "lazy"}
                />
                
                {/* Subtle Overlay on Hover */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </div>
              
              {/* Image Caption / Index */}
              <div className="mt-6 flex items-center justify-between text-white/20 font-mono text-[10px] uppercase tracking-[0.3em]">
                <span>Plate {String(idx + 1).padStart(2, '0')}</span>
                <div className="flex items-center gap-4">
                  <a 
                    href={img.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors flex items-center gap-2 pointer-events-auto"
                  >
                    <Maximize2 className="w-3 h-3" /> View Full Size
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- FOOTER NAV --- */}
      <footer className="py-32 border-t border-white/5 text-center">
        <div className="max-w-xl mx-auto px-6">
          <h3 className="text-2xl font-light uppercase tracking-tighter mb-8">End of Series</h3>
          <Link 
            href="/gallery" 
            className="inline-block px-12 py-4 bg-white text-black text-xs font-bold uppercase tracking-[0.3em] hover:bg-white/90 transition-all"
          >
            Back to Collection
          </Link>
        </div>
      </footer>
    </main>
  );
}
