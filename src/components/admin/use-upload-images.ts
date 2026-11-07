"use client";

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ErrorCode } from "../../../convex/lib/errors";
import { ImagePrepError, prepareImage } from "@/lib/image";

export type UploadItem = {
  key: string;
  name: string;
  status: "preparing" | "uploading" | "saving" | "done" | "error";
  /** Set when status is "error". */
  error?: ErrorCode | "generic";
  mediaId?: Id<"media">;
};

/**
 * Uploads images to the library: resize in the browser (prepareImage),
 * POST to a Convex upload URL, then saveMedia. One status per file.
 */
export function useUploadImages() {
  const generateUploadUrl = useMutation(api.media.generateUploadUrl);
  const saveMedia = useMutation(api.media.saveMedia);
  const [items, setItems] = useState<UploadItem[]>([]);

  const update = (key: string, patch: Partial<UploadItem>) =>
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  const uploadOne = useCallback(
    async (file: File, key: string): Promise<Id<"media"> | null> => {
      try {
        const prepared = await prepareImage(file);
        update(key, { status: "uploading" });
        const url = await generateUploadUrl();
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": prepared.blob.type },
          body: prepared.blob,
        });
        if (!response.ok) throw new Error(`Upload failed (${response.status})`);
        const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
        update(key, { status: "saving" });
        const result = await saveMedia({
          storageId,
          filename: prepared.filename,
          alt: { fr: "", en: "" },
          width: prepared.width,
          height: prepared.height,
          blurDataUrl: prepared.blurDataUrl,
        });
        if (!result.ok) {
          update(key, { status: "error", error: result.code });
          return null;
        }
        update(key, { status: "done", mediaId: result.mediaId });
        return result.mediaId;
      } catch (error) {
        update(key, {
          status: "error",
          error: error instanceof ImagePrepError ? error.code : "generic",
        });
        return null;
      }
    },
    [generateUploadUrl, saveMedia],
  );

  /** Uploads files one after another (kind to slow connections). */
  const upload = useCallback(
    async (files: readonly File[]): Promise<Id<"media">[]> => {
      const batch = files.map((file) => ({
        file,
        key: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      }));
      setItems((prev) => [
        ...prev.filter((item) => item.status !== "done"),
        ...batch.map(({ file, key }) => ({ key, name: file.name, status: "preparing" as const })),
      ]);
      const ids: Id<"media">[] = [];
      for (const { file, key } of batch) {
        const id = await uploadOne(file, key);
        if (id) ids.push(id);
      }
      return ids;
    },
    [uploadOne],
  );

  const clearFinished = useCallback(
    () => setItems((prev) => prev.filter((item) => item.status !== "done" && item.status !== "error")),
    [],
  );

  const busy = items.some((item) => !["done", "error"].includes(item.status));
  return { upload, items, busy, clearFinished };
}
