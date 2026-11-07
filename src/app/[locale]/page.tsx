import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";

/** Placeholder home until the company pages land (feat/site-settings-and-pages). */
export default function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  if (hasLocale(routing.locales, locale)) setRequestLocale(locale);
  const t = useTranslations("Home");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <span className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-leaf">
        {t("eyebrow")}
      </span>
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
        {t("title")}
      </h1>
      <p className="max-w-xl text-muted-foreground">{t("subtitle")}</p>
      <LocaleSwitcher />
    </main>
  );
}
