import { defineRouting } from "next-intl/routing";

/**
 * French is the default language. URLs are always locale-prefixed
 * (`/fr/...`, `/en/...`) and public pages use localized pathnames, so a
 * French visitor sees `/fr/a-propos` and an English one `/en/about`.
 * Add every new route here (internal path -> per-locale path).
 */
export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  pathnames: {
    "/": "/",
    "/about": { fr: "/a-propos", en: "/about" },
    "/solutions": "/solutions",
    "/innovation": "/innovation",
    "/projects": { fr: "/projets", en: "/projects" },
    "/projects/[slug]": { fr: "/projets/[slug]", en: "/projects/[slug]" },
    "/contact": "/contact",
    "/blog": "/blog",
    "/blog/[slug]": "/blog/[slug]",
    "/products": { fr: "/produits", en: "/products" },
    "/products/[slug]": { fr: "/produits/[slug]", en: "/products/[slug]" },
    // Admin: same path in both languages.
    "/admin": "/admin",
    "/admin/login": "/admin/login",
    "/admin/account": "/admin/account",
    "/admin/media": "/admin/media",
    "/admin/users": "/admin/users",
    "/admin/roles": "/admin/roles",
    "/admin/roles/[roleId]": "/admin/roles/[roleId]",
    "/admin/audit": "/admin/audit",
  },
});

export type Locale = (typeof routing.locales)[number];
export type Pathname = keyof typeof routing.pathnames;
