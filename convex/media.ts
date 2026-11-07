import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { diff, snapshot } from "./lib/audit";
import { appError } from "./lib/errors";
import { locValidator, trimLoc } from "./lib/i18n";
import {
  MEDIA_BROWSE_PERMISSIONS,
  MEDIA_LIMITS,
  mediaUsedBy,
  publicImage,
  type PublicImage,
} from "./lib/media";
import { authedMutation, authedQuery } from "./lib/rbac";

const MAX_BLUR_LENGTH = 4000;
const MAX_DIMENSION = 10000;

/** Step 1 of an upload: a short-lived URL the browser POSTs the file to. */
export const generateUploadUrl = authedMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await ctx.requirePermission("media.upload");
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Step 2: records an uploaded file in the library. The browser already
 * resized it (src/lib/image.ts); the server still checks the stored file's
 * real type and size. A refused file is deleted and the refusal is
 * *returned*, not thrown: throwing would roll the deletion back too.
 */
export const saveMedia = authedMutation({
  args: {
    storageId: v.id("_storage"),
    filename: v.string(),
    alt: locValidator,
    width: v.number(),
    height: v.number(),
    blurDataUrl: v.string(),
  },
  returns: v.union(
    v.object({ ok: v.literal(true), mediaId: v.id("media") }),
    v.object({
      ok: v.literal(false),
      code: v.union(v.literal("INVALID_FILE"), v.literal("FILE_TOO_LARGE")),
    }),
  ),
  handler: async (ctx, args) => {
    await ctx.requirePermission("media.upload");
    const file = await ctx.db.system.get("_storage", args.storageId);
    if (!file) {
      throw appError("NOT_FOUND", "Uploaded file not found.");
    }
    const mimeType = file.contentType ?? "";
    const validSize = (n: number) => Number.isInteger(n) && n > 0 && n <= MAX_DIMENSION;
    const refusal = !(MEDIA_LIMITS.mimeTypes as readonly string[]).includes(mimeType)
      ? ("INVALID_FILE" as const)
      : file.size > MEDIA_LIMITS.maxBytes
        ? ("FILE_TOO_LARGE" as const)
        : !validSize(args.width) ||
            !validSize(args.height) ||
            !args.blurDataUrl.startsWith("data:image/") ||
            args.blurDataUrl.length > MAX_BLUR_LENGTH
          ? ("INVALID_FILE" as const)
          : null;
    if (refusal) {
      await ctx.storage.delete(args.storageId);
      return { ok: false as const, code: refusal };
    }

    const media = {
      storageId: args.storageId,
      filename: args.filename.trim().slice(0, 200) || "image",
      alt: trimLoc(args.alt),
      mimeType,
      size: file.size,
      width: args.width,
      height: args.height,
      blurDataUrl: args.blurDataUrl,
      uploadedBy: ctx.user._id,
    };
    const mediaId = await ctx.db.insert("media", media);
    await ctx.audit({
      action: "create",
      entityTable: "media",
      entityId: mediaId,
      after: snapshot(media, ["filename", "alt", "mimeType", "size", "width", "height"]),
    });
    return { ok: true as const, mediaId };
  },
});

/** The library, newest first, with a URL and usage count per image. */
export const list = authedQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    await ctx.requireAnyPermission(MEDIA_BROWSE_PERMISSIONS);
    const result = await ctx.db.query("media").order("desc").paginate(paginationOpts);
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (media) => ({
          _id: media._id,
          _creationTime: media._creationTime,
          filename: media.filename,
          alt: media.alt,
          mimeType: media.mimeType,
          size: media.size,
          width: media.width,
          height: media.height,
          blurDataUrl: media.blurDataUrl,
          url: await ctx.storage.getUrl(media.storageId),
          usageCount: (await mediaUsedBy(ctx, media._id)).length,
        })),
      ),
    };
  },
});

/** One image with the records using it. Null for an unknown id. */
export const get = authedQuery({
  args: { mediaId: v.id("media") },
  handler: async (ctx, { mediaId }) => {
    await ctx.requireAnyPermission(MEDIA_BROWSE_PERMISSIONS);
    const media = await ctx.db.get("media", mediaId);
    if (!media) return null;
    const uploader = await ctx.db.get("users", media.uploadedBy);
    return {
      ...media,
      url: await ctx.storage.getUrl(media.storageId),
      uploadedByName: uploader?.name ?? null,
      usedBy: await mediaUsedBy(ctx, mediaId),
    };
  },
});

export const updateAlt = authedMutation({
  args: { mediaId: v.id("media"), alt: locValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.requirePermission("media.upload");
    const media = await ctx.db.get("media", args.mediaId);
    if (!media) {
      throw appError("NOT_FOUND", "Image not found.");
    }
    const alt = trimLoc(args.alt);
    const changes = diff({ alt: media.alt }, { alt });
    if (!changes) return null;
    await ctx.db.patch("media", media._id, { alt });
    await ctx.audit({
      action: "update",
      entityTable: "media",
      entityId: media._id,
      before: { filename: media.filename, ...changes.before },
      after: { filename: media.filename, ...changes.after },
    });
    return null;
  },
});

/** Deletes an unused image and its file. Refused while anything uses it. */
export const remove = authedMutation({
  args: { mediaId: v.id("media") },
  returns: v.null(),
  handler: async (ctx, { mediaId }) => {
    await ctx.requirePermission("media.delete");
    const media = await ctx.db.get("media", mediaId);
    if (!media) {
      throw appError("NOT_FOUND", "Image not found.");
    }
    if ((await mediaUsedBy(ctx, mediaId, 1)).length > 0) {
      throw appError("MEDIA_IN_USE", "This image is still used.");
    }
    await ctx.storage.delete(media.storageId);
    await ctx.db.delete("media", mediaId);
    await ctx.audit({
      action: "delete",
      entityTable: "media",
      entityId: mediaId,
      before: snapshot(media, ["filename", "alt", "mimeType", "size", "width", "height"]),
    });
    return null;
  },
});

/**
 * Images as the public site sees them, for the admin's live preview of an
 * unsaved draft. Unknown ids are left out.
 */
export const publicImages = authedQuery({
  args: { mediaIds: v.array(v.id("media")) },
  handler: async (ctx, { mediaIds }) => {
    await ctx.requireAnyPermission(MEDIA_BROWSE_PERMISSIONS);
    const images: Record<string, PublicImage> = {};
    for (const id of [...new Set(mediaIds)].slice(0, 100)) {
      const image = await publicImage(ctx, id);
      if (image) images[id] = image;
    }
    return images;
  },
});
