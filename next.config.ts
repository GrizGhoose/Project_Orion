import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // AVIF first, WebP fallback; device sizes reach 3840 so the full-bleed hero stays sharp on retina and 4K screens
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920, 2310, 2560, 2880, 3840],
    qualities: [75, 90],
  },
};

export default nextConfig;
