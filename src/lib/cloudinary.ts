import { v2 as cloudinary, UploadApiOptions } from 'cloudinary';

// CLOUDINARY_URL covers cloud_name, api_key, api_secret.
const url = process.env.CLOUDINARY_URL;
if (!url) {
  console.warn('CLOUDINARY_URL not set. Set it in .env.local to enable uploads.');
}

cloudinary.config({
  secure: true,
});

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
