import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { DEFAULT_PAGES } from "./lib/defaultContent";
import type { RichDoc } from "./lib/richText";
import { newSection } from "./lib/sections";
import { asUser, getRoleId, insertUserWithRole, setupTest, type T } from "./lib/test.utils";

const doc = (text: string, mediaId?: string): RichDoc => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }, ...(mediaId ? [{ type: "mediaImage", attrs: { mediaId } }] : [])],
});

async function setup() {
  const t = await setupTest();
  await t.mutation(internal.pages.seedContent, {});
  const editorId = await insertUserWithRole(t, "content_editor"); // projects.manage via the seed step
  const adminId = await insertUserWithRole(t, "super_admin");
  return { t, editorId, adminId };
}

async function storeImage(t: T, userId: Id<"users">) {
  const storageId = await t.run((ctx) => ctx.storage.store(new Blob([new Uint8Array(10)], { type: "image/webp" })));
  const result = await asUser(t, userId).mutation(api.media.saveMedia, {
    storageId, filename: "p.webp", alt: { fr: "", en: "" }, width: 1200, height: 800, blurDataUrl: "data:image/webp;base64,x",
  });
  if (!result.ok) throw new Error("refused");
  return result.mediaId;
}

const content = (projectId: Id<"projects">, slug: string, extra: Record<string, unknown> = {}) => ({
  projectId,
  slug,
  title: { fr: `Projet ${slug}`, en: `Project ${slug}` },
  summary: { fr: "Résumé", en: "Summary" },
  body: { fr: doc("Histoire"), en: doc("Story") },
  stage: "in_progress" as const,
  location: { fr: "Nord-Kivu", en: "North Kivu" },
  year: "2026",
  galleryIds: [] as Id<"media">[],
  ...extra,
});

async function publishedProject(t: T, userId: Id<"users">, slug: string, extra: Record<string, unknown> = {}) {
  const projectId = await asUser(t, userId).mutation(api.projects.create, { title: { fr: slug, en: "" } });
  await asUser(t, userId).mutation(api.projects.update, content(projectId, slug, extra));
  await asUser(t, userId).mutation(api.projects.publish, { projectId });
  return projectId;
}

test("only projects.manage holders manage projects; the Content Editor has it", async () => {
  const { t, editorId } = await setup();
  const writerId = await insertUserWithRole(t, "blog_writer");
  const productManagerId = await insertUserWithRole(t, "product_manager");
  for (const userId of [writerId, productManagerId]) {
    await expect(asUser(t, userId).mutation(api.projects.create, { title: { fr: "x", en: "" } })).rejects.toThrow(/projects\.manage/);
    await expect(asUser(t, userId).query(api.projects.listForAdmin, {})).rejects.toThrow(/projects\.manage/);
  }
  await expect(t.mutation(api.projects.create, { title: { fr: "x", en: "" } })).rejects.toThrow(/NOT_AUTHENTICATED/);
  await publishedProject(t, editorId, "plateforme");
  expect((await t.query(api.projects.listPublished, {})).map((p) => p.slug)).toEqual(["plateforme"]);
});

test("the seed step grants projects.manage to the Content Editor once; a revoke sticks", async () => {
  const { t, adminId } = await setup();
  const roleId = await getRoleId(t, "content_editor");
  const role = await asUser(t, adminId).query(api.rbac.getRole, { roleId });
  expect(role!.modules.flatMap((m) => m.permissions).find((p) => p.key === "projects.manage")?.granted).toBe(true);
  await asUser(t, adminId).mutation(api.rbac.setRolePermission, { roleId, permissionKey: "projects.manage", granted: false });
  await t.mutation(internal.rbac.seedRbac, {});
  const again = await asUser(t, adminId).query(api.rbac.getRole, { roleId });
  expect(again!.modules.flatMap((m) => m.permissions).find((p) => p.key === "projects.manage")?.granted).toBe(false);
});

test("publish needs title, summary and story in both languages", async () => {
  const { t, editorId } = await setup();
  const projectId = await asUser(t, editorId).mutation(api.projects.create, { title: { fr: "Seulement FR", en: "" } });
  await expect(asUser(t, editorId).mutation(api.projects.publish, { projectId })).rejects.toThrow(/summary\.fr.*title\.en/);
  await expect(asUser(t, editorId).mutation(api.projects.update, content(projectId, "x", { year: "2025 jusqu'à 2030 et plus" }))).rejects.toThrow(/INVALID_INPUT/);
});

