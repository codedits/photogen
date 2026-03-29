import { NextResponse } from "next/server";
import { isAdminRequest } from "../../../lib/auth";
import getDatabase, { ensurePresetIndexes } from "../../../lib/mongodb";
import { uploadImages, uploadFile } from "../../../lib/cloudinary";
import { ObjectId, Document } from 'mongodb';
import type { CloudinaryUploaded } from '../../../lib/cloudinary';
import type { Filter } from 'mongodb';
import { getCache, setCache } from '../../../lib/simpleCache';
import { applyCacheControl, CACHE_CONTROL } from '../../../lib/httpCache';
import { invalidatePresetContent } from '../../../lib/contentInvalidation';

type PresetDoc = {
  _id: ObjectId;
  name?: string;
  description?: string;
  prompt?: string;
  tags?: string[];
  image?: string | null;
  images?: { url: string; public_id: string }[];
  dng?: { url: string; public_id?: string; format?: string } | null;
  createdAt?: Date;
};

type PresetImage = { url: string; public_id: string };

function isUploadCandidate(value: string): boolean {
  const v = value.trim();
  return v.startsWith('data:') || /^https?:\/\//i.test(v);
}

function parseImageRefUnknown(input: unknown): PresetImage | null {
  if (!input || typeof input !== 'object') return null;
  const src = input as Record<string, unknown>;
  const url = typeof src.url === 'string' ? src.url.trim() : '';
  const publicId = typeof src.public_id === 'string' ? src.public_id.trim() : '';
  if (!url || !publicId) return null;
  return { url, public_id: publicId };
}

function parseImageRefString(input: string): PresetImage | null {
  try {
    return parseImageRefUnknown(JSON.parse(input));
  } catch {
    return null;
  }
}

function dedupeImages(images: PresetImage[]): PresetImage[] {
  const seen = new Set<string>();
  const out: PresetImage[] = [];
  for (const img of images) {
    if (!img.public_id || seen.has(img.public_id)) continue;
    seen.add(img.public_id);
    out.push(img);
  }
  return out;
}

