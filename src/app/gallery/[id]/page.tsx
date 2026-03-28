import React, { cache } from 'react';
import { ObjectId } from 'mongodb';
import Link from 'next/link';
import { ArrowLeft, MapPin, Camera, Info, Calendar, User, Maximize2, Star } from 'lucide-react';
import getDatabase from '../../../lib/mongodb';
import ImageWithLqip from '../../../components/ImageWithLqip';
import GalleryImageGrid from '../../../components/GalleryImageGrid';
import type { GalleryDoc } from '../../api/gallery/route';
import LiquidRiseCTA from '../../../components/LiquidRiseCTA';
import LogoMarquee from '../../../components/LogoMarquee';

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground space-y-6">
        <Camera className="w-16 h-16 text-muted-foreground/60" />
        <div className="text-center">
          <h2 className="text-xl font-light tracking-tighter uppercase mb-2">Item Not Found</h2>
          <Link 
            href="/gallery" 
            className="px-6 py-3 border border-border hover:bg-foreground hover:text-background text-xs font-normal uppercase tracking-[0.2em] transition-all"
          >
            Return to Gallery
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <main className="min-h-screen bg-background text-foreground font-sans selection:bg-foreground/20">
      <div className="max-w-[1600px] mx-auto px-[2px] md:px-8 lg:px-10 pt-28 md:pt-32 pb-4 md:pb-8 lg:pb-10">
        
        {/* Main Layout Grid */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 relative items-start">
          
          {/* --- LEFT SIDEBAR (Fixed/Sticky on Desktop) --- */}
          <aside className="w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 lg:sticky lg:top-32 flex flex-col pb-10 lg:pb-0 px-4 md:px-0">
            
            <div className="flex flex-col gap-10">
              {/* Back to Gallery */}
              <Link 
                href="/gallery" 
                className="group flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors duration-500 mb-4"
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
                  <h1 className="text-foreground font-normal text-[17px] tracking-tight leading-tight">{item.name}</h1>
                  <p className="text-muted-foreground text-[14px] uppercase tracking-widest mt-1 opacity-80">{item.category}</p>
                </div>
              </div>

              {/* Main Description */}
              <div className="prose prose-invert max-w-none text-[1.4rem] md:text-[1.65rem] leading-[1.3] font-medium tracking-tight text-muted-foreground [&_strong]:text-foreground [&_strong]:font-semibold [&_em]:text-foreground [&_em]:italic prose-p:mb-4 last:prose-p:mb-0 prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5 prose-li:mb-1 prose-li:marker:text-muted-foreground/50">
                {item.description ? (
                  <div dangerouslySetInnerHTML={{ __html: item.description }} />
                ) : (
                  <p>Capturing visual stories through light and shadow.</p>
                )}
              </div>

              {/* Availability & Action */}
              <div className="flex flex-col items-start gap-6">
                <div className="flex items-center gap-2 text-muted-foreground text-[14px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                  Professional prints available upon request.
                </div>
                
                <LiquidRiseCTA href="/contact">Inquiry</LiquidRiseCTA>
              </div>

              {/* Divider */}
              <div className="w-full h-[1px] bg-border mt-4"></div>

              {/* Editorial Logos */}
              <div className="w-full">
                <LogoMarquee variant="sidebar" />
              </div>

              {/* Technical Details */}
              <div className="mt-8 flex flex-col gap-6">
                <div>
                  <h3 className="text-foreground font-normal text-[17px] mb-3">About this series.</h3>
                  <p className="text-muted-foreground text-[15px] leading-relaxed max-w-[95%] font-light">
                    This collection was curated to showcase the intersection of environmental context and human narrative. 
                    {item.location && ` Captured in ${item.location}. `}
                    {item.photographer && ` Produced by ${item.photographer}.`}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <span className="text-foreground font-normal text-sm block mb-1">{item.images.length}+ Assets</span>
                    <span className="text-muted-foreground text-[13px] uppercase tracking-wider">High-Res Plates</span>
                  </div>
                  {item.equipment && (
                    <div>
                      <span className="text-foreground font-normal text-sm block mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
                        {item.equipment.split(' ')[0]}
                      </span>
                      <span className="text-muted-foreground text-[13px] uppercase tracking-wider">Primary Optic</span>
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
        <div className="pointer-events-auto shadow-2xl rounded-full">
          <LiquidRiseCTA href="/contact">Book a Session</LiquidRiseCTA>
        </div>
        <button className="pointer-events-auto bg-card/80 backdrop-blur-xl text-muted-foreground font-normal text-[10px] uppercase tracking-widest px-6 py-3 rounded-full border border-border shadow-2xl hover:text-foreground transition-all">
          Shared with PhotoGen
        </button>
      </div>
    </main>
  );
}


