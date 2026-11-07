import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PAGE_PATHS, type PageKey } from "../../../convex/lib/pages";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getPage } from "@/lib/content";
import { Sections } from "./sections/sections";
import { t } from "./sections/text";

async function resolveLocale(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return locale;
}

/** A company page: its published sections, cached (src/lib/content.ts). */
export async function CompanyPage({ params, pageKey }: { params: Promise<{ locale: string }>; pageKey: PageKey }) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const page = await getPage(pageKey);
  if (!page) notFound();
  return <Sections sections={page.sections} locale={locale} />;
}

/** Title/description from the page's SEO fields, with hreflang alternates. */
export async function companyPageMetadata(params: Promise<{ locale: string }>, pageKey: PageKey): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const page = await getPage(pageKey);
  if (!page) return {};
  const href = PAGE_PATHS[pageKey];
  const languages = Object.fromEntries(routing.locales.map((l) => [l, getPathname({ locale: l, href })]));
  return {
    title: t(page.seo.title, locale),
    description: t(page.seo.description, locale),
    alternates: {
      canonical: getPathname({ locale, href }),
      languages: { ...languages, "x-default": getPathname({ locale: routing.defaultLocale, href }) },
    },
    openGraph: {
      title: t(page.seo.title, locale),
      description: t(page.seo.description, locale),
      locale: locale === "fr" ? "fr_CD" : "en_US",
      type: "website",
    },
  };
}
