"use client";

import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Translated labels, passed in so public pages ship no client translations. */
export type LocaleSwitcherLabels = { label: string; fr: string; en: string };

/** FR / EN toggle that keeps the visitor on the same page. */
export function LocaleSwitcher({
  labels,
  className,
  tone = "light",
}: {
  labels: LocaleSwitcherLabels;
  className?: string;
  tone?: "light" | "dark";
}) {
  const t = (key: keyof LocaleSwitcherLabels) => labels[key];
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  return (
    <div
      role="group"
      aria-label={t("label")}
      className={cn(
        "inline-flex rounded-full border p-0.5 text-xs",
        tone === "dark" ? "border-white/15 bg-white/5" : "bg-card",
        className,
      )}
    >
      {routing.locales.map((loc: Locale) => (
        <button
          key={loc}
          type="button"
          lang={loc}
          aria-pressed={loc === locale}
          title={t(loc)}
          onClick={() =>
            router.replace(
              // @ts-expect-error -- params always match the current pathname
              { pathname, params },
              { locale: loc },
            )
          }
          className={cn(
            "min-h-9 min-w-11 rounded-full px-3 font-medium uppercase transition-colors",
            loc === locale
              ? tone === "dark"
                ? "bg-white text-ink"
                : "bg-primary text-primary-foreground"
              : tone === "dark"
                ? "text-white/70 hover:text-white"
                : "text-muted-foreground hover:text-foreground",
          )}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}
