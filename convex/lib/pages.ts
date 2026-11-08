/**
 * Plain data only (no Convex imports): the public site's phone menu uses
 * PAGE_PATHS, and anything imported here ships to every visitor. The
 * validator lives in ./pageKey.ts.
 */

/** The company pages. Each exists exactly once (seeded) and is never deleted. */
export const PAGE_KEYS = ["home", "about", "solutions", "innovation", "projects", "contact"] as const;
export type PageKey = (typeof PAGE_KEYS)[number];

/** Internal pathname of each page (src/i18n/routing.ts localizes it). */
export const PAGE_PATHS = {
  home: "/",
  about: "/about",
  solutions: "/solutions",
  innovation: "/innovation",
  projects: "/projects",
  contact: "/contact",
} as const satisfies Record<PageKey, string>;

export function isPageKey(value: string): value is PageKey {
  return (PAGE_KEYS as readonly string[]).includes(value);
}

/** Cache tags the public site uses (src/lib/content.ts). */
export const pageTag = (key: PageKey) => `page:${key}`;
export const SETTINGS_TAG = "settings";
