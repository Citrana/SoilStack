import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id, TableNames } from "../_generated/dataModel";
import { appError } from "./errors";
import type { Loc } from "./i18n";
import type { PermissionKey } from "./permissions";

/** What the library accepts (checked again on the server after upload). */
export const MEDIA_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
  /** Longest side after the browser resizes an image. */
  maxDimension: 2000,
} as const;

/**
 * Who may browse the library and pick images: uploaders, deleters, and
 * everyone who edits content that shows images.
 */
export const MEDIA_BROWSE_PERMISSIONS: readonly PermissionKey[] = [
  "media.upload",
  "media.delete",
  "pages.edit",
  "blog.write",
  "products.manage",
  "projects.manage",
  "settings.manage",
];

export type MediaOwner = { ownerTable: TableNames; ownerId: string };
export type MediaRef = { mediaId: Id<"media">; field: string };

/**
 * Records which images `owner` uses, replacing what it used before. Every
 * feature that saves image references calls this in the same mutation
 * (CLAUDE.md, "Images"), so an image in use can't be deleted. Refuses ids
 * of images that don't exist.
 */
export async function setMediaUsages(
  ctx: MutationCtx,
  owner: MediaOwner,
  refs: readonly MediaRef[],
): Promise<void> {
  for (const { mediaId } of refs) {
    if (!(await ctx.db.get("media", mediaId))) {
      throw appError("NOT_FOUND", "Image not found.");
    }
  }
  await clearMediaUsages(ctx, owner);
  const seen = new Set<string>();
  for (const { mediaId, field } of refs) {
    const key = `${mediaId}:${field}`;
    if (seen.has(key)) continue;
    seen.add(key);
    await ctx.db.insert("mediaUsages", { mediaId, field, ...owner });
  }
}

/** Removes every usage of `owner` (e.g. when the owner is deleted). */
export async function clearMediaUsages(
  ctx: MutationCtx,
  owner: MediaOwner,
): Promise<void> {
  const existing = await ctx.db
    .query("mediaUsages")
    .withIndex("by_ownerTable_and_ownerId", (q) =>
      q.eq("ownerTable", owner.ownerTable).eq("ownerId", owner.ownerId),
    )
    .take(500);
  for (const usage of existing) {
    await ctx.db.delete("mediaUsages", usage._id);
  }
}

/** The records still using an image (at most `limit`). */
export async function mediaUsedBy(
  ctx: QueryCtx,
  mediaId: Id<"media">,
  limit = 50,
): Promise<Array<Pick<Doc<"mediaUsages">, "ownerTable" | "ownerId" | "field">>> {
  const usages = await ctx.db
    .query("mediaUsages")
    .withIndex("by_mediaId", (q) => q.eq("mediaId", mediaId))
    .take(limit);
  return usages.map(({ ownerTable, ownerId, field }) => ({ ownerTable, ownerId, field }));
}

export type PublicImage = {
  url: string;
  width: number;
  height: number;
  blurDataUrl: string;
  alt: Loc;
};

/**
 * An image as the public site needs it (for next/image), or null if it is
 * gone. Public queries in later features use this - never the raw row.
 */
export async function publicImage(
  ctx: QueryCtx,
  mediaId: Id<"media"> | undefined | null,
): Promise<PublicImage | null> {
  if (!mediaId) return null;
  const media = await ctx.db.get("media", mediaId);
  if (!media) return null;
  const url = await ctx.storage.getUrl(media.storageId);
  if (!url) return null;
  return {
    url,
    width: media.width,
    height: media.height,
    blurDataUrl: media.blurDataUrl,
    alt: media.alt,
  };
}
