import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    position: 'bottom-right',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Compress responses
  compress: true,
  // Optimize package imports to reduce cold start bundle size
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts', '@supabase/supabase-js'],
  },
  // Cache static API responses at the CDN edge
  headers: async () => [
    {
      source: '/api/menu',
      headers: [{ key: 'Cache-Control', value: 's-maxage=30, stale-while-revalidate=60' }],
    },
    {
      source: '/api/menu/categories',
      headers: [{ key: 'Cache-Control', value: 's-maxage=60, stale-while-revalidate=120' }],
    },
    {
      source: '/api/restaurant',
      headers: [{ key: 'Cache-Control', value: 's-maxage=120, stale-while-revalidate=300' }],
    },
  ],
};

export default nextConfig;
