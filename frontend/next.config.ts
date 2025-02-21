import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Disable React Strict Mode (optional, for debugging)
  webpack: (config) => {
    config.cache = false; // Disable Webpack cache
    return config;
  },
  // experimental: {
  //   turboMode: false, // Disable Turbopack
  // },
};

export default nextConfig;
