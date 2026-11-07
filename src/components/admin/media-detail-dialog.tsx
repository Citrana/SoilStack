"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Loc } from "../../../convex/lib/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LocalizedField } from "@/components/admin/localized-field";
import { useErrorMessage } from "@/lib/errors";
import { formatBytes } from "@/lib/image";
import { useCan } from "@/lib/use-can";

function AltForm({ mediaId, initial, canEdit }: { mediaId: Id<"media">; initial: Loc; canEdit: boolean }) {
  const t = useTranslations("Media");
  const errorMessage = useErrorMessage();
  const updateAlt = useMutation(api.media.updateAlt);
  const [alt, setAlt] = useState<Loc>(initial);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await updateAlt({ mediaId, alt });
      toast.success(t("altSaved"));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <LocalizedField id={`alt-${mediaId}`} label={t("altLabel")} value={alt} onChange={setAlt} disabled={!canEdit} />
      <p className="text-xs text-muted-foreground">{t("altHint")}</p>
      {canEdit ? (
        <Button type="submit" className="self-start" disabled={saving}>
          {saving ? t("saving") : t("saveAlt")}
        </Button>
      ) : null}
    </form>
  );
}

/** One image: preview, details, FR/EN alt text, where it's used, delete. */
export function MediaDetailDialog({
  mediaId,
  onClose,
}: {
  mediaId: Id<"media"> | null;
  onClose: () => void;
}) {
  const t = useTranslations("Media");
  const tEntities = useTranslations("AuditLog.entities");
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const canUpload = useCan("media.upload") === true;
  const canDelete = useCan("media.delete") === true;
  const media = useQuery(api.media.get, mediaId ? { mediaId } : "skip");
  const remove = useMutation(api.media.remove);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!mediaId) return;
    setDeleting(true);
    try {
      await remove({ mediaId });
      toast.success(t("deleted"));
      setConfirming(false);
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  const ownerLabel = (table: string) =>
    tEntities.has(table as never) ? tEntities(table as never) : table;

  return (
    <Dialog
      open={mediaId !== null}
      onOpenChange={(open) => {
        if (!open) {
          setConfirming(false);
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        {media ? (
          <>
            <DialogHeader>
              <DialogTitle className="truncate pr-8">{media.filename}</DialogTitle>
              <DialogDescription>
                {media.width} × {media.height} · {formatBytes(media.size, locale)}
                {media.uploadedByName ? ` · ${t("uploadedBy", { name: media.uploadedByName })}` : ""}
              </DialogDescription>
            </DialogHeader>
            {media.url ? (
              <div className="relative overflow-hidden rounded-lg bg-muted" style={{ aspectRatio: `${media.width} / ${media.height}` }}>
                <Image
                  src={media.url}
                  alt={media.alt.fr || media.alt.en || media.filename}
                  fill
                  sizes="(min-width: 640px) 640px, 100vw"
                  placeholder="blur"
                  blurDataURL={media.blurDataUrl}
                  className="object-contain"
                />
              </div>
            ) : null}
            <AltForm key={media._id} mediaId={media._id} initial={media.alt} canEdit={canUpload} />
            <section className="flex flex-col gap-1">
              <h3 className="text-sm font-medium">{t("usedByTitle")}</h3>
              {media.usedBy.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("notUsed")}</p>
              ) : (
                <ul className="list-disc pl-5 text-sm">
                  {media.usedBy.map((usage) => (
                    <li key={`${usage.ownerTable}-${usage.ownerId}-${usage.field}`}>
                      {ownerLabel(usage.ownerTable)} <span className="text-muted-foreground">({usage.field})</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            {canDelete ? (
              <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                {confirming ? (
                  <>
                    <p className="w-full text-sm">{t("deleteConfirm")}</p>
                    <Button variant="outline" onClick={() => setConfirming(false)}>
                      {t("cancel")}
                    </Button>
                    <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
                      <Trash2 aria-hidden />
                      {t("delete")}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="destructive" disabled={media.usedBy.length > 0} onClick={() => setConfirming(true)}>
                      <Trash2 aria-hidden />
                      {t("delete")}
                    </Button>
                    {media.usedBy.length > 0 ? (
                      <p className="text-xs text-muted-foreground">{t("deleteBlocked")}</p>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </>
        ) : (
          <DialogHeader>
            <DialogTitle>{t("loading")}</DialogTitle>
          </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  );
}
