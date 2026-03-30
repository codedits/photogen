import cloudinary from '../../../../lib/cloudinary';
import { isAdminRequest } from '../../../../lib/auth';
import { noStoreJson } from '@/lib/httpCache';

const DEFAULT_FOLDER = 'photogen/uploads';

export async function POST(req: Request) {
  try {
    if (!isAdminRequest(req)) {
      return noStoreJson({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedFolder = typeof body?.folder === 'string' ? body.folder.trim() : '';
    const folder = requestedFolder.startsWith('photogen/') ? requestedFolder : DEFAULT_FOLDER;
    const requestedResourceType = typeof body?.resourceType === 'string' ? body.resourceType.trim() : '';
    const resourceType =
      requestedResourceType === 'image' ||
      requestedResourceType === 'video' ||
      requestedResourceType === 'raw' ||
      requestedResourceType === 'auto'
        ? requestedResourceType
        : 'image';

    const timestamp = Math.floor(Date.now() / 1000);
    
    // Retrieve configuration directly from initialized cloudinary instance.
    // This allows the Cloudinary SDK to handle CLOUDINARY_URL parsing natively.
    const cloudinaryConfig = cloudinary.config();
    const apiKey = cloudinaryConfig.api_key || process.env.CLOUDINARY_API_KEY;
    const apiSecret = cloudinaryConfig.api_secret || process.env.CLOUDINARY_API_SECRET;
    const cloudName = cloudinaryConfig.cloud_name || process.env.CLOUDINARY_CLOUD_NAME;

    if (!apiKey || !apiSecret || !cloudName) {
      return noStoreJson(
        { ok: false, error: 'Cloudinary credentials are missing on server. Set CLOUDINARY_URL or individual CLOUDINARY_API_* variables in .env.local.' },
        { status: 500 }
      );
    }

    const paramsToSign = {
      folder,
      timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    return noStoreJson({
      ok: true,
      signature,
      timestamp,
      apiKey,
      cloudName,
      folder,
      resourceType,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return noStoreJson({ ok: false, error: message }, { status: 500 });
  }
}
