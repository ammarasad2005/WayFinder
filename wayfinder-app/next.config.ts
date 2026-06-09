import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Google Places photo proxy — images are served through /api/places/photo
        // We allow maps.googleapis.com only for the static map fallback
        protocol: "https",
        hostname: "maps.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google profile photos
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Clickjacking protection
          { key: "X-Frame-Options", value: "DENY" },
          // MIME sniffing protection
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Referrer policy — don't leak full URL to third parties
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disable browser features we don't use
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), payment=(), usb=()",
            // NOTE: geolocation intentionally omitted — we use it on the client
          },
          // HSTS — enforce HTTPS in production
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Content Security Policy
          // TODO(security): Tighten nonce-based CSP before production launch.
          // Maps JS API requires unsafe-eval for its runtime; this is a known
          // Google Maps limitation. Review and document if a stricter policy
          // is achievable via the Maps API v3 loading strategy.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com https://accounts.google.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://maps.googleapis.com https://maps.gstatic.com https://lh3.googleusercontent.com https://streetviewpixels-pa.googleapis.com",
              "connect-src 'self' https://maps.googleapis.com https://accounts.google.com",
              "frame-src https://accounts.google.com",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
