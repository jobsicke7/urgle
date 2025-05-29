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
        source: '/socket.io/:path*',
        destination: 'http://kgh1113.ddns.net:80/socket.io/:path*',
      },
      {
        source: '/api/mood/socket.io/:path*',
        destination: 'http://kgh1113.ddns.net:80/api/mood/socket.io/:path*',
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
            value: [
              "default-src 'self'",
              "connect-src 'self' ws: wss: data: blob: https://cloudflareinsights.com https://*.cloudflareinsights.com http://kgh1113.ddns.net ws://kgh1113.ddns.net https://api.jobsickes.shop wss://api.jobsickes.shop",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://kgh1113.ddns.net http://kgh1113.ddns.net https://api.jobsickes.shop",
              "font-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "media-src 'self' blob:"
            ].join('; ')
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=()',
          }
        ]
      }
    ];
  }
};

export default nextConfig;