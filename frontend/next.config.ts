import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production: optimize for fast navigation and smaller client bundles
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;
