import { NextResponse } from 'next/server';
import { isAdminRequest } from '../../../lib/auth';
import cloudinary from '../../../lib/cloudinary';

export async function POST(req: Request) {
  try {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
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
    const allowed = ['image/png','image/jpeg','image/jpg','image/webp','image/gif','image/avif','image/heic','image/heif'];
    const maxBytes = 10 * 1024 * 1024;
    const claimedType = file.type || 'application/octet-stream';
    if (!allowed.includes(claimedType) && !claimedType.startsWith('image/')) {
      return NextResponse.json({ ok: false, error: `Unsupported file type: ${claimedType}` }, { status: 415 });
    }
    if (typeof file.size === 'number' && file.size > maxBytes) {
      return NextResponse.json({ ok: false, error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 10MB.` }, { status: 413 });
    }

    const config = cloudinary.config();
    if (!config.api_key || !config.api_secret || !config.cloud_name) {
      return NextResponse.json({ ok: false, error: 'Cloudinary credentials are missing on server.' }, { status: 500 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    
    // Use upload_stream for better performance and to avoid base64 overhead
    const res: any = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { 
          folder: 'photogen/uploads', 
          unique_filename: true, 
          overwrite: false,
          format: 'webp'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buf);
    });

    return NextResponse.json({ ok: true, url: res.secure_url, public_id: res.public_id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ ok: false, error: 'Content-Type must be application/json' }, { status: 400 });
    }
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
    }
    const public_id = typeof body?.public_id === 'string' ? body.public_id.trim() : '';
    const resource_type = typeof body?.resource_type === 'string' ? body.resource_type.trim() : '';
    if (!public_id) return NextResponse.json({ ok: false, error: 'Missing public_id' }, { status: 400 });

    const config = cloudinary.config();
    if (!config.api_key || !config.api_secret || !config.cloud_name) {
      return NextResponse.json({ ok: false, error: 'Cloudinary credentials are missing on server.' }, { status: 500 });
    }

    const opts: { invalidate: boolean; resource_type?: 'image' | 'video' | 'raw' | 'auto' } = { invalidate: true };
    if (resource_type === 'image' || resource_type === 'video' || resource_type === 'raw' || resource_type === 'auto') {
      opts.resource_type = resource_type;
    }
    const res = await cloudinary.uploader.destroy(public_id, opts);
    return NextResponse.json({ ok: true, result: res });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
