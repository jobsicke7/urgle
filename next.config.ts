import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    domains: ["media.discordapp.net", "cdn.discordapp.com", "kgh1113.ddns.net", "beta.jobsicke.com"]
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
  // Explicitly provide an (empty) Turbopack config so Next.js build on Vercel
  // doesn't error when a custom webpack config is present.
  turbopack: {},
  async rewrites() {
    return [
      {
        source: '/socket.io/:path*',
        destination: 'https://beta.jobsicke.com/socket.io/:path*',
      },
      {
        source: '/api/mood/socket.io/:path*',
        destination: 'https://beta.jobsicke.com/api/mood/socket.io/:path*',
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
              "connect-src * data: blob: ws: wss:",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://kgh1113.ddns.net http://kgh1113.ddns.net https://api.jobsickes.shop https://beta.jobsicke.com",
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
