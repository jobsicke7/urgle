import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    domains: ["media.discordapp.net", "cdn.discordapp.com", "kgh1113.ddns.net"]
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        encoding: false,
      };
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/look-alike/:path*',
        destination: 'http://kgh1113.ddns.net/api/look-alike/:path*',
      },
      {
        source: '/api/mood/:path*',
        destination: 'http://kgh1113.ddns.net/api/mood/:path*',
      },
      {
        source: '/socket.io/:path*',
        destination: 'http://kgh1113.ddns.net/socket.io/:path*',
      }
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "connect-src 'self' http://kgh1113.ddns.net https://kgh1113.ddns.net ws://kgh1113.ddns.net wss://kgh1113.ddns.net data: blob:;"
          }
        ]
      }
    ];
  }
};

export default nextConfig;