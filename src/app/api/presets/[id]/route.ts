import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../../lib/auth";
import getDatabase, { ensurePresetIndexes } from "../../../../lib/mongodb";
import { uploadImages } from "../../../../lib/cloudinary";
import cloudinary from "../../../../lib/cloudinary";
import { clearCache } from '../../../../lib/simpleCache';
import { ObjectId } from "mongodb";
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
    let images: { url: string; public_id: string }[] = Array.isArray(existing.images) ? existing.images : [];
  let removePublicIds: string[] = [];
  let newDng: File | null = null;
    let toUpload: string[] = [];

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      if (form.has('name')) name = String(form.get('name') || name);
      if (form.has('description')) description = String(form.get('description') || description);
      if (form.has('prompt')) prompt = String(form.get('prompt') || prompt);
      if (form.has('tags')) {
        const raw = form.get('tags');
        if (typeof raw === 'string') tags = raw.split(',').map(s=>s.trim()).filter(Boolean);
      }
      removePublicIds = (form.getAll('removePublicIds').filter(v=>typeof v==='string') as string[]);
      const urlList = form.getAll('imageUrls').filter((v) => typeof v === 'string') as string[];
      toUpload.push(...urlList);
  // Optional: allow replacing DNG
  const maybeDng = form.get('dng');
  if (maybeDng instanceof File) newDng = maybeDng;
  const files = form.getAll('images') as File[];
  for (const file of files.slice(0, 8)) {
        const buf = Buffer.from(await file.arrayBuffer());
        const b64 = `data:${file.type || 'image/png'};base64,${buf.toString('base64')}`;
        toUpload.push(b64);
      }
    } else if (contentType.includes('application/json')) {
      const body = await req.json();
      if (typeof body.name === 'string') name = body.name;
      if (typeof body.description === 'string') description = body.description;
      if (typeof body.prompt === 'string') prompt = body.prompt;
      if (Array.isArray(body.tags)) tags = body.tags; else if (typeof body.tags === 'string') tags = body.tags.split(',').map((s:string)=>s.trim()).filter(Boolean);
      if (Array.isArray(body.removePublicIds)) removePublicIds = body.removePublicIds;
      if (Array.isArray(body.images)) toUpload = body.images;
    }

  // Remove requested images both from Cloudinary and local array
  if (removePublicIds.length) {
      for (const pid of removePublicIds) {
    try { await cloudinary.uploader.destroy(pid); } catch {}
      }
      images = images.filter(img => !removePublicIds.includes(img.public_id));
    }

  // Upload any new images
    if (toUpload.length) {
      const uploaded = await uploadImages(toUpload.slice(0, 8));
      images.push(...uploaded.map(u => ({ url: u.url, public_id: u.public_id })));
    }

    // Replace DNG if provided
    if (newDng) {
      try {
        const buf = Buffer.from(await newDng.arrayBuffer());
        const uploadOpts: UploadApiOptions = { resource_type: 'auto', folder: 'photogen/presets/dngs', filename_override: newDng.name, unique_filename: true, overwrite: false };
        const up: UploadApiResponse = await cloudinary.uploader.upload(`data:application/octet-stream;base64,${buf.toString('base64')}`, uploadOpts);
        // delete old
        if (existing.dng?.public_id) {
          try { await cloudinary.uploader.destroy(existing.dng.public_id, { resource_type: 'raw' }); } catch {}
        }
        await coll.updateOne({ _id }, { $set: { dng: { url: up.secure_url, public_id: up.public_id, format: up.format }, images } });
        return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
      } catch {}
    }

  // set cover image to first image or null
  const cover = images.length ? images[0].url : null;
  await coll.updateOne({ _id }, { $set: { name, description, prompt, tags, images, image: cover } });
    try { clearCache(); } catch {}
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
    // delete DNG first (try raw, then image, then fallback), await result so Cloudinary is cleaned up
    const pid = existing.dng?.public_id;
    if (pid) {
      try {
        // try raw (most likely for DNG/raw uploads)
        let res = await cloudinary.uploader.destroy(pid, { resource_type: 'raw', invalidate: true });
        if (!(res && (res.result === 'ok' || res.result === 'not_found'))) {
          // try as image
          res = await cloudinary.uploader.destroy(pid, { resource_type: 'image', invalidate: true });
        }
        if (!(res && (res.result === 'ok' || res.result === 'not_found'))) {
          // final fallback: try without resource_type
          await cloudinary.uploader.destroy(pid, { invalidate: true }).catch(() => null);
        }
      } catch (err) {
        // Keep best-effort behavior but surface to logs for debugging
        console.error('Failed to delete DNG from Cloudinary for preset', id, err);
      }
    }

    // delete images in parallel (best-effort)
    const imgDeletes = images.map((img) => img.public_id ? cloudinary.uploader.destroy(img.public_id, { invalidate: true }).catch(() => null) : Promise.resolve(null));
    await Promise.allSettled(imgDeletes);

    await coll.deleteOne({ _id });
    // clear in-memory cache so list endpoints reflect deletion immediately
    try { clearCache(); } catch {}
    return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
  } catch (_err: unknown) {
    const message = _err instanceof Error ? _err.message : String(_err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
