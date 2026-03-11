import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
