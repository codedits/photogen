import React from 'react';
import getDatabase from '../../lib/mongodb';
import type { WallpaperDoc } from '../api/wallpapers/route';
import GalleryClientShell from '@/app/gallery/GalleryClientShell';

// --- SSR CONFIG ---
export const revalidate = false; // On-demand revalidation only

// Fetch initial wallpaper data server-side (no client round-trip needed)
async function getInitialWallpaperData() {
  try {
    const db = await getDatabase();
    const coll = db.collection<WallpaperDoc>('wallpapers');

    const INITIAL_LIMIT = 14;

    // Fetch items and total count in parallel
    const [items, total] = await Promise.all([
      coll.find({ visibility: 'public' })
        .sort({ uploadDate: -1 })
        .limit(INITIAL_LIMIT)
        .toArray(),
      coll.countDocuments({ visibility: 'public' })
    ]);

    // Serialize ObjectIds to strings for client consumption
    const serializedItems = items.map(item => ({
      ...item,
      _id: item._id!.toString(),
    }));

    return { items: serializedItems, total };
  } catch (e) {
    console.error('Wallpaper SSR fetch error:', e);
    return { items: [], total: 0 };
  }
}

export default async function WallpapersPage() {
  const { items, total } = await getInitialWallpaperData();

  return (
    <GalleryClientShell 
      initialItems={items as any} 
      totalCount={total} 
      headerText="Wallpapers / Downloads"
      apiUrl="/api/wallpapers"
      basePath="/wallpapers"
    />
  );
}
