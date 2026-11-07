"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Id } from "../../../convex/_generated/dataModel";
import { MEDIA_BROWSE_PERMISSIONS } from "../../../convex/lib/media";
import { Button } from "@/components/ui/button";
import { AccessDenied, PageHeader } from "@/components/admin/page-header";
import { MediaDetailDialog } from "@/components/admin/media-detail-dialog";
import { MediaGrid, MediaUploader, useMediaLibrary } from "@/components/admin/media-grid";
import { useMyPermissions } from "@/lib/use-can";

/** /admin/media: the image library. */
export function MediaLibraryPanel() {
  const t = useTranslations("Media");
  const permissions = useMyPermissions();
  const canBrowse = permissions === undefined ? undefined : MEDIA_BROWSE_PERMISSIONS.some((k) => permissions.has(k));
  const canUpload = permissions?.has("media.upload") === true;
  const { results, status, loadMore } = useMediaLibrary(canBrowse === true);
  const [openId, setOpenId] = useState<Id<"media"> | null>(null);

  if (canBrowse === undefined) return null;
  if (!canBrowse) return <AccessDenied message={t("accessDenied")} />;

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      <div className="flex flex-col gap-6">
        {canUpload ? <MediaUploader /> : null}
        {status === "LoadingFirstPage" ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : results.length === 0 ? (
          <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <MediaGrid items={results} onSelect={(item) => setOpenId(item._id)} />
        )}
        {status === "CanLoadMore" || status === "LoadingMore" ? (
          <Button variant="outline" className="self-center" disabled={status === "LoadingMore"} onClick={() => loadMore(24)}>
            {status === "LoadingMore" ? t("loading") : t("loadMore")}
          </Button>
        ) : null}
      </div>
      <MediaDetailDialog mediaId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
