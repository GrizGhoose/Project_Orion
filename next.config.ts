import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // AVIF first, WebP fallback; device sizes reach 2560 so the 2310px console screenshot stays sharp on retina
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920, 2310, 2560],
    qualities: [75, 90],
  },
};

export default nextConfig;
