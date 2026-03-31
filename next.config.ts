import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization
  images: {
    // Use Cloudinary for responsive srcset generation instead of Next/Vercel optimizer.
    loader: 'custom',
    loaderFile: './src/lib/cloudinaryLoader.ts',
    remotePatterns: [
      { protocol: 'https', hostname: '**.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'framerusercontent.com' },
    ],
    // Use modern formats automatically
    formats: ['image/avif', 'image/webp'],
    // Fewer breakpoints keep srcsets compact and reduce Cloudinary derived variants.
    deviceSizes: [480, 768, 1024, 1366, 1920],
    imageSizes: [64, 128, 256, 384],
    // Configured qualities
    qualities: [60, 75, 80, 85],
    // Cache images for 1 year
    minimumCacheTTL: 31536000,
  },

  // Compression
  compress: true,

  // Production source maps (can be disabled for faster builds)
  productionBrowserSourceMaps: false,

  // Generate ETags for caching
  generateEtags: true,

  // Optimize packages
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
    staleTimes: {
      dynamic: 300,
      static: 3600,
    },
  },
};

export default nextConfig;