test("public queries keep the manual order, hide drafts and editors; move swaps the order", async () => {
  const { t, editorId } = await setup();
  const a = await publishedProject(t, editorId, "a");
  await publishedProject(t, editorId, "b");
  await asUser(t, editorId).mutation(api.projects.create, { title: { fr: "Brouillon", en: "" } });
  expect((await t.query(api.projects.listPublished, {})).map((p) => p.slug)).toEqual(["a", "b"]);

  await asUser(t, editorId).mutation(api.projects.move, { projectId: a, direction: "down" });
  expect((await t.query(api.projects.listPublished, {})).map((p) => p.slug)).toEqual(["b", "a"]);
  const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
  expect(scheduled.at(-1)?.args).toEqual([{ tags: ["projects"] }]);

  const project = await t.query(api.projects.getBySlug, { slug: "a" });
  expect(project).toMatchObject({ stage: "in_progress", year: "2026", location: { en: "North Kivu" } });
  expect(project).not.toHaveProperty("status");
  expect(project).not.toHaveProperty("updatedBy");
  expect(project!.others.map((p) => p.slug)).toEqual(["b"]);
  expect(await t.query(api.projects.getBySlug, { slug: "brouillon" })).toBeNull();
  expect((await t.query(api.projects.publishedSlugs, {})).length).toBe(2);
});

test("renaming a published project refreshes both addresses; changes are audited", async () => {
  const { t, editorId } = await setup();
  const projectId = await publishedProject(t, editorId, "ancien");
  await asUser(t, editorId).mutation(api.projects.update, content(projectId, "nouveau"));
  const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
  expect(scheduled.at(-1)?.args).toEqual([{ tags: ["projects", "project:ancien", "project:nouveau"] }]);
  const actions = (await t.run((ctx) => ctx.db.query("auditLogs").withIndex("by_entityTable_and_timestamp", (q) => q.eq("entityTable", "projects")).collect())).map((l) => l.action);
  expect(actions).toEqual(["create", "update", "publish", "update"]);
});

test("cover, gallery and story images are protected, and freed when a draft is deleted", async () => {
  const { t, editorId, adminId } = await setup();
  const [cover, photo, inline] = await Promise.all([storeImage(t, adminId), storeImage(t, adminId), storeImage(t, adminId)]);
  const projectId = await publishedProject(t, editorId, "photos", {
    coverImageId: cover,
    galleryIds: [photo],
    body: { fr: doc("fr", inline), en: doc("en") },
  });
  for (const mediaId of [cover, photo, inline]) {
    await expect(asUser(t, adminId).mutation(api.media.remove, { mediaId })).rejects.toThrow(/MEDIA_IN_USE/);
  }
  const project = await t.query(api.projects.getBySlug, { slug: "photos" });
  expect(project!.gallery).toHaveLength(1);
  expect(Object.keys(project!.bodyImages)).toEqual([inline]);

  await expect(asUser(t, editorId).mutation(api.projects.remove, { projectId })).rejects.toThrow(/Unpublish/);
  await asUser(t, editorId).mutation(api.projects.unpublish, { projectId });
  await asUser(t, editorId).mutation(api.projects.remove, { projectId });
  for (const mediaId of [cover, photo, inline]) await asUser(t, adminId).mutation(api.media.remove, { mediaId });
});

test("the starter projects are seeded once, as drafts", async () => {
  const { t, adminId } = await setup();
  expect(await t.mutation(internal.projects.seedProjects, {})).toBe(4);
  expect(await t.mutation(internal.projects.seedProjects, {})).toBe(0);
  const list = await asUser(t, adminId).query(api.projects.listForAdmin, {});
  expect(list.map((p) => [p.slug, p.status, p.stage])).toEqual([
    ["plateforme-soilstack", "draft", "in_progress"],
    ["drones", "draft", "planned"],
    ["intrants", "draft", "planned"],
    ["api-partenaires", "draft", "planned"],
  ]);
  expect(await t.query(api.projects.listPublished, {})).toEqual([]);
});

test("a projectsList section shows published projects in order", async () => {
  const { t, editorId, adminId } = await setup();
  await publishedProject(t, editorId, "un");
  await publishedProject(t, editorId, "deux");
  await asUser(t, editorId).mutation(api.projects.create, { title: { fr: "Brouillon", en: "" } });
  const sections = [...DEFAULT_PAGES.projects.sections, newSection("projectsList")];
  await asUser(t, adminId).mutation(api.pages.saveDraft, { key: "projects", seo: DEFAULT_PAGES.projects.seo, sections });
  await asUser(t, adminId).mutation(api.pages.publish, { key: "projects" });
  const page = await t.query(api.pages.getPublished, { key: "projects" });
  const section = page!.sections.find((s) => s.type === "projectsList") as { projects: Array<{ slug: string }> };
  expect(section.projects.map((p) => p.slug)).toEqual(["un", "deux"]);
});
