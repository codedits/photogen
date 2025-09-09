import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized:true,
    remotePatterns: [
      { protocol: 'https', hostname: '**.cloudinary.com' },
    ],
  },
};

export default nextConfig;
