import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Emits .next/standalone with a self-contained server and only the node_modules
  // actually reached — that is what keeps the Cloud Run image small.
  output: 'standalone',

  experimental: {
    // Matches fuudfarms-marketing-website-v2. TypeScript 7 is the native (tsgo)
    // compiler and no longer exposes the legacy compiler API Next reaches for by
    // default. Drop this if you pin TypeScript 6.
    useTypeScriptCli: true,
  },
};

export default nextConfig;
