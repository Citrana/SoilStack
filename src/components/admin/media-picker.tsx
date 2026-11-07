"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MediaGrid, MediaUploader, useMediaLibrary } from "@/components/admin/media-grid";
import { useCan } from "@/lib/use-can";

/**
 * Pick one image from the library (or upload one). Used by the content
 * editors (pages, blog, products, projects): they store the returned id
 * and register it with setMediaUsages on save.
 */
export function MediaPicker({
  open,
  onOpenChange,
  onPick,
  initialId = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (mediaId: Id<"media">) => void;
  initialId?: Id<"media"> | null;
}) {
  const t = useTranslations("Media");
  const canUpload = useCan("media.upload") === true;
  const { results, status, loadMore } = useMediaLibrary(open);
  const [selected, setSelected] = useState<Id<"media"> | null>(initialId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("pickTitle")}</DialogTitle>
          <DialogDescription>{t("pickDescription")}</DialogDescription>
        </DialogHeader>
        {canUpload ? <MediaUploader onUploaded={(ids) => setSelected(ids[0] ?? null)} /> : null}
        {status === "LoadingFirstPage" ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <MediaGrid items={results} selectedId={selected} onSelect={(item) => setSelected(item._id)} />
        )}
        {status === "CanLoadMore" ? (
          <Button variant="outline" className="self-center" onClick={() => loadMore(24)}>
            {t("loadMore")}
          </Button>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              onPick(selected);
              onOpenChange(false);
            }}
          >
            {t("pickConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
