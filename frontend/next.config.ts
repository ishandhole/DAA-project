import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Turbopack is now stable in Next.js 16.
  // We explicitly set the root to prevent Next.js from climbing up to 
  // the user's home directory when it finds accidental lockfiles there.
  turbopack: {
    root: path.resolve("."), 
  },
} as any;

export default nextConfig;
