import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Images are stored in Convex file storage; next/image serves resized
    // AVIF/WebP variants of them (fast on slow connections).
    formats: ["image/avif", "image/webp"],
    // A Convex storage URL always serves the same file: keep optimized
    // copies for 31 days instead of re-fetching them every few hours.
    minimumCacheTTL: 2678400,
    // The local dev Convex backend runs on 127.0.0.1, which next/image
    // refuses by default (SSRF protection). Allowed in development only.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
    remotePatterns: [
      { protocol: "https", hostname: "*.convex.cloud" },
      { protocol: "http", hostname: "127.0.0.1", port: "3210" },
    ],
  },
  async headers() {
    const common = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    return [
      { source: "/:path*", headers: common },
      // The admin is never framed by another site.
      { source: "/:locale/admin/:path*", headers: [{ key: "X-Frame-Options", value: "DENY" }] },
      { source: "/:locale/admin", headers: [{ key: "X-Frame-Options", value: "DENY" }] },
      { source: "/icon.svg", headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }] },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
