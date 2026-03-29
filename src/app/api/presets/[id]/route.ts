import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/auth";
import getDatabase, { ensurePresetIndexes } from "../../../../lib/mongodb";
import { uploadImages } from "../../../../lib/cloudinary";
import cloudinary from "../../../../lib/cloudinary";
import { delCachePrefix } from '../../../../lib/simpleCache';
import { ObjectId } from "mongodb";
import { revalidatePath } from 'next/cache';
import type { UploadApiOptions, UploadApiResponse } from 'cloudinary';

type PresetDoc = {
  _id: ObjectId;
  name?: string;
  description?: string;
  prompt?: string;
  tags?: string[];
  images?: { url: string; public_id: string }[];
  dng?: { url: string; public_id: string; format?: string } | null;
};

export async function PATCH(req: Request, { params }: { params?: { id: string } | Promise<{ id: string }> }) {
  try {
    if (!isAdminRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    const p = (await (params as Promise<{ id: string }> | { id: string } | undefined)) || { id: '' };
    const { id } = p;
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    const _id = new ObjectId(id);

    const db = await getDatabase();
    await ensurePresetIndexes(db.databaseName);
    const coll = db.collection("presets");
    const existing = (await coll.findOne({ _id }, { projection: { name: 1, description: 1, prompt: 1, tags: 1, images: 1, dng: 1 } })) as PresetDoc | null;
    if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const contentType = req.headers.get('content-type') || '';
    let name = existing.name as string;
    let description = existing.description || '';
    let prompt = existing.prompt || '';
    let tags: string[] = Array.isArray(existing.tags) ? existing.tags : [];
    let imagesRaw: (string | { url: string; public_id: string })[] = [];
    let removePublicIds: string[] = [];
    let newDngUrl: string | null = null;
    let toUpload: string[] = [];
    let orderPublicIdsManual: string[] = [];

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      if (form.has('name')) name = String(form.get('name') ?? name);
      if (form.has('description')) description = String(form.get('description') ?? '');
      if (form.has('prompt')) prompt = String(form.get('prompt') ?? '');
      if (form.has('tags')) {
        const raw = form.get('tags');
        if (typeof raw === 'string') tags = raw.split(',').map(s=>s.trim()).filter(Boolean);
      }
      removePublicIds = (form.getAll('removePublicIds').filter(v=>typeof v==='string') as string[]);
      const orderPublicIds = (form.getAll('orderPublicIds').filter(v=>typeof v==='string') as string[]);
      if (orderPublicIds.length) orderPublicIdsManual = orderPublicIds;
      
      const urlList = form.getAll('imageUrls').filter((v) => typeof v === 'string') as string[];
      // allow callers to send JSON-stringified objects { public_id, url }
      const parsed = urlList.map((s) => {
        try { 
          const obj = JSON.parse(s);
          if (obj && typeof obj.url === 'string' && typeof obj.public_id === 'string') return obj;
          return s;
        } catch { return s; }
      });
      imagesRaw.push(...parsed);

      const maybeDngUrl = form.get('dngUrl') || form.get('dngurl') || form.get('dng_url');
      if (maybeDngUrl && typeof maybeDngUrl === 'string') newDngUrl = String(maybeDngUrl).trim();

      const files = form.getAll('images') as File[];
      for (const file of files.slice(0, 8)) {
        const buf = Buffer.from(await file.arrayBuffer());
        const b64 = `data:${file.type || 'image/png'};base64,${buf.toString('base64')}`;
        imagesRaw.push(b64);
      }
    } else if (contentType.includes('application/json')) {
      const body = await req.json();
      if (typeof body.name === 'string') name = body.name;
      if (typeof body.description === 'string') description = body.description;
      if (typeof body.prompt === 'string') prompt = body.prompt;
      if (Array.isArray(body.tags)) tags = body.tags; else if (typeof body.tags === 'string') tags = body.tags.split(',').map((s:string)=>s.trim()).filter(Boolean);
      if (Array.isArray(body.removePublicIds)) removePublicIds = body.removePublicIds;
      if (Array.isArray(body.images)) imagesRaw = body.images;
      if (typeof body.dngUrl === 'string') newDngUrl = body.dngUrl.trim();
      if (Array.isArray(body.orderPublicIds)) orderPublicIdsManual = body.orderPublicIds;
    }

    // Helper to identify already-uploaded image objects
    function isUploadedObj(v: any): v is { public_id: string; url: string } {
      return v && typeof v === 'object' && typeof v.url === 'string' && typeof v.public_id === 'string';
    }

    // Remove requested images from Cloudinary (best effort)
    if (removePublicIds.length) {
      for (const pid of removePublicIds) {
        try { await cloudinary.uploader.destroy(pid); } catch {}
      }
    }

    // Separate already-uploaded from new-to-upload
    let finalImages: { url: string; public_id: string }[] = imagesRaw.filter(isUploadedObj);
    const toUploadRaw = imagesRaw.filter((it): it is string => typeof it === 'string' && it.length > 0);

    // Upload new ones
    if (toUploadRaw.length) {
      const uploaded = await uploadImages(toUploadRaw.slice(0, 8));
      finalImages.push(...uploaded.map(u => ({ url: u.url, public_id: u.public_id })));
    }

    // Apply manual ordering if provided
    if (orderPublicIdsManual.length && finalImages.length) {
      const map = new Map(finalImages.map(img => [img.public_id, img] as const));
      const picked: { url: string; public_id: string }[] = [];
      for (const pid of orderPublicIdsManual) {
        if (map.has(pid)) { 
          picked.push(map.get(pid)!); 
          map.delete(pid); 
        }
      }
      // append any remaining that weren't in the explicit order list
      const remaining = finalImages.filter(img => map.has(img.public_id));
      finalImages = [...picked, ...remaining];
    }

    // Determine the final DNG object
    const finalDng = newDngUrl 
      ? { url: newDngUrl, public_id: '' } 
      : (existing.dng || null);

    // If new DNG URL was provided, attempt to destroy old Cloudinary entry if it existed
    if (newDngUrl && existing.dng?.public_id) {
      try { await cloudinary.uploader.destroy(existing.dng.public_id, { resource_type: 'raw' }); } catch {}
    }

    // set cover image to first image or null
    const cover = finalImages.length ? finalImages[0].url : null;
    
    await coll.updateOne({ _id }, { 
      $set: { 
        name: name || '', 
        description: description || '', 
        prompt: prompt || '', 
        tags: Array.isArray(tags) ? tags : [], 
        images: finalImages, 
        image: cover,
        dng: finalDng
      } 
    });
    
    try { delCachePrefix('presets:'); } catch {}
    revalidatePath('/');
    revalidatePath('/presets');
    revalidatePath(`/presets/${id}`);
    return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params?: { id: string } | Promise<{ id: string }> }) {
  try {
    if (!isAdminRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    const p = (await (params as Promise<{ id: string }> | { id: string } | undefined)) || { id: '' };
    const { id } = p;
    if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    const _id = new ObjectId(id);

  const db = await getDatabase();
  await ensurePresetIndexes(db.databaseName);
    const coll = db.collection("presets");
  const existing = (await coll.findOne({ _id })) as PresetDoc | null;
    if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    const images: { public_id: string }[] = Array.isArray(existing.images) ? existing.images : [];

    // Delete from DB first (authoritative state), then Cloudinary (best-effort cleanup)
    await coll.deleteOne({ _id });

    // delete DNG (best effort, after DB deletion)
    const pid = existing.dng?.public_id;
    if (pid) {
      try {
        let res = await cloudinary.uploader.destroy(pid, { resource_type: 'raw', invalidate: true });
        if (!(res && (res.result === 'ok' || res.result === 'not_found'))) {
          res = await cloudinary.uploader.destroy(pid, { resource_type: 'image', invalidate: true });
        }
        if (!(res && (res.result === 'ok' || res.result === 'not_found'))) {
          await cloudinary.uploader.destroy(pid, { invalidate: true }).catch(() => null);
        }
      } catch (err) {
        console.error('Failed to delete DNG from Cloudinary for preset', id, err);
      }
    }

    // delete images in parallel (best-effort)
    const imgDeletes = images.map((img) => img.public_id ? cloudinary.uploader.destroy(img.public_id, { invalidate: true }).catch(() => null) : Promise.resolve(null));
    await Promise.allSettled(imgDeletes);
    // clear in-memory cache so list endpoints reflect deletion immediately
    try { delCachePrefix('presets:'); } catch {}
    revalidatePath('/');
    revalidatePath('/presets');
    revalidatePath(`/presets/${id}`);
    return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
  } catch (_err: unknown) {
    const message = _err instanceof Error ? _err.message : String(_err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
