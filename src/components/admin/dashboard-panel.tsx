"use client";

import { ArrowRight } from "lucide-react";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "../../../convex/_generated/api";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { useVisibleNav } from "@/components/admin/admin-shell";

/** Admin home: a greeting and the sections this user can open. */
export function DashboardPanel() {
  const t = useTranslations("Admin.dashboard");
  const tNav = useTranslations("Admin.nav");
  const user = useQuery(api.users.getCurrentUser);
  const sections = useVisibleNav().filter((item) => item.key !== "dashboard");

  return (
    <>
      <PageHeader
        title={t("title", { name: user?.name ?? "" })}
        description={t("subtitle")}
      />
      {sections.length === 0 ? (
        <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          {t("noSections")}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map(({ href, key, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex h-full flex-col gap-3 rounded-2xl border bg-card p-5 transition-colors hover:border-leaf"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-lime-tint text-forest">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="font-medium">{tNav(key)}</span>
                <span className="text-sm text-muted-foreground">{t(`descriptions.${key as Exclude<typeof key, "dashboard">}`)}</span>
                <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-leaf">
                  {t("open")}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
