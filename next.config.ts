import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    // cover uploads go through a server action as FormData
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
