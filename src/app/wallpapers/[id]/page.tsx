import React, { cache } from 'react';
import { ObjectId } from 'mongodb';
import Link from 'next/link';
import { Monitor } from 'lucide-react';
import getDatabase from '../../../lib/mongodb';
import type { WallpaperDoc } from '../../api/wallpapers/route';
import WallpaperDetailClient from './WallpaperDetailClient';

// --- TYPES ---
interface WallpaperItem extends Omit<WallpaperDoc, '_id'> {
  _id: string;
}

// --- DATABASE HELPERS ---
function isValidObjectId(id: string) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

const getWallpaperItem = cache(async (id: string) => {
  if (!id || !isValidObjectId(id)) return null;
  try {
    const db = await getDatabase();
    const coll = db.collection<WallpaperDoc>('wallpapers');
    const doc = await coll.findOne({ _id: new ObjectId(id) });
    if (!doc) return null;
    
    // Serialize for Client Component
    return {
      ...doc,
      _id: doc._id.toString()
    } as WallpaperItem;
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
    const items = await db.collection('wallpapers').find({ visibility: 'public' }, { projection: { _id: 1 } }).toArray();
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
  const item = await getWallpaperItem(id);
  
  if (!item) {
    return { title: 'Wallpaper Not Found | PhotoGen' };
  }

  return {
    title: `${item.name} | PhotoGen Wallpapers`,
    description: item.description || 'Download high quality wallpaper.',
    openGraph: {
      images: item.images?.[0]?.url ? [item.images[0].url] : [],
    },
  };
}

// --- MAIN PAGE COMPONENT (SERVER) ---
export default async function WallpaperDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams?.id || '';
  const item = await getWallpaperItem(id);

  if (!item || item.visibility === 'private') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground space-y-8 px-6">
        <Monitor className="w-20 h-20 text-muted-foreground/20" />
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-light tracking-tighter uppercase">Wallpaper Not Found</h2>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">The requested piece might have been moved or is no longer available in our public gallery.</p>
          <div className="pt-4">
            <Link 
              href="/wallpapers" 
              className="inline-flex h-12 items-center justify-center px-8 border border-border hover:bg-foreground hover:text-background text-[10px] uppercase tracking-[0.2em] transition-all duration-500 font-medium"
            >
              Back to Collection
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  const mainImage = item.images[0];
  if (!mainImage) return null;

  // Cloudinary download URL
  const downloadUrl = mainImage.url.includes('/upload/') 
    ? mainImage.url.replace('/upload/', `/upload/fl_attachment:${encodeURIComponent(item.name.replace(/[^a-zA-Z0-9-]/g, '_'))}/`)
    : mainImage.url;

  let prevId: string | undefined;
  let nextId: string | undefined;

  try {
    const db = await getDatabase();
    const allItems = await db.collection('wallpapers').find({ visibility: 'public' }, { projection: { _id: 1 } }).toArray();
    const currentIndex = allItems.findIndex(w => w._id.toString() === id);
    if (currentIndex !== -1 && allItems.length > 1) {
      prevId = currentIndex > 0 ? allItems[currentIndex - 1]._id.toString() : allItems[allItems.length - 1]._id.toString();
      nextId = currentIndex < allItems.length - 1 ? allItems[currentIndex + 1]._id.toString() : allItems[0]._id.toString();
    }
  } catch (e) {
    console.error("Failed to fetch adjacent wallpapers", e);
  }

  return (
    <WallpaperDetailClient 
        item={item} 
        downloadUrl={downloadUrl} 
        prevId={prevId}
        nextId={nextId}
    />
  );
}
