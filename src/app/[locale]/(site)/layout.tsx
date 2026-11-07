import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { getSettings } from "@/lib/content";
import { Footer } from "@/components/site/footer";
import { Navbar } from "@/components/site/navbar";

/** Public site frame: floating navbar + footer. Server-rendered and cached. */
export default async function SiteLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const settings = await getSettings();
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} locale={locale} />
    </>
  );
}
