import React, { cache } from 'react';
import { ObjectId } from 'mongodb';
import Link from 'next/link';
import { ArrowLeft, Download, Hash, Info, Layers, AlertCircle, Camera, CheckCircle2 } from 'lucide-react';
import getDatabase from '../../../lib/mongodb';
import ImageWithLqip from '../../../components/ImageWithLqip';
import GalleryImageGrid from '../../../components/GalleryImageGrid';
import Carousel from '../../../components/Carousel';
import LiquidRiseCTA from '../../../components/LiquidRiseCTA';
import ScrollToTop from '../../../components/ScrollToTop';

// --- TYPES ---
type PresetDoc = {
  _id: ObjectId;
  name?: string;
  description?: string;
  images?: { url: string; public_id: string }[];
  tags?: string[];
  dng?: { url: string; public_id?: string; format?: string } | null;
  category?: string; // Adding for consistent mapping
};

// --- DATABASE HELPERS ---
function isValidObjectId(id: string) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

const getPreset = cache(async (id: string) => {
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
});

// --- SSG / ISR CONFIG ---
export const revalidate = false; // On-demand revalidation only

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
    return { title: 'Asset Not Found | PhotoGen' };
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
  const resolvedParams = await params;
  const id = resolvedParams?.id || '';
  const preset = await getPreset(id);

  // --- 404 STATE ---
  if (!preset) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground space-y-6">
        <Layers className="w-16 h-16 text-muted-foreground/60" />
        <div className="text-center">
          <h2 className="text-xl font-light tracking-tighter uppercase mb-2">Asset Not Found</h2>
          <Link 
            href="/presets" 
            className="px-6 py-3 border border-border hover:bg-foreground hover:text-background text-xs font-normal uppercase tracking-[0.2em] transition-all"
          >
            Return to Index
          </Link>
        </div>
      </div>
    );
  }

  const images = Array.isArray(preset.images) ? preset.images : [];
  const carouselItems = images.map(img => ({ url: img.url, alt: preset.name }));

  return (
    <main className="min-h-screen bg-background text-foreground font-sans selection:bg-foreground/20">
      <ScrollToTop />
      
      {/* Global Grain Texture */}
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />

      <div className="max-w-[1600px] mx-auto px-[2px] md:px-8 lg:px-10 pt-28 md:pt-32 pb-10 md:pb-16 lg:pb-20 relative z-10">
        
        {/* Mobile Header: Carousel (Hidden on Desktop) */}
        <div className="block lg:hidden mb-10 w-full px-4">
          <Carousel items={carouselItems} showDots={true} showThumbs={true} autoPlay={false} />
        </div>

        {/* Main Layout Grid */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 relative items-start">
          
          {/* --- LEFT SIDEBAR (Fixed/Sticky on Desktop) --- */}
          <aside className="w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 lg:sticky lg:top-32 flex flex-col pb-10 lg:pb-0 px-4 md:px-0 order-2 lg:order-1">
            
            <div className="flex flex-col gap-10">
              {/* Back Link */}
              <Link 
                href="/presets" 
                className="group flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors duration-500 mb-4"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span className="text-[11px] uppercase tracking-[0.4em]">Back to Index</span>
              </Link>

              {/* Header: Preset Info */}
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-border/50 transition-colors">
                  {images[0] && (
                    <ImageWithLqip 
                      src={images[0].url} 
                      alt="Preset Thumbnail" 
                      fill
                      className="object-cover"
                      transformOpts={{ w: 100, q: 20 }}
                      noBlur={true}
                    />
                  )}
                </div>
                <div>
                  <h1 className="text-foreground font-normal text-[17px] tracking-tight leading-tight">{preset.name || 'Untitled'}</h1>
                  <p className="text-muted-foreground text-[14px] uppercase tracking-widest mt-1 opacity-80">Grading / Preset</p>
                </div>
              </div>

              {/* Main Description */}
              <div className="text-[1.4rem] md:text-[1.65rem] leading-[1.3] font-medium tracking-tight text-muted-foreground [&_strong]:text-foreground [&_strong]:font-semibold [&_em]:text-foreground [&_em]:italic prose-p:mb-4 last:prose-p:mb-0">
                {preset.description ? (
                  <div dangerouslySetInnerHTML={{ __html: preset.description }} />
                ) : (
                  <p>Refined color grading for cinematic visual narratives.</p>
                )}
              </div>

              {/* Action: Download */}
              <div className="flex flex-col items-start gap-6">
                <div className="flex items-center gap-2 text-muted-foreground text-[14px]">
                  <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                  Commercial License Included.
                </div>
                
                {preset.dng?.url ? (
                  <LiquidRiseCTA href={preset.dng.url}>
                    <div className="flex items-center gap-2">
                       Download Preset <Download className="w-3.5 h-3.5" />
                    </div>
                  </LiquidRiseCTA>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground text-[14px] italic opacity-50 px-6 py-3 border border-border/20 rounded-full">
                    Asset Unavailable
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="w-full h-[1px] bg-border mt-4"></div>

              {/* Technical Details */}
              <div className="mt-8 flex flex-col gap-6">
                <div>
                  <h3 className="text-foreground font-normal text-[17px] mb-3">Attributes.</h3>
                  <div className="flex flex-wrap gap-2">
                    {preset.tags && preset.tags.length > 0 ? (
                      preset.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2.5 py-1 bg-secondary/50 border border-border/50 text-[10px] uppercase tracking-wider text-muted-foreground rounded-sm"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-muted-foreground/50 font-mono tracking-widest uppercase">General</span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-8 pt-4">
                  <div>
                    <span className="text-foreground font-normal text-sm block mb-1">ID: {preset._id.toString().slice(-6).toUpperCase()}</span>
                    <span className="text-muted-foreground text-[13px] uppercase tracking-wider">Asset Hash</span>
                  </div>
                  <div>
                    <span className="text-foreground font-normal text-sm block mb-1">DNG / XMP</span>
                    <span className="text-muted-foreground text-[13px] uppercase tracking-wider">Format</span>
                  </div>
                </div>
              </div>

            </div>
          </aside>

          {/* --- RIGHT CONTENT (Desktop: Masonry Grid, Hidden on Mobile for images as they are in carousel) --- */}
          <main className="flex-1 hidden lg:block overflow-hidden order-1 lg:order-2">
            <GalleryImageGrid images={images} userName={preset.name || 'User'} />
          </main>
        </div>
      </div>

    </main>
  );
}