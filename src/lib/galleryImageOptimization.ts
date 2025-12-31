import cloudinary from './cloudinary';

// Gallery-specific transformation presets for optimized delivery
export const galleryTransforms = {
  // Thumbnail for grid views
  thumbnail: {
    width: 400,
    height: 400,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto:good',
    format: 'auto'
  },
  
  // Medium size for lightbox previews
  medium: {
    width: 800,
    height: 1200,
    crop: 'limit',
    quality: 'auto:good',
    format: 'auto'
  },
  
  // Large size for full-screen viewing
  large: {
    width: 1600,
    height: 2400,
    crop: 'limit',
    quality: 'auto:best',
    format: 'auto'
  },
  
  // Ultra-low quality placeholder for blur-up effect
  placeholder: {
    width: 24,
    height: 24,
    crop: 'fill',
    quality: 10,
    format: 'jpg'
  },
  
  // Social sharing optimized
  social: {
    width: 1200,
    height: 630,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto:good',
    format: 'jpg'
  }
};

// Generate responsive srcset for gallery images
export function generateGallerySrcSet(publicId: string) {
  const sizes = [400, 800, 1200, 1600];
  
  return sizes
    .map(size => {
      const url = cloudinary.url(publicId, {
        width: size,
        crop: 'limit',
        quality: 'auto:good',
        format: 'auto',
        dpr: 'auto'
      });
      return `${url} ${size}w`;
    })
    .join(', ');
}

// Generate optimized URL for gallery images with specific transformations
export function getGalleryImageUrl(
  publicId: string, 
  transform: keyof typeof galleryTransforms | 'custom',
  customOptions?: any
) {
  const options = transform === 'custom' 
    ? customOptions 
    : galleryTransforms[transform];
    
  return cloudinary.url(publicId, {
    ...options,
    secure: true,
    dpr: 'auto' // Automatically serve right DPR for device
  });
}

// Advanced gallery transformations for different use cases
export const advancedGalleryTransforms = {
  // Portrait orientation optimized
  portrait: {
    aspectRatio: '2:3',
    crop: 'fill',
    gravity: 'faces:auto',
    quality: 'auto:good'
  },
  
  // Landscape orientation optimized  
  landscape: {
    aspectRatio: '3:2',
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto:good'
  },
  
  // Square crop for consistent grids
  square: {
    aspectRatio: '1:1',
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto:good'
  },
  
  // Performance-first mobile delivery
  mobile: {
    width: 'auto',
    dpr: 'auto',
    crop: 'scale',
    quality: 'auto:eco',
    format: 'auto'
  }
};

// Create lazy loading configuration with progressive enhancement
export function createGalleryImageConfig(publicId: string, options: {
  sizes?: string;
  priority?: boolean;
  transform?: keyof typeof galleryTransforms;
}) {
  const { sizes = '100vw', priority = false, transform = 'medium' } = options;
  
  return {
    src: getGalleryImageUrl(publicId, transform),
    srcSet: generateGallerySrcSet(publicId),
    sizes,
    placeholder: getGalleryImageUrl(publicId, 'placeholder'),
    loading: priority ? 'eager' : 'lazy',
    decoding: 'async'
  };
}

// Batch optimize multiple gallery images (for admin upload)
export async function batchOptimizeGalleryImages(publicIds: string[]) {
  try {
    // Pre-generate commonly used sizes to warm CDN cache
    const transformPromises = publicIds.flatMap(publicId => [
      // Generate and cache thumbnail
      fetch(getGalleryImageUrl(publicId, 'thumbnail')),
      // Generate and cache medium size
      fetch(getGalleryImageUrl(publicId, 'medium')),
      // Generate and cache placeholder
      fetch(getGalleryImageUrl(publicId, 'placeholder'))
    ]);
    
    await Promise.all(transformPromises);
    return { success: true, optimized: publicIds.length };
  } catch (error: any) {
    console.error('Gallery image optimization failed:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}