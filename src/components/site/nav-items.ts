import { PAGE_PATHS } from "../../../convex/lib/pages";

/** Public navigation (labels in messages: Site.nav.<key>). */
export const SITE_NAV = [
  { key: "home", href: PAGE_PATHS.home },
  { key: "about", href: PAGE_PATHS.about },
  { key: "solutions", href: PAGE_PATHS.solutions },
  { key: "innovation", href: PAGE_PATHS.innovation },
  { key: "products", href: "/products" },
  { key: "projects", href: PAGE_PATHS.projects },
  { key: "blog", href: "/blog" },
] as const;
