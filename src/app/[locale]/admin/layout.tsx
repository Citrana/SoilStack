import type { Metadata } from "next";
import { Suspense } from "react";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Toaster } from "sonner";
import { routing } from "@/i18n/routing";
import { ConvexClientProvider } from "@/lib/convex-client-provider";
import { AuthGate, FullScreenSpinner } from "@/components/admin/auth-gate";

/**
 * The admin is gated and rendered in the browser (AuthGate), so its pages
 * are never part of the server-rendered shell: opt out of Next's
 * instant-navigation validation for this segment.
 */
export const instant = false;

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
 * "Performance"): the public site stays free of it. The admin renders in
 * the browser, so the gate (which reads the URL) streams in after a spinner.
 */
export default function AdminLayout({ children }: LayoutProps<"/[locale]/admin">) {
  return (
    <ConvexClientProvider>
      <Suspense fallback={<FullScreenSpinner />}>
        <AuthGate>{children}</AuthGate>
      </Suspense>
      <Toaster position="top-center" richColors closeButton />
    </ConvexClientProvider>
  );
}
