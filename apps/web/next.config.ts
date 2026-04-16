import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
});

const nextConfig: NextConfig = {
  // Expose API_URL to server-side Route Handlers at runtime
  serverRuntimeConfig: {
    apiUrl: process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:8080',
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'}/api/:path*`,
      },
    ];
  },
};

export default withPWA(nextConfig);
