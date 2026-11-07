import type { Metadata } from "next";
import { Suspense } from "react";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
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
export default function AdminLayout({ children }: LayoutProps<"/[locale]/admin">) {
  return (
    <ConvexClientProvider>
      <Suspense fallback={<FullScreenSpinner />}>
        <AdminFrame>{children}</AdminFrame>
      </Suspense>
      <Toaster position="top-center" richColors closeButton />
    </ConvexClientProvider>
  );
}
