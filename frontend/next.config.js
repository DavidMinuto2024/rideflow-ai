/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  // Proxy API calls to the NestJS backend (Render in prod, localhost in dev)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:4000'}/api/:path*`,
      },
    ];
  },
  // Disable ESLint during build due to ESLint 10 deprecated options conflict
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