async function parseJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object') return {};
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

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
      if (cached) {
        const response = NextResponse.json(cached);
        applyCacheControl(response, CACHE_CONTROL.PUBLIC_LIST, true);
        return response;
      }
    }
    const db = await getDatabase();
    try { await ensurePresetIndexes(db.databaseName); } catch (idxErr) { console.warn('ensurePresetIndexes failed in GET /api/presets', idxErr); }
    const coll = db.collection("presets");
    let filter: Filter<Document> = {};
    const createdSort = { createdAt: -1 } as const;
    let projection: Record<string, 0 | 1 | { $meta: string }> = { name: 1, description: 1, prompt: 1, tags: 1, image: 1, images: 1, dng: 1, createdAt: 1 };
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
            dng: doc.dng || null,
            createdAt: doc.createdAt,
          };
        });
        const hasMore = out.length > limit;
        const sliced = hasMore ? out.slice(0, limit) : out;
        const resp = { ok: true, presets: sliced, hasMore, page, limit };
        // For search queries we don't long-cache; short no-store so clients controlled by SWR-like layer.
        return NextResponse.json(resp, { headers: { 'cache-control': CACHE_CONTROL.NO_STORE } });
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
        dng: doc.dng || null,
        createdAt: doc.createdAt,
      };
    });
    const hasMore = out.length > limit;
    const sliced = hasMore ? out.slice(0, limit) : out;
    const resp = { ok: true, presets: sliced, hasMore, page, limit };
    if (cachingEligible) {
      // cache short-lived to improve repeated load latency
      // increased to 60s to reduce load during rapid navigation/testing.
      setCache(cacheKey, resp, 60);
      const response = NextResponse.json(resp);
      applyCacheControl(response, CACHE_CONTROL.PUBLIC_LIST, true);
      return response;
    }
    return NextResponse.json(resp, { headers: { 'cache-control': CACHE_CONTROL.NO_STORE } });
  } catch (err: unknown) {
    console.error('GET /api/presets failed', err);
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
  try { await ensurePresetIndexes(dbForIdx.databaseName); } catch (idxErr) { console.warn('ensurePresetIndexes failed in POST /api/presets', idxErr); }
    const contentType = req.headers.get('content-type') || '';
    let name = '';
    let description = '';
    let prompt = '';
    let tags: string[] = [];
  type ImageRef = string | { public_id?: string; url?: string };
  let imagesRaw: ImageRef[] = [];
  const invalidImageInputs: string[] = [];
  let uploadedDng: CloudinaryUploaded | undefined = undefined;

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      name = String(form.get('name') || '');
      description = String(form.get('description') || '');
      prompt = String(form.get('prompt') || '');
      const rawTags = form.get('tags');
      if (typeof rawTags === 'string') tags = rawTags.split(',').map((s) => s.trim()).filter(Boolean);
      const urlList = form.getAll('imageUrls').filter((v) => typeof v === 'string') as string[];
      // Accept either stringified image refs or true upload candidates; reject local-path-like strings.
      for (const entry of urlList) {
        const parsedRef = parseImageRefString(entry);
        if (parsedRef) {
          imagesRaw.push(parsedRef);
          continue;
        }
        const normalized = entry.trim();
        if (isUploadCandidate(normalized)) imagesRaw.push(normalized);
        else invalidImageInputs.push(normalized || '[empty]');
      }
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
      const body = await parseJsonBody(req);
      if (!body) {
        return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
      }
      name = typeof body.name === 'string' ? body.name : '';
      description = typeof body.description === 'string' ? body.description : '';
      prompt = typeof body.prompt === 'string' ? body.prompt : '';
      tags = Array.isArray(body?.tags)
        ? body.tags
        : typeof body?.tags === 'string'
          ? body.tags.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
      const incomingImages = Array.isArray(body?.images)
        ? body.images
        : (Array.isArray(body?.imageUrls) ? body.imageUrls : (body?.image ? [body.image] : []));
      for (const item of incomingImages) {
        if (typeof item === 'string') {
          const parsedRef = parseImageRefString(item);
          if (parsedRef) {
            imagesRaw.push(parsedRef);
            continue;
          }
          const normalized = item.trim();
          if (isUploadCandidate(normalized)) imagesRaw.push(normalized);
          else invalidImageInputs.push(normalized || '[empty]');
        } else {
          const parsedRef = parseImageRefUnknown(item);
          if (parsedRef) imagesRaw.push(parsedRef);
        }
      }
  // accept dngUrl in JSON body as well
  if (typeof body?.dngUrl === 'string' && body.dngUrl.trim()) {
    uploadedDng = { url: body.dngUrl.trim(), public_id: '', width: undefined, height: undefined, format: undefined } as unknown as CloudinaryUploaded;
  }
    } else {
      return NextResponse.json({ ok: false, error: 'Unsupported content type' }, { status: 415 });
    }

    if (!name.trim()) return NextResponse.json({ ok: false, error: 'Missing name' }, { status: 400 });

  // Normalize and limit to max 8 images
  imagesRaw = imagesRaw.filter(Boolean) as ImageRef[];
  imagesRaw = imagesRaw.slice(0, 8);
  if (invalidImageInputs.length) {
    return NextResponse.json(
      {
        ok: false,
        error: `Invalid image input(s): ${invalidImageInputs.slice(0, 3).join(', ')}. Use JSON image refs or http(s)/data URLs only.`,
      },
      { status: 400 }
    );
  }

    // uploaded will contain final {url, public_id} entries. If caller passed already-uploaded
    // image objects (with public_id), we'll reuse them and avoid re-uploading.
    const uploaded: PresetImage[] = [];
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
    const imagesArr = dedupeImages(uploaded);

    // dngInfo is built from provided dngUrl (no upload)
    let dngInfo: { url: string; public_id?: string; format?: string } | undefined = undefined;
    if (typeof uploadedDng !== 'undefined' && uploadedDng) {
      dngInfo = { url: uploadedDng.url, public_id: uploadedDng.public_id || undefined, format: uploadedDng.format };
    }

    const db = await getDatabase();
    const coll = db.collection('presets');
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
  invalidatePresetContent({ detailPath: `/presets/${res.insertedId.toString()}` });
    return NextResponse.json({ ok: true, id: res.insertedId.toString(), images: doc.images });
  } catch (err: unknown) {
    console.error('POST /api/presets failed', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
