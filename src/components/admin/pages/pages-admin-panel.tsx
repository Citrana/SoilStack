"use client";

import { ArrowRight } from "lucide-react";
import { useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { api } from "../../../../convex/_generated/api";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { AccessDenied, PageHeader } from "@/components/admin/page-header";
import { useMyPermissions } from "@/lib/use-can";

/** /admin/pages: the six company pages and their publishing status. */
export function PagesAdminPanel() {
  const t = useTranslations("Pages");
  const tNames = useTranslations("Pages.names");
  const locale = useLocale();
  const permissions = useMyPermissions();
  const allowed = permissions === undefined ? undefined : permissions.has("pages.edit") || permissions.has("pages.publish");
  const pages = useQuery(api.pages.listForAdmin, allowed ? {} : "skip");

  if (allowed === undefined) return null;
  if (!allowed) return <AccessDenied message={t("accessDenied")} />;
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <ul className="grid gap-3 sm:grid-cols-2">
        {(pages ?? []).map((page) => (
          <li key={page.key}>
            <Link
              href={{ pathname: "/admin/pages/[key]", params: { key: page.key } }}
              className="group flex h-full flex-col gap-2 rounded-2xl border bg-card p-5 transition-colors hover:border-leaf"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{tNames(page.key)}</span>
                {page.hasUnpublishedChanges ? (
                  <Badge variant="secondary">{t("unpublishedChanges")}</Badge>
                ) : page.published ? (
                  <Badge>{t("upToDate")}</Badge>
                ) : (
                  <Badge variant="outline">{t("neverPublished")}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {page.publishedAt ? t("lastPublished", { date: dateFormat.format(page.publishedAt) }) : t("neverPublished")}
              </p>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-leaf">
                {t("edit")}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
