import type { MetadataRoute } from "next";
import { getPathname } from "@/i18n/navigation";
import { getProductSlugs, getProjectSlugs, getPublishedSlugs } from "@/lib/content";
import { buildSitemap } from "@/lib/seo";
import { SITE_URL } from "@/lib/site-url";

/** /sitemap.xml: every public page in French and English. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, products, projects] = await Promise.all([getPublishedSlugs(), getProductSlugs(), getProjectSlugs()]);
  return buildSitemap({ posts, products, projects }, SITE_URL, (locale, href) => getPathname({ locale, href }));
}
