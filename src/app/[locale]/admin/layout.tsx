import type { Metadata } from "next";
import { Suspense } from "react";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { Toaster } from "sonner";
import { routing } from "@/i18n/routing";
import { ConvexClientProvider } from "@/lib/convex-client-provider";
import { AdminFrame, FullScreenSpinner } from "@/components/admin/auth-gate";

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]/admin">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale,
    namespace: "Admin",
  });
  // The admin is never indexed.
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/**
 * The only place the Convex React client is loaded (CLAUDE.md,
 * "Performance"): the public site stays free of it. The frame always
 * renders the page; each page gates itself with AuthGate. The frame reads
 * the URL, so it streams in after a spinner.
 */
export default async function AdminLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  // The admin's client components translate everything: give them all
  // messages. The explicit locale keeps this prerenderable (no headers()).
  const { locale } = await params;
  const messages = await getMessages({ locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale });
  return (
    <NextIntlClientProvider messages={messages}>
      <ConvexClientProvider>
        <Suspense fallback={<FullScreenSpinner />}>
          <AdminFrame>{children}</AdminFrame>
        </Suspense>
        <Toaster position="top-center" richColors closeButton />
      </ConvexClientProvider>
    </NextIntlClientProvider>
  );
}
