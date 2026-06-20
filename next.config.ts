import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb",
    },
    // Required because auth middleware buffers request bodies (default 10MB)
    middlewareClientMaxBodySize: "500mb",
  },
};

export default nextConfig;
