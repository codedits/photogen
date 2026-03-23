/**
 * Utility to compress images on the client side before upload.
 */
export async function compressImage(file: File, maxSizeMB: number = 6): Promise<File> {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size <= maxSizeBytes) {
    return file;
  }

  // Non-image files (like DNG) shouldn't be compressed this way
  if (!file.type.startsWith('image/')) {
    return file;
  }

  console.log(`Compressing image: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // If extremely large resize slightly to help compression
      const MAX_DIM = 4000;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = (height / width) * MAX_DIM;
          width = MAX_DIM;
        } else {
          width = (width / height) * MAX_DIM;
          height = MAX_DIM;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file); // Fallback to original
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Start with 0.8 quality and reduce if still too large
      let quality = 0.8;
      
      const attemptCompression = (q: number) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          if (blob.size > maxSizeBytes && q > 0.1) {
            // Still too large, try lower quality
            attemptCompression(q - 0.15);
          } else {
            console.log(`Compressed to: ${(blob.size / 1024 / 1024).toFixed(2)}MB at quality ${q.toFixed(2)}`);
            resolve(new File([blob], file.name, {
              type: blob.type || 'image/jpeg',
              lastModified: Date.now(),
            }));
          }
        }, 'image/jpeg', q);
      };

      attemptCompression(quality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve(file);
    };
  });
}
