import type { NextConfig } from "next";
import dns from "node:dns";

// Prefer IPv4 to prevent ConnectTimeoutError on networks with dead NAT64 IPv6 routes
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    instantNavigationDevToolsToggle: true,
  },
  async redirects() {
    return [
      {
        source: "/admin",
        destination: "/dashboard",
        permanent: false,
      },
      {
        source: "/admin/:path*",
        destination: "/:path*",
        permanent: false,
      },
      {
        source: "/attendance",
        destination: "/lms/attendance",
        permanent: false,
      },
      {
        source: "/materials",
        destination: "/lms/materials",
        permanent: false,
      },
      {
        source: "/projects",
        destination: "/lms/projects",
        permanent: false,
      },
      {
        source: "/tests",
        destination: "/lms/tests",
        permanent: false,
      },
      {
        source: "/tests/:path*",
        destination: "/lms/tests/:path*",
        permanent: false,
      },
      {
        source: "/content",
        destination: "/lms/content",
        permanent: false,
      },
      {
        source: "/progress",
        destination: "/lms/progress",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
