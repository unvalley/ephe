import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  images: {
    unoptimized: process.env.NODE_ENV !== 'production',
  },
};

export default nextConfig;
