import type { MetadataRoute } from "next";
import { PAGE_KEYS, PAGE_PATHS } from "../../convex/lib/pages";
import type { SiteSettings } from "../../convex/lib/settings";
import { SOCIAL_KEYS } from "../../convex/lib/settings";

type Href =
  | (typeof PAGE_PATHS)[keyof typeof PAGE_PATHS]
  | "/blog"
  | "/products"
  | { pathname: "/blog/[slug]" | "/products/[slug]" | "/projects/[slug]"; params: { slug: string } };

export type SitemapInput = {
  posts: ReadonlyArray<{ slug: string; updatedAt: number }>;
  products: ReadonlyArray<{ slug: string; updatedAt: number }>;
  projects: ReadonlyArray<{ slug: string; updatedAt: number }>;
};

type PathFor = (locale: "fr" | "en", href: Href) => string;

/**
 * Every public URL, with its FR/EN alternates (localized paths). Pure:
 * src/app/sitemap.ts gives it the published slugs and the path builder.
 */
export function buildSitemap(input: SitemapInput, siteUrl: string, pathFor: PathFor): MetadataRoute.Sitemap {
  const entry = (href: Href, lastModified?: number, priority = 0.6) => ({
    url: siteUrl + pathFor("fr", href),
    ...(lastModified ? { lastModified: new Date(lastModified) } : {}),
    priority,
    alternates: { languages: { fr: siteUrl + pathFor("fr", href), en: siteUrl + pathFor("en", href) } },
  });
  return [
    ...PAGE_KEYS.map((key) => entry(PAGE_PATHS[key], undefined, key === "home" ? 1 : 0.8)),
    entry("/products", undefined, 0.8),
    entry("/blog", undefined, 0.7),
    ...input.products.map((p) => entry({ pathname: "/products/[slug]", params: { slug: p.slug } }, p.updatedAt, 0.7)),
    ...input.projects.map((p) => entry({ pathname: "/projects/[slug]", params: { slug: p.slug } }, p.updatedAt)),
    ...input.posts.map((p) => entry({ pathname: "/blog/[slug]", params: { slug: p.slug } }, p.updatedAt)),
  ];
}

/** Indexable only in production; previews are hidden from search engines. */
export function robotsFor(env: { vercelEnv?: string }, siteUrl: string): MetadataRoute.Robots {
  if (env.vercelEnv && env.vercelEnv !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/fr/admin", "/en/admin", "/api/"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

/** schema.org Organization for the home page, skipping empty settings. */
export function organizationJsonLd(settings: Pick<SiteSettings, "phone" | "email" | "socials">, siteUrl: string) {
  const sameAs = SOCIAL_KEYS.flatMap((key) => (settings.socials[key] ? [settings.socials[key]!] : []));
  const contact = settings.phone || settings.email;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SoilStack",
    url: siteUrl,
    logo: `${siteUrl}/icon.svg`,
    ...(contact
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            ...(settings.phone ? { telephone: settings.phone } : {}),
            ...(settings.email ? { email: settings.email } : {}),
            availableLanguage: ["fr", "en"],
          },
        }
      : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

/** JSON for a <script type="application/ld+json">: "<" escaped so text can't close the tag. */
export function jsonLdString(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
