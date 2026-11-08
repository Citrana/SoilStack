import { expect, test } from "vitest";
import { buildSitemap, jsonLdString, organizationJsonLd, robotsFor } from "./seo";

// Same localized paths as src/i18n/routing.ts.
const PATHS: Record<string, { fr: string; en: string }> = {
  "/": { fr: "/", en: "/" },
  "/about": { fr: "/a-propos", en: "/about" },
  "/projects": { fr: "/projets", en: "/projects" },
  "/products": { fr: "/produits", en: "/products" },
};
const pathFor = (locale: "fr" | "en", href: string | { pathname: string; params: { slug: string } }) => {
  if (typeof href === "string") return `/${locale}${(PATHS[href]?.[locale] ?? href).replace(/\/$/, "")}`;
  const base = href.pathname.replace("/[slug]", "");
  return `/${locale}${PATHS[base]?.[locale] ?? base}/${href.params.slug}`;
};

test("buildSitemap lists every public page in both languages, with absolute localized URLs", () => {
  const sitemap = buildSitemap(
    { posts: [{ slug: "recolte", updatedAt: 1 }], products: [{ slug: "npk", updatedAt: 2 }], projects: [{ slug: "drones", updatedAt: 3 }] },
    "https://soilstack.cd",
    pathFor as never,
  );
  const urls = sitemap.map((e) => e.url);
  expect(urls).toContain("https://soilstack.cd/fr");
  expect(urls).toContain("https://soilstack.cd/fr/a-propos");
  expect(urls).toContain("https://soilstack.cd/fr/produits/npk");
  expect(urls).toContain("https://soilstack.cd/fr/projets/drones");
  expect(urls).toContain("https://soilstack.cd/fr/blog/recolte");
  const about = sitemap.find((e) => e.url.endsWith("/fr/a-propos"));
  expect(about?.alternates?.languages).toEqual({ fr: "https://soilstack.cd/fr/a-propos", en: "https://soilstack.cd/en/about" });
  expect(urls.some((u) => u.includes("admin") || u.includes("__none__"))).toBe(false);
  expect(sitemap.find((e) => e.url.endsWith("/npk"))?.lastModified).toEqual(new Date(2));
});

test("robotsFor hides previews and keeps the admin out of search engines", () => {
  expect(robotsFor({ vercelEnv: "preview" }, "https://x")).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  const prod = robotsFor({ vercelEnv: "production" }, "https://soilstack.cd");
  expect(prod.sitemap).toBe("https://soilstack.cd/sitemap.xml");
  expect(prod.rules).toMatchObject({ disallow: ["/fr/admin", "/en/admin", "/api/"] });
  expect(robotsFor({}, "http://localhost:3000").sitemap).toBeDefined();
});

test("organizationJsonLd skips empty settings; jsonLdString escapes <", () => {
  expect(organizationJsonLd({ phone: "", email: "", socials: {} }, "https://s.cd")).not.toHaveProperty("contactPoint");
  const full = organizationJsonLd({ phone: "+243 81", email: "a@b.cd", socials: { linkedin: "https://linkedin.com/x" } }, "https://s.cd");
  expect(full).toMatchObject({ contactPoint: { telephone: "+243 81", email: "a@b.cd" }, sameAs: ["https://linkedin.com/x"] });
  expect(jsonLdString({ name: "</script><script>alert(1)</script>" })).not.toContain("</script>");
});
