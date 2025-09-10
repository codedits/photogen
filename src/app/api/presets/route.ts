import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../lib/auth";
import getDatabase, { ensurePresetIndexes } from "../../../lib/mongodb";
import { uploadImages, uploadFile } from "../../../lib/cloudinary";
import { ObjectId, Document } from 'mongodb';
import type { CloudinaryUploaded } from '../../../lib/cloudinary';
import type { Filter } from 'mongodb';
import { getCache, setCache } from '../../../lib/simpleCache';

type PresetDoc = {
  _id: ObjectId;
  name?: string;
  description?: string;
  prompt?: string;
  tags?: string[];
  image?: string | null;
  images?: { url: string; public_id: string }[];
  createdAt?: Date;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    // Pagination (page is 1-based). We support simple skip/limit for now; for very large
    // collections a cursor approach (_id based) could replace this without much surface change.
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);
  const limitRaw = parseInt(searchParams.get('limit') || '20', 10);
  // enforce a maximum of 20 items per page to keep card grids consistent
  const limit = Math.min(Math.max(limitRaw || 20, 1), 20); // cap at 20
    const limitPlusOne = limit + 1; // fetch one extra to compute hasMore cheaply
    const cachingEligible = !q && page === 1; // only cache the first unfiltered page
    const cacheKey = `presets:q=${q}:page=${page}:limit=${limit}`;
    if (cachingEligible) {
      const cached = getCache<{ ok: boolean; presets: unknown[]; hasMore: boolean; page: number; limit: number }>(cacheKey);
      if (cached) return NextResponse.json(cached, { headers: { 'cache-control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=120' } });
    }
    const db = await getDatabase();
    await ensurePresetIndexes(db.databaseName);
    const coll = db.collection("presets");
    let filter: Filter<Document> = {};
    const createdSort = { createdAt: -1 } as const;
    let projection: Record<string, 0 | 1 | { $meta: string }> = { name: 1, description: 1, prompt: 1, tags: 1, image: 1, images: 1, createdAt: 1 };
    if (q) {
      // First try MongoDB text search (uses the text index created in ensurePresetIndexes)
      // This handles relevance ranking for multi-word queries.
      filter = { $text: { $search: q } } as Filter<Document>;
      projection = { ...projection, score: { $meta: "textScore" } } as Record<string, 0 | 1 | { $meta: string }>;
      const textDocs = await coll
        .find(filter, { projection })
        .sort({ score: { $meta: 'textScore' } } as unknown as Document)
        .skip((page - 1) * limit)
        .limit(limitPlusOne)
        .toArray();
      if (textDocs.length) {
        // If text search returned results, use them (most relevant)
        const out = textDocs.map((d) => {
          const doc = d as PresetDoc & { score?: number };
          return {
            id: doc._id.toString(),
            name: doc.name,
            description: doc.description,
            prompt: doc.prompt,
            tags: doc.tags || [],
            image: doc.image || null,
            images: Array.isArray(doc.images) ? doc.images : undefined,
            createdAt: doc.createdAt,
          };
        });
        const hasMore = out.length > limit;
        const sliced = hasMore ? out.slice(0, limit) : out;
        const resp = { ok: true, presets: sliced, hasMore, page, limit };
        // For search queries we don't long-cache; short no-store so clients controlled by SWR-like layer.
        return NextResponse.json(resp, { headers: { 'cache-control': 'no-store' } });
      }

      // If no text results, fall back to a more permissive name/tags search using
      // case-insensitive regex matching. This handles partial matches and tag queries
      // that may not be tokenized by text search. Regex queries are less index-friendly
      // but are a reasonable fallback for interactive search.
      // Build a safe regex from user input.
      const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&");
      const qEsc = escapeRegex(q);
      const tokens = q.split(/\s+/).map((t) => t.trim()).filter(Boolean);
      const tagRegexes = tokens.map((t) => new RegExp(escapeRegex(t), 'i'));
      filter = {
        $or: [
          { name: { $regex: qEsc, $options: 'i' } },
          // match any tag that contains one of the tokens (case-insensitive)
          ...(tagRegexes.length ? tagRegexes.map((r) => ({ tags: { $elemMatch: r } })) : []),
        ],
      } as Filter<Document>;
    }
    const docs = await coll
      .find(filter, { projection })
      .sort(q ? createdSort : createdSort)
      .skip((page - 1) * limit)
      .limit(limitPlusOne)
      .toArray();
    const out = docs.map((d) => {
      const doc = d as PresetDoc;
      return {
        id: doc._id.toString(),
        name: doc.name,
        description: doc.description,
        prompt: doc.prompt,
        tags: doc.tags || [],
        image: doc.image || null,
        images: Array.isArray(doc.images) ? doc.images : undefined,
        createdAt: doc.createdAt,
      };
    });
    const hasMore = out.length > limit;
    const sliced = hasMore ? out.slice(0, limit) : out;
    const resp = { ok: true, presets: sliced, hasMore, page, limit };
    if (cachingEligible) {
      // cache short-lived to improve repeated load latency
      setCache(cacheKey, resp, 10);
      return NextResponse.json(resp, { headers: { 'cache-control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=120' } });
    }
    return NextResponse.json(resp, { headers: { 'cache-control': q ? 'no-store' : 'no-store' } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
  // require admin
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  // Ensure indexes before inserting
  const dbForIdx = await getDatabase();
  await ensurePresetIndexes(dbForIdx.databaseName);
    const contentType = req.headers.get('content-type') || '';
    let name = '';
    let description = '';
    let prompt = '';
    let tags: string[] = [];
  type ImageRef = string | { public_id?: string; url?: string };
  let imagesRaw: ImageRef[] = [];
  let uploadedDng: CloudinaryUploaded | undefined = undefined;

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      name = String(form.get('name') || '');
      description = String(form.get('description') || '');
      prompt = String(form.get('prompt') || '');
      const rawTags = form.get('tags');
      if (typeof rawTags === 'string') tags = rawTags.split(',').map((s) => s.trim()).filter(Boolean);
      const urlList = form.getAll('imageUrls').filter((v) => typeof v === 'string') as string[];
      // allow callers to send JSON-stringified objects { public_id, url }
      const parsed = urlList.map((s) => {
        try { return JSON.parse(s) as ImageRef; } catch { return s as ImageRef; }
      });
      imagesRaw.push(...parsed);
      // DNG download URL is required (field name: dngUrl)
      const dngUrlField = form.get('dngUrl') || form.get('dngurl') || form.get('dng_url');
      if (!dngUrlField || typeof dngUrlField !== 'string' || !dngUrlField.trim()) {
        return NextResponse.json({ ok: false, error: 'Missing required DNG download URL (field name: dngUrl)' }, { status: 400 });
      }
      const dngUrl = String(dngUrlField).trim();
      // We no longer upload DNGs to Cloudinary; store the provided URL as the dng entry
      uploadedDng = { url: dngUrl, public_id: '', width: undefined, height: undefined, format: undefined } as unknown as CloudinaryUploaded;
  // store as a separate field later
        const files = form.getAll('images') as File[];
        for (const file of files.slice(0, 8)) {
          const buf = Buffer.from(await file.arrayBuffer());
          const b64 = `data:${file.type || 'image/png'};base64,${buf.toString('base64')}`;
          imagesRaw.push(b64 as ImageRef);
        }
    } else if (contentType.includes('application/json')) {
      const body = (await req.json()) as {
        name?: string;
        description?: string;
        prompt?: string;
        tags?: string | string[];
        images?: Array<string | { public_id?: string; url?: string }>;
        image?: string;
        dngUrl?: string;
      };
      name = body?.name || '';
      description = body?.description || '';
      prompt = body?.prompt || '';
      tags = Array.isArray(body?.tags)
        ? body.tags
        : typeof body?.tags === 'string'
          ? body.tags.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
  if (Array.isArray(body?.images)) imagesRaw = body.images as ImageRef[]; else if (body?.image) imagesRaw = [body.image as ImageRef];
  // accept dngUrl in JSON body as well
  if (typeof body?.dngUrl === 'string' && body.dngUrl.trim()) {
    uploadedDng = { url: body.dngUrl.trim(), public_id: '', width: undefined, height: undefined, format: undefined } as unknown as CloudinaryUploaded;
  }
    }

    if (!name.trim()) return NextResponse.json({ ok: false, error: 'Missing name' }, { status: 400 });

  // Normalize and limit to max 8 images
  imagesRaw = imagesRaw.filter(Boolean) as ImageRef[];
  imagesRaw = imagesRaw.slice(0, 8);

    // uploaded will contain final {url, public_id} entries. If caller passed already-uploaded
    // image objects (with public_id), we'll reuse them and avoid re-uploading.
    const uploaded: { url: string; public_id: string }[] = [];
    function isUploadedObj(v: ImageRef): v is { public_id: string; url: string } {
      if (typeof v !== 'object' || v === null) return false;
      // use indexed access carefully
  const key = 'public_id' as const;
  return key in v && typeof (v as Record<string, unknown>)[key] === 'string';
    }
    const alreadyUploaded = imagesRaw.filter(isUploadedObj).map((it) => ({ url: it.url as string, public_id: it.public_id as string }));
    const toUpload = imagesRaw.filter((it): it is string => typeof it === 'string');
    if (toUpload.length) {
      const newly = await uploadImages(toUpload as string[]);
      uploaded.push(...newly.map((n) => ({ url: n.url, public_id: n.public_id })));
    }
  if (alreadyUploaded.length) uploaded.unshift(...alreadyUploaded);

    // dngInfo is built from provided dngUrl (no upload)
    let dngInfo: { url: string; public_id?: string; format?: string } | undefined = undefined;
    if (typeof uploadedDng !== 'undefined' && uploadedDng) {
      dngInfo = { url: uploadedDng.url, public_id: uploadedDng.public_id || undefined, format: uploadedDng.format };
    }

    const db = await getDatabase();
    const coll = db.collection('presets');
  const imagesArr = uploaded.map((u) => ({ url: u.url, public_id: u.public_id }));
  const cover = imagesArr.length ? imagesArr[0].url : (imagesRaw.length ? (typeof imagesRaw[0] === 'string' ? imagesRaw[0] : (imagesRaw[0]?.url || null)) : null);
  const doc: Document = {
      name,
      description,
      prompt,
      tags,
      image: cover,
      images: imagesArr,
      dng: dngInfo,
      createdAt: new Date(),
    };

  const res = await coll.insertOne(doc);
  try { const { clearCache } = await import('../../../lib/simpleCache'); clearCache(); } catch {}
    return NextResponse.json({ ok: true, id: res.insertedId.toString(), images: doc.images });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
