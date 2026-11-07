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
    // The local dev Convex backend runs on 127.0.0.1, which next/image
    // refuses by default (SSRF protection). Allowed in development only.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
    remotePatterns: [
      { protocol: "https", hostname: "*.convex.cloud" },
      { protocol: "http", hostname: "127.0.0.1", port: "3210" },
    ],
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
