import React from 'react';
import { ObjectId } from 'mongodb';
import getDatabase from '../../lib/mongodb';
import type { GalleryDoc } from '../api/gallery/route';
import GalleryClientShell from '@/app/gallery/GalleryClientShell';

// --- SSR CONFIG ---
export const revalidate = false; // On-demand revalidation only

// Fetch initial gallery data server-side (no client round-trip needed)
async function getInitialGalleryData() {
  try {
    const db = await getDatabase();
    const coll = db.collection<GalleryDoc>('gallery');

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
    console.error('Gallery SSR fetch error:', e);
    return { items: [], total: 0 };
  }
}

export default async function GalleryPage() {
  const { items, total } = await getInitialGalleryData();

  return <GalleryClientShell initialItems={items} totalCount={total} />;
}
