import { ImageResponse } from "next/og";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "SoilStack";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** Default share image (WhatsApp, Facebook, LinkedIn…) for pages without a photo. */
export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale, namespace: "Metadata" });
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "white",
          background: "linear-gradient(135deg, #1f3d2b 0%, #2c5a3d 60%, #4e8b3a 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="88" height="88" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="8" fill="rgba(255,255,255,0.12)" />
            <path d="M16 5c5.5 2.2 7.7 6.6 6.6 12.1-4.4 0-7.7-2.2-8.8-6.6 0-2.2.6-3.9 2.2-5.5Z" fill="#8bc34a" />
            <rect x="6.5" y="20" width="19" height="2.6" rx="1.3" fill="#c8a27a" />
            <rect x="8.5" y="24.4" width="15" height="2.6" rx="1.3" fill="#a07a52" />
          </svg>
          <span style={{ fontSize: 56, fontWeight: 700 }}>SoilStack</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <span style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, maxWidth: 950 }}>{t("title")}</span>
          <span style={{ fontSize: 30, opacity: 0.85, maxWidth: 950 }}>{t("description")}</span>
        </div>
      </div>
    ),
    size,
  );
}
