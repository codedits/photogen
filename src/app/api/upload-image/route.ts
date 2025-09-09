import { NextResponse } from 'next/server';
import cloudinary from '../../../lib/cloudinary';

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ ok: false, error: 'Content-Type must be multipart/form-data' }, { status: 400 });
    }
    const form = await req.formData();
    const file = form.get('image');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'Missing image file' }, { status: 400 });
    }
    // Basic validation: only images, size <= 10MB
    const allowed = ['image/png','image/jpeg','image/webp','image/gif'];
    const maxBytes = 10 * 1024 * 1024;
    const claimedType = file.type || 'application/octet-stream';
    if (!allowed.includes(claimedType)) {
      return NextResponse.json({ ok: false, error: 'Unsupported file type' }, { status: 415 });
    }
    if (typeof file.size === 'number' && file.size > maxBytes) {
      return NextResponse.json({ ok: false, error: 'File too large (max 10MB)' }, { status: 413 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const payload = `data:${file.type || 'image/png'};base64,${buf.toString('base64')}`;
  const res = await cloudinary.uploader.upload(payload, { folder: 'photogen/uploads', unique_filename: true, overwrite: false });
    return NextResponse.json({ ok: true, url: res.secure_url, public_id: res.public_id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const public_id = body?.public_id;
    const resource_type = body?.resource_type;
    if (!public_id) return NextResponse.json({ ok: false, error: 'Missing public_id' }, { status: 400 });
  const opts: Record<string, unknown> = { invalidate: true };
  if (resource_type) opts.resource_type = resource_type;
  const res = await cloudinary.uploader.destroy(public_id, opts as unknown as Record<string, unknown>);
    return NextResponse.json({ ok: true, result: res });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
