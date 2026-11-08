"use client";

import { useTranslations } from "next-intl";
import type { LocaleSwitcherLabels } from "@/components/locale-switcher";

/** LocaleSwitcher labels for admin client components (they have all messages). */
export function useLocaleSwitcherLabels(): LocaleSwitcherLabels {
  const t = useTranslations("LocaleSwitcher");
  return { label: t("label"), fr: t("fr"), en: t("en") };
}
