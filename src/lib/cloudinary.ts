import { v2 as cloudinary, UploadApiOptions } from 'cloudinary';

// Configure Cloudinary
// It will automatically use CLOUDINARY_URL if present in process.env
// Otherwise, we can explicitly set the config from individual env vars
const config: any = {
  secure: true,
};

if (process.env.CLOUDINARY_CLOUD_NAME) config.cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
if (process.env.CLOUDINARY_API_KEY) config.api_key = process.env.CLOUDINARY_API_KEY;
if (process.env.CLOUDINARY_API_SECRET) config.api_secret = process.env.CLOUDINARY_API_SECRET;

cloudinary.config(config);

if (!process.env.CLOUDINARY_URL && !process.env.CLOUDINARY_API_KEY) {
  console.warn('Cloudinary credentials not set. Set CLOUDINARY_URL or CLOUDINARY_API_KEY in .env.local');
}

export type CloudinaryUploaded = { url: string; public_id: string; width?: number; height?: number; format?: string };

export async function uploadImages(images: Array<string | Buffer>, folder = 'photogen/presets'): Promise<CloudinaryUploaded[]> {
  const uploads = images.map((img) => {
    const payload = typeof img === 'string' ? img : `data:image/png;base64,${img.toString('base64')}`;
    return cloudinary.uploader.upload(payload, {
      folder,
      unique_filename: true,
      overwrite: false,
    });
  });
  const res = await Promise.all(uploads);
  return res.map((r) => ({ url: r.secure_url, public_id: r.public_id, width: r.width, height: r.height, format: r.format }));
}

export async function uploadFile(buffer: Buffer, filename?: string, folder = 'photogen/presets'): Promise<CloudinaryUploaded> {
  // Use resource_type 'auto' so Cloudinary handles RAW/DNG files correctly.
  const data = `data:application/octet-stream;base64,${buffer.toString('base64')}`;
  const opts: UploadApiOptions = {
    folder,
    unique_filename: true,
    overwrite: false,
    resource_type: 'auto',
    filename_override: filename,
  };
  const res = await cloudinary.uploader.upload(data, opts);
  return { url: res.secure_url, public_id: res.public_id, width: res.width, height: res.height, format: res.format };
}

export default cloudinary;
