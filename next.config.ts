import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // DuckDB (trace storage) loads a native Node addon, which Next.js can't bundle.
  serverExternalPackages: ['@mastra/duckdb', '@duckdb/node-api', '@duckdb/node-bindings'],
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
