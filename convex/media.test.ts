import { expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { clearMediaUsages, MEDIA_LIMITS, setMediaUsages } from "./lib/media";
import { asUser, insertRole, insertUserWithRole, setupTest, type T } from "./lib/test.utils";

const BLUR = "data:image/webp;base64,UklGRg==";
const ALT = { fr: "Champ de maïs", en: "Corn field" };

async function storeFile(t: T, type = "image/webp", bytes = 1024) {
  return await t.run((ctx) => ctx.storage.store(new Blob([new Uint8Array(bytes)], { type })));
}

async function upload(t: T, userId: Id<"users">, overrides: Partial<{ type: string; bytes: number }> = {}) {
  const storageId = await storeFile(t, overrides.type, overrides.bytes);
  const result = await asUser(t, userId).mutation(api.media.saveMedia, {
    storageId,
    filename: " corn.webp ",
    alt: ALT,
    width: 2000,
    height: 1333,
    blurDataUrl: BLUR,
  });
  return { storageId, result };
}

async function uploaded(t: T, userId: Id<"users">) {
  const { result } = await upload(t, userId);
  if (!result.ok) throw new Error("upload refused");
  return result.mediaId;
}

const PAGE = { numItems: 20, cursor: null };

test("saveMedia stores an image with an audit entry; generateUploadUrl and saveMedia need media.upload", async () => {
  const t = await setupTest();
  const adminId = await insertUserWithRole(t, "super_admin");
  const writerId = await insertUserWithRole(t, "blog_writer"); // has media.upload
  const editorId = await insertUserWithRole(t, null);

  expect(await asUser(t, writerId).mutation(api.media.generateUploadUrl, {})).toBeTypeOf("string");
  await expect(asUser(t, editorId).mutation(api.media.generateUploadUrl, {})).rejects.toThrow(/media\.upload/);
  await expect(t.mutation(api.media.generateUploadUrl, {})).rejects.toThrow(/NOT_AUTHENTICATED/);

  const mediaId = await uploaded(t, adminId);
  const media = await t.run((ctx) => ctx.db.get("media", mediaId));
  expect(media).toMatchObject({ filename: "corn.webp", mimeType: "image/webp", size: 1024, width: 2000, alt: ALT });
  const log = await t.run((ctx) => ctx.db.query("auditLogs").first());
  expect(log).toMatchObject({ action: "create", entityTable: "media", after: { filename: "corn.webp" } });

  const storageId = await storeFile(t);
  await expect(
    asUser(t, editorId).mutation(api.media.saveMedia, {
      storageId,
      filename: "x.webp",
      alt: ALT,
      width: 10,
      height: 10,
      blurDataUrl: BLUR,
    }),
  ).rejects.toThrow(/media\.upload/);
});

test("saveMedia refuses a wrong type or an oversized file, and deletes the stored file", async () => {
  const t = await setupTest();
  const adminId = await insertUserWithRole(t, "super_admin");

  const text = await upload(t, adminId, { type: "text/plain" });
  expect(text.result).toEqual({ ok: false, code: "INVALID_FILE" });
  expect(await t.run((ctx) => ctx.db.system.get("_storage", text.storageId))).toBeNull();

  const big = await upload(t, adminId, { bytes: MEDIA_LIMITS.maxBytes + 1 });
  expect(big.result).toEqual({ ok: false, code: "FILE_TOO_LARGE" });
  expect(await t.run((ctx) => ctx.db.system.get("_storage", big.storageId))).toBeNull();

  expect(await t.run((ctx) => ctx.db.query("media").collect())).toEqual([]);
});

test("list returns images newest first with URLs and usage counts; content editors can browse", async () => {
  const t = await setupTest();
  const adminId = await insertUserWithRole(t, "super_admin");
  const first = await uploaded(t, adminId);
  const second = await uploaded(t, adminId);
  await t.run((ctx) => setMediaUsages(ctx, { ownerTable: "users", ownerId: "owner-1" }, [{ mediaId: first, field: "cover" }]));

  const pagesEditorRole = await insertRole(t, "pages_only", ["pages.edit"]);
  const editorId = await t.run((ctx) =>
    ctx.db.insert("users", {
      name: "Editor",
      email: "pages-editor@example.com",
      roleId: pagesEditorRole,
      status: "active",
      mustChangePassword: false,
      createdBy: null,
    }),
  );
  const { page } = await asUser(t, editorId).query(api.media.list, { paginationOpts: PAGE });
  expect(page.map((m) => m._id)).toEqual([second, first]);
  expect(page.map((m) => m.usageCount)).toEqual([0, 1]);
  expect(page[0].url).toMatch(/^https?:\/\//);

  const nobodyId = await insertUserWithRole(t, null);
  await expect(asUser(t, nobodyId).query(api.media.list, { paginationOpts: PAGE })).rejects.toThrow(/FORBIDDEN/);
});

test("get shows who uses an image; updateAlt trims and audits only real changes", async () => {
  const t = await setupTest();
  const adminId = await insertUserWithRole(t, "super_admin");
  const mediaId = await uploaded(t, adminId);
  await t.run((ctx) =>
    setMediaUsages(ctx, { ownerTable: "users", ownerId: "owner-1" }, [{ mediaId, field: "gallery" }]),
  );

  const detail = await asUser(t, adminId).query(api.media.get, { mediaId });
  expect(detail?.usedBy).toEqual([{ ownerTable: "users", ownerId: "owner-1", field: "gallery" }]);

  await asUser(t, adminId).mutation(api.media.updateAlt, { mediaId, alt: { fr: " Maïs ", en: "Corn" } });
  await asUser(t, adminId).mutation(api.media.updateAlt, { mediaId, alt: { fr: "Maïs", en: "Corn" } });
  const updates = await t.run((ctx) =>
    ctx.db
      .query("auditLogs")
      .withIndex("by_entityTable_and_timestamp", (q) => q.eq("entityTable", "media"))
      .collect(),
  );
  expect(updates.map((l) => l.action)).toEqual(["create", "update"]);
  expect(updates[1].after).toMatchObject({ alt: { fr: "Maïs", en: "Corn" } });

  const nobodyId = await insertUserWithRole(t, "content_editor");
  const roleWithoutUpload = await insertRole(t, "pages_editor_only", ["pages.edit"]);
  await t.run((ctx) => ctx.db.patch("users", nobodyId, { roleId: roleWithoutUpload }));
  await expect(
    asUser(t, nobodyId).mutation(api.media.updateAlt, { mediaId, alt: ALT }),
  ).rejects.toThrow(/media\.upload/);
});

test("remove is refused while an image is used, then deletes the file and audits", async () => {
  const t = await setupTest();
  const adminId = await insertUserWithRole(t, "super_admin");
  const writerId = await insertUserWithRole(t, "blog_writer"); // no media.delete
  const mediaId = await uploaded(t, adminId);
  const owner = { ownerTable: "users" as const, ownerId: "owner-1" };
  await t.run((ctx) => setMediaUsages(ctx, owner, [{ mediaId, field: "cover" }]));

  await expect(asUser(t, writerId).mutation(api.media.remove, { mediaId })).rejects.toThrow(/media\.delete/);
  await expect(asUser(t, adminId).mutation(api.media.remove, { mediaId })).rejects.toThrow(/MEDIA_IN_USE/);

  await t.run((ctx) => clearMediaUsages(ctx, owner));
  const storageId = (await t.run((ctx) => ctx.db.get("media", mediaId)))!.storageId;
  await asUser(t, adminId).mutation(api.media.remove, { mediaId });
  expect(await t.run((ctx) => ctx.db.get("media", mediaId))).toBeNull();
  expect(await t.run((ctx) => ctx.db.system.get("_storage", storageId))).toBeNull();
  const log = await t.run((ctx) =>
    ctx.db
      .query("auditLogs")
      .withIndex("by_entityTable_and_entityId_and_timestamp", (q) =>
        q.eq("entityTable", "media").eq("entityId", mediaId),
      )
      .collect(),
  );
  expect(log.map((l) => l.action)).toEqual(["create", "delete"]);
});

test("setMediaUsages replaces previous usages, dedupes, and refuses unknown images", async () => {
  const t = await setupTest();
  const adminId = await insertUserWithRole(t, "super_admin");
  const a = await uploaded(t, adminId);
  const b = await uploaded(t, adminId);
  const owner = { ownerTable: "users" as const, ownerId: "owner-1" };

  await t.run((ctx) =>
    setMediaUsages(ctx, owner, [
      { mediaId: a, field: "cover" },
      { mediaId: a, field: "cover" },
      { mediaId: b, field: "gallery" },
    ]),
  );
  await t.run((ctx) => setMediaUsages(ctx, owner, [{ mediaId: b, field: "cover" }]));
  const usages = await t.run((ctx) => ctx.db.query("mediaUsages").collect());
  expect(usages.map((u) => [u.mediaId, u.field])).toEqual([[b, "cover"]]);

  await asUser(t, adminId).mutation(api.media.remove, { mediaId: a });
  await expect(
    t.run((ctx) => setMediaUsages(ctx, owner, [{ mediaId: a, field: "cover" }])),
  ).rejects.toThrow(/NOT_FOUND/);
});
