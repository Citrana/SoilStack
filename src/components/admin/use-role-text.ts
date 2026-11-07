"use client";

import { useLocale } from "next-intl";
import { pickLoc, type Loc } from "../../../convex/lib/i18n";
import type { Locale } from "@/i18n/routing";

/** A role's name/description in the current language (stored in both). */
export function useRoleText() {
  const locale = useLocale() as Locale;
  return (role: { name: Loc; description?: Loc }) => ({
    name: pickLoc(role.name, locale),
    description: role.description ? pickLoc(role.description, locale) : "",
  });
}
