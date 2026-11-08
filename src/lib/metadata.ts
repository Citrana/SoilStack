import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";

/**
 * Open Graph fields every page shares. Next merges `openGraph` shallowly:
 * a page that sets its own openGraph REPLACES the inherited one, so pages
 * spread this first, then add their title, description and photo.
 */
export function baseOpenGraph(locale: Locale): NonNullable<Metadata["openGraph"]> {
  return {
    siteName: "SoilStack",
    type: "website",
    locale: locale === "en" ? "en_US" : "fr_CD",
    alternateLocale: locale === "en" ? ["fr_CD"] : ["en_US"],
    images: [{ url: `/${locale}/opengraph-image`, width: 1200, height: 630, alt: "SoilStack" }],
  };
}
