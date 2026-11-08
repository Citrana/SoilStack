import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PUBLIC_CLIENT_NAMESPACES, pickMessages } from "@/i18n/public-messages";
import { routing } from "@/i18n/routing";
import { baseOpenGraph } from "@/lib/metadata";
import { SITE_URL } from "@/lib/site-url";
import "./globals.css";

// Self-hosted by next/font: no request to Google, swap avoids invisible text.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale,
    namespace: "Metadata",
  });
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: "SoilStack",
    // Company pages set an absolute title (their SEO title already ends
    // with "— SoilStack"); articles, products and projects use the template.
    title: { default: t("title"), template: "%s — SoilStack" },
    description: t("description"),
    openGraph: baseOpenGraph(hasLocale(routing.locales, locale) ? locale : routing.defaultLocale),
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  themeColor: "#1f3d2b",
};

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  // Only what public client components need (the admin adds the rest).
  const messages = pickMessages(await getMessages(), PUBLIC_CLIENT_NAMESPACES);

  return (
    <html lang={locale} className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
