import React from 'react';
import { ObjectId } from 'mongodb';
import Link from 'next/link';
import { ArrowLeft, MapPin, Camera, Info, Calendar, User, Maximize2, Star } from 'lucide-react';
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
      <nav className="fixed top-0 left-0 w-full h-24 px-6 md:px-12 z-50 flex items-center justify-between pointer-events-none">
        <Link 
          href="/gallery" 
          className="group flex items-center gap-3 px-6 py-3 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-full hover:bg-white hover:text-black transition-all duration-500 pointer-events-auto shadow-2xl"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Collection</span>
        </Link>
      </nav>

      {/* --- HERO HEADER --- */}
      <header className="relative min-h-[70vh] flex flex-col justify-end pt-40 pb-24 px-6 md:px-12 overflow-hidden">
        {/* Background Image (Blurred) */}
        <div className="absolute inset-0 z-0">
          <ImageWithLqip
            src={item.images[0].url}
            alt=""
            fill
            className="object-cover opacity-20 blur-3xl scale-110"
            transformOpts={{ w: 100, q: 10 }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-16">
            <div className="max-w-4xl">
              <div className="flex items-center gap-4 mb-8 animate-in slide-in-from-bottom-4 duration-700">
                <span className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-[0.3em] text-white/60 font-medium">
                  {item.category}
                </span>
                {item.featured && (
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-[10px] uppercase tracking-[0.3em] text-yellow-500 font-medium">
                    <Star className="w-3 h-3 fill-yellow-500" />
                    <span>Featured Work</span>
                  </div>
                )}
              </div>
              
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-light tracking-tighter uppercase mb-10 leading-[0.85] animate-in slide-in-from-bottom-8 duration-1000 delay-100">
                {item.name.split(' ').map((word, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <br className="hidden md:block" />}
                    <span className={i % 2 === 1 ? 'text-white/30' : 'text-white'}>{word} </span>
                  </React.Fragment>
                ))}
              </h1>

              {item.description && (
                <p className="text-xl md:text-2xl text-white/50 font-light leading-relaxed max-w-2xl animate-in slide-in-from-bottom-4 duration-1000 delay-300">
                  {item.description}
                </p>
              )}
            </div>

            {/* Technical Specs Sidebar */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-x-12 gap-y-10 border-l border-white/10 pl-8 lg:pl-16 animate-in slide-in-from-right-8 duration-1000 delay-500">
              {item.location && (
                <div>
                  <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-white/20 mb-3 font-bold">
                    <MapPin className="w-3 h-3" /> Location
                  </span>
                  <span className="text-lg font-light tracking-tight">{item.location}</span>
                </div>
              )}
              {item.photographer && (
                <div>
                  <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-white/20 mb-3 font-bold">
                    <User className="w-3 h-3" /> Artist
                  </span>
                  <span className="text-lg font-light tracking-tight">{item.photographer}</span>
                </div>
              )}
              {item.equipment && (
                <div className="col-span-2 lg:col-span-1">
                  <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-white/20 mb-3 font-bold">
                    <Camera className="w-3 h-3" /> Equipment
                  </span>
                  <span className="text-sm font-light text-white/60 leading-relaxed">{item.equipment}</span>
                </div>
              )}
              {item.metadata && (
                <div className="col-span-2 lg:col-span-1 flex gap-12">
                  {item.metadata.aperture && (
                    <div>
                      <span className="block text-[10px] uppercase tracking-[0.4em] text-white/20 mb-3 font-bold">Aperture</span>
                      <span className="text-sm font-mono text-white/80">{item.metadata.aperture}</span>
                    </div>
                  )}
                  {item.metadata.shutter && (
                    <div>
                      <span className="block text-[10px] uppercase tracking-[0.4em] text-white/20 mb-3 font-bold">Shutter</span>
                      <span className="text-sm font-mono text-white/80">{item.metadata.shutter}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* --- IMAGE SHOWCASE --- */}
      <section className="py-32 px-6 md:px-12 bg-[#050505]">
        <div className="max-w-7xl mx-auto columns-1 md:columns-2 gap-16 space-y-16">
          {item.images.map((img, idx) => (
            <div 
              key={idx} 
              className={`relative group break-inside-avoid transition-all duration-700 hover:z-10 ${
                idx % 4 === 0 ? 'md:mt-24' : 
                idx % 4 === 1 ? 'md:mt-0' : 
                idx % 4 === 2 ? 'md:mt-12' : 'md:mt-32'
              }`}
            >
              <div className="relative overflow-hidden bg-neutral-900 rounded-sm shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] group-hover:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)] transition-all duration-500">
                <ImageWithLqip
                  src={img.url} 
                  alt={`${item.name} - ${idx + 1}`}
                  width={1200}
                  height={1600}
                  className="w-full h-auto block transition-transform duration-[2s] ease-out group-hover:scale-110"
                  transformOpts={{ w: 1200, q: 'auto:best' }}
                  priority={idx < 2}
                />
                
                {/* Subtle Overlay on Hover */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                
                {/* Quick Actions */}
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                  <a 
                    href={img.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-3 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white hover:bg-white hover:text-black transition-all"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </a>
                </div>
              </div>
              
              {/* Image Caption */}
              <div className="mt-6 flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                  <span className="text-white/10 font-mono text-[9px] uppercase tracking-[0.4em]">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div className="h-px w-8 bg-white/5" />
                  <span className="text-white/30 text-[9px] uppercase tracking-[0.2em] font-light">
                    {item.name}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- FOOTER NAV --- */}
      <footer className="py-48 border-t border-white/5 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
           <h2 className="text-[30vw] font-black uppercase tracking-tighter leading-none select-none">
             {item.category}
           </h2>
        </div>
        
        <div className="relative z-10 max-w-2xl mx-auto px-6">
          <div className="w-px h-24 bg-gradient-to-b from-white/20 to-transparent mx-auto mb-12" />
          <h3 className="text-3xl md:text-4xl font-light uppercase tracking-tighter mb-12">End of Series</h3>
          <Link 
            href="/gallery" 
            className="group relative inline-flex items-center justify-center px-16 py-5 bg-white text-black text-[10px] font-bold uppercase tracking-[0.4em] overflow-hidden transition-all hover:scale-105 active:scale-95"
          >
            <span className="relative z-10">Back to Collection</span>
            <div className="absolute inset-0 bg-neutral-200 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
          </Link>
        </div>
      </footer>
    </main>
  );
}
