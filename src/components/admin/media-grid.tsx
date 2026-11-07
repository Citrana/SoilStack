"use client";

import { useRef, useState, type DragEvent } from "react";
import Image from "next/image";
import { CircleAlert, CircleCheck, Loader2, Upload } from "lucide-react";
import { usePaginatedQuery, type PaginatedQueryItem } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { MEDIA_LIMITS } from "../../../convex/lib/media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUploadImages, type UploadItem } from "@/components/admin/use-upload-images";
import { cn } from "@/lib/utils";

export type MediaItem = PaginatedQueryItem<typeof api.media.list>;

const PAGE_SIZE = 24;

/** The library as a paginated list ("load more"), shared by page and picker. */
export function useMediaLibrary(enabled: boolean) {
  return usePaginatedQuery(api.media.list, enabled ? {} : "skip", { initialNumItems: PAGE_SIZE });
}

export function hasMissingAlt(item: Pick<MediaItem, "alt">) {
  return !item.alt.fr.trim() || !item.alt.en.trim();
}

/** Responsive thumbnail grid: 2 columns on phones up to 5 on desktop. */
export function MediaGrid({
  items,
  onSelect,
  selectedId,
}: {
  items: MediaItem[];
  onSelect: (item: MediaItem) => void;
  selectedId?: Id<"media"> | null;
}) {
  const t = useTranslations("Media");
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => (
        <li key={item._id}>
          <button
            type="button"
            onClick={() => onSelect(item)}
            aria-pressed={selectedId ? selectedId === item._id : undefined}
            className={cn(
              "group relative block w-full overflow-hidden rounded-xl border bg-muted text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              selectedId === item._id && "ring-3 ring-leaf",
            )}
          >
            <span className="relative block aspect-square">
              {item.url ? (
                <Image
                  src={item.url}
                  alt={item.alt.fr || item.alt.en || item.filename}
                  fill
                  sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  placeholder="blur"
                  blurDataURL={item.blurDataUrl}
                  className="object-cover transition-transform group-hover:scale-[1.02]"
                />
              ) : null}
            </span>
            <span className="flex items-center justify-between gap-1 px-2 py-1.5">
              <span className="truncate text-xs">{item.filename}</span>
              {item.usageCount > 0 ? (
                <Badge variant="secondary" className="shrink-0">
                  {t("usedCount", { count: item.usageCount })}
                </Badge>
              ) : null}
            </span>
            {hasMissingAlt(item) ? (
              <Badge variant="outline" className="absolute top-2 left-2 bg-card/90">
                {t("missingAlt")}
              </Badge>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

function UploadStatus({ item }: { item: UploadItem }) {
  const t = useTranslations("Media");
  const tErrors = useTranslations("Errors");
  return (
    <li className="flex items-center gap-2 text-sm">
      {item.status === "done" ? (
        <CircleCheck className="size-4 shrink-0 text-leaf" aria-hidden />
      ) : item.status === "error" ? (
        <CircleAlert className="size-4 shrink-0 text-destructive" aria-hidden />
      ) : (
        <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
      )}
      <span className="min-w-0 flex-1 truncate">{item.name}</span>
      <span className={cn("shrink-0 text-xs", item.status === "error" ? "text-destructive" : "text-muted-foreground")}>
        {item.status === "error"
          ? item.error === "generic" || !item.error
            ? tErrors("generic")
            : tErrors(item.error)
          : t(`status.${item.status}`)}
      </span>
    </li>
  );
}

/**
 * Upload button + drop zone (desktop) with a status line per file. Calls
 * `onUploaded` with the new image ids.
 */
export function MediaUploader({ onUploaded }: { onUploaded?: (ids: Id<"media">[]) => void }) {
  const t = useTranslations("Media");
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, items, busy, clearFinished } = useUploadImages();
  const [dragging, setDragging] = useState(false);

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    const ids = await upload([...list]);
    if (ids.length > 0) onUploaded?.(ids);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    void handleFiles(event.dataTransfer.files);
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition-colors sm:p-6",
          dragging ? "border-leaf bg-lime-tint/40" : "border-border bg-card",
        )}
      >
        <Button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />}
          {busy ? t("uploading") : t("upload")}
        </Button>
        <p className="hidden text-sm text-muted-foreground sm:block">{t("dropHint")}</p>
        <p className="text-xs text-muted-foreground">{t("limits", { mb: MEDIA_LIMITS.maxBytes / 1024 / 1024 })}</p>
        <input
          ref={inputRef}
          type="file"
          accept={MEDIA_LIMITS.mimeTypes.join(",")}
          multiple
          hidden
          onChange={(event) => {
            void handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
      {items.length > 0 ? (
        <div className="rounded-xl border bg-card p-3">
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <UploadStatus key={item.key} item={item} />
            ))}
          </ul>
          {!busy ? (
            <Button variant="ghost" size="sm" className="mt-2" onClick={clearFinished}>
              {t("clearList")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
