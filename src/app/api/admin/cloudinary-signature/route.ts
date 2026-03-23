import { NextResponse } from 'next/server';
import cloudinary from '../../../../lib/cloudinary';
import { isAdminRequest } from '../../../../lib/auth';

const DEFAULT_FOLDER = 'photogen/uploads';

export async function POST(req: Request) {
  try {
    if (!isAdminRequest(req)) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedFolder = typeof body?.folder === 'string' ? body.folder.trim() : '';
    const folder = requestedFolder.startsWith('photogen/') ? requestedFolder : DEFAULT_FOLDER;

    const timestamp = Math.floor(Date.now() / 1000);
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

    if (!apiKey || !apiSecret || !cloudName) {
      return NextResponse.json(
        { ok: false, error: 'Cloudinary credentials are missing on server.' },
        { status: 500 }
      );
    }

    const paramsToSign = {
      folder,
      timestamp,
      resource_type: 'image',
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return NextResponse.json({
      ok: true,
      signature,
      timestamp,
      apiKey,
      cloudName,
      folder,
      resourceType: 'image',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
