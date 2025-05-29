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
      // WebSocket 연결만 프록시 (API는 Next.js API Routes 사용)
      {
        source: '/socket.io/:path*',
        destination: 'http://kgh1113.ddns.net/socket.io/:path*',
      }
    ];
  },
  // HTTPS 리다이렉트
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'header',
            key: 'x-forwarded-proto',
            value: 'http',
          },
        ],
        destination: 'https://www.jobsickes.shop/:path*',
        permanent: true,
      },
    ]
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
              // WebSocket 연결을 위해 자체 도메인과 WebSocket 프로토콜 허용
              "connect-src 'self' ws: wss: data: blob:",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              // 이미지는 자체 도메인과 blob, data URI만 허용 (외부 HTTP 제거)
              "img-src 'self' data: blob: https://kgh1113.ddns.net",
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