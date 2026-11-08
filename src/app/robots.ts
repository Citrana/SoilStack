import type { MetadataRoute } from "next";
import { robotsFor } from "@/lib/seo";
import { SITE_URL } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return robotsFor({ vercelEnv: process.env.VERCEL_ENV }, SITE_URL);
}
