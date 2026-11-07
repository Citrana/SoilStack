import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { newSection } from "./lib/sections";
import { DEFAULT_PAGES } from "./lib/defaultContent";
import type { RichDoc } from "./lib/richText";
import { asUser, insertRole, insertUserWithRole, setupTest, type T } from "./lib/test.utils";

const doc = (text: string, mediaId?: string): RichDoc => ({
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text }] },
    ...(mediaId ? [{ type: "mediaImage", attrs: { mediaId } }] : []),
  ],
});

async function setup() {
  const t = await setupTest();
  await t.mutation(internal.pages.seedContent, {});
  const adminId = await insertUserWithRole(t, "super_admin");
  const writerId = await insertUserWithRole(t, "blog_writer");
  const otherWriterId = await insertUserWithRole(t, "blog_writer");
  return { t, adminId, writerId, otherWriterId };
}

async function userWith(t: T, key: string, permissions: Parameters<typeof insertRole>[2]) {
  const roleId = await insertRole(t, key, permissions);
  return await t.run((ctx) =>
    ctx.db.insert("users", { name: key, email: `${key}@example.com`, roleId, status: "active", mustChangePassword: false, createdBy: null }),
  );
}

async function storeImage(t: T, adminId: Id<"users">) {
  const storageId = await t.run((ctx) => ctx.storage.store(new Blob([new Uint8Array(10)], { type: "image/webp" })));
  const result = await asUser(t, adminId).mutation(api.media.saveMedia, {
    storageId, filename: "x.webp", alt: { fr: "", en: "" }, width: 800, height: 600, blurDataUrl: "data:image/webp;base64,x",
  });
  if (!result.ok) throw new Error("refused");
  return result.mediaId;
}

const fullContent = (postId: Id<"posts">, slug: string, extra: Record<string, unknown> = {}) => ({
  postId,
  slug,
  title: { fr: "Récolte 2026", en: "Harvest 2026" },
  excerpt: { fr: "Résumé", en: "Summary" },
  body: { fr: doc("Texte français"), en: doc("English text") },
  tags: [" Maïs ", "maïs", "Kivu"],
  ...extra,
});

test("create makes a unique slug from the French title; writers and edit_all can create", async () => {
  const { t, writerId, adminId } = await setup();
  const a = await asUser(t, writerId).mutation(api.posts.create, { title: { fr: "Récolte 2026 : nos résultats !", en: "" } });
  const b = await asUser(t, adminId).mutation(api.posts.create, { title: { fr: "Récolte 2026 : nos résultats !", en: "" } });
  const slugs = await t.run(async (ctx) => [(await ctx.db.get("posts", a))!.slug, (await ctx.db.get("posts", b))!.slug]);
  expect(slugs).toEqual(["recolte-2026-nos-resultats", "recolte-2026-nos-resultats-2"]);

  const publisherOnly = await userWith(t, "publisher", ["blog.publish"]);
  await expect(asUser(t, publisherOnly).mutation(api.posts.create, { title: { fr: "x", en: "" } })).rejects.toThrow(/FORBIDDEN/);
  await expect(t.mutation(api.posts.create, { title: { fr: "x", en: "" } })).rejects.toThrow(/NOT_AUTHENTICATED/);
});

test("update sanitizes the body, cleans tags, computes reading time and audits", async () => {
  const { t, writerId } = await setup();
  const postId = await asUser(t, writerId).mutation(api.posts.create, { title: { fr: "Brouillon", en: "" } });
  await asUser(t, writerId).mutation(api.posts.update, fullContent(postId, "recolte-2026"));
  const post = await t.run((ctx) => ctx.db.get("posts", postId));
  expect(post).toMatchObject({ slug: "recolte-2026", tags: ["maïs", "kivu"], readingMinutes: { fr: 1, en: 1 } });

  await expect(
    asUser(t, writerId).mutation(api.posts.update, {
      ...fullContent(postId, "recolte-2026"),
      body: { fr: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] }] }, en: doc("x") },
    }),
  ).rejects.toThrow(/INVALID_INPUT/);
  await expect(asUser(t, writerId).mutation(api.posts.update, fullContent(postId, "Bad Slug!"))).rejects.toThrow(/INVALID_INPUT/);
  const logs = await t.run((ctx) => ctx.db.query("auditLogs").collect());
  expect(logs.map((l) => l.action)).toEqual(["create", "update"]);
});

test("writers edit their own drafts only; edit_all edits any post; only blog.publish publishes", async () => {
  const { t, writerId, otherWriterId, adminId } = await setup();
  const postId = await asUser(t, writerId).mutation(api.posts.create, { title: { fr: "Le mien", en: "" } });
  await asUser(t, writerId).mutation(api.posts.update, fullContent(postId, "le-mien"));

  await expect(asUser(t, otherWriterId).mutation(api.posts.update, fullContent(postId, "le-mien"))).rejects.toThrow(/FORBIDDEN/);
  expect(await asUser(t, otherWriterId).query(api.posts.getForAdmin, { postId })).toBeNull();
  expect(await asUser(t, otherWriterId).query(api.posts.listForAdmin, {})).toEqual([]);

  await expect(asUser(t, writerId).mutation(api.posts.publish, { postId })).rejects.toThrow(/blog\.publish/);
  await asUser(t, adminId).mutation(api.posts.publish, { postId });

  // Published: the writer can no longer change it; an editor can.
  await expect(asUser(t, writerId).mutation(api.posts.update, fullContent(postId, "le-mien"))).rejects.toThrow(/FORBIDDEN/);
  const editorId = await userWith(t, "editor_all", ["blog.edit_all"]);
  await asUser(t, editorId).mutation(api.posts.update, fullContent(postId, "le-mien", { title: { fr: "Corrigé", en: "Fixed" } }));
  expect((await t.query(api.posts.getBySlug, { slug: "le-mien" }))?.title.fr).toBe("Corrigé");
});

test("publish needs title, summary and text in both languages, and schedules a revalidation", async () => {
  const { t, writerId, adminId } = await setup();
  const postId = await asUser(t, writerId).mutation(api.posts.create, { title: { fr: "Seulement FR", en: "" } });
  await expect(asUser(t, adminId).mutation(api.posts.publish, { postId })).rejects.toThrow(/title\.en/);

  await asUser(t, writerId).mutation(api.posts.update, fullContent(postId, "complet"));
  await asUser(t, adminId).mutation(api.posts.publish, { postId });
  const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
  expect(scheduled.at(-1)?.args).toEqual([{ tags: ["posts", "post:complet"] }]);

  // Renaming a published post refreshes the old and new addresses.
  await asUser(t, adminId).mutation(api.posts.update, fullContent(postId, "nouveau"));
  const last = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
  expect(last.at(-1)?.args).toEqual([{ tags: ["posts", "post:complet", "post:nouveau"] }]);
  expect(await t.query(api.posts.getBySlug, { slug: "complet" })).toBeNull();
});

test("public queries return published posts only, without the author, and paginate", async () => {
  const { t, writerId, adminId } = await setup();
  const ids: Id<"posts">[] = [];
  for (let i = 0; i < 14; i++) {
    const postId = await asUser(t, writerId).mutation(api.posts.create, { title: { fr: `Article ${i}`, en: "" } });
    await asUser(t, writerId).mutation(api.posts.update, fullContent(postId, `article-${i}`));
    if (i < 13) await asUser(t, adminId).mutation(api.posts.publish, { postId });
    ids.push(postId);
  }
  const page1 = await t.query(api.posts.listPublished, { page: 1 });
  expect(page1.posts).toHaveLength(12);
  expect(page1.hasMore).toBe(true);
  expect(page1.posts[0].slug).toBe("article-12");
  const page2 = await t.query(api.posts.listPublished, { page: 2 });
  expect(page2.posts.map((p) => p.slug)).toEqual(["article-0"]);
  expect(page2.hasMore).toBe(false);

  expect(await t.query(api.posts.getBySlug, { slug: "article-13" })).toBeNull(); // draft
  const article = await t.query(api.posts.getBySlug, { slug: "article-5" });
  expect(article).not.toBeNull();
  expect(article).not.toHaveProperty("authorId");
  expect(article).not.toHaveProperty("status");
  expect(article!.related).toHaveLength(3);
  expect((await t.query(api.posts.publishedSlugs, {})).length).toBe(13);
});

test("delete: drafts only, by the author or edit_all", async () => {
  const { t, writerId, otherWriterId, adminId } = await setup();
  const postId = await asUser(t, writerId).mutation(api.posts.create, { title: { fr: "À supprimer", en: "" } });
  await asUser(t, writerId).mutation(api.posts.update, fullContent(postId, "a-supprimer"));
  await expect(asUser(t, otherWriterId).mutation(api.posts.remove, { postId })).rejects.toThrow(/FORBIDDEN/);
  await asUser(t, adminId).mutation(api.posts.publish, { postId });
  await expect(asUser(t, adminId).mutation(api.posts.remove, { postId })).rejects.toThrow(/Unpublish/);
  await asUser(t, adminId).mutation(api.posts.unpublish, { postId });
  await asUser(t, writerId).mutation(api.posts.remove, { postId });
  expect(await t.run((ctx) => ctx.db.get("posts", postId))).toBeNull();
});

test("cover and body images are protected while the post uses them, and freed on delete", async () => {
  const { t, writerId, adminId } = await setup();
  const cover = await storeImage(t, adminId);
  const inline = await storeImage(t, adminId);
  const postId = await asUser(t, writerId).mutation(api.posts.create, { title: { fr: "Images", en: "" } });
  await asUser(t, writerId).mutation(
    api.posts.update,
    fullContent(postId, "images", { coverImageId: cover, body: { fr: doc("fr", inline), en: doc("en") } }),
  );
  await expect(asUser(t, adminId).mutation(api.media.remove, { mediaId: cover })).rejects.toThrow(/MEDIA_IN_USE/);
  await expect(asUser(t, adminId).mutation(api.media.remove, { mediaId: inline })).rejects.toThrow(/MEDIA_IN_USE/);

  await asUser(t, adminId).mutation(api.posts.publish, { postId });
  const article = await t.query(api.posts.getBySlug, { slug: "images" });
  expect(article?.cover?.width).toBe(800);
  expect(Object.keys(article!.images)).toEqual([inline]);

  await asUser(t, adminId).mutation(api.posts.unpublish, { postId });
  await asUser(t, writerId).mutation(api.posts.remove, { postId });
  await asUser(t, adminId).mutation(api.media.remove, { mediaId: cover });
});

test("a latestPosts section on a page shows published posts only", async () => {
  const { t, writerId, adminId } = await setup();
  for (const [i, publish] of [[1, true], [2, false]] as const) {
    const postId = await asUser(t, writerId).mutation(api.posts.create, { title: { fr: `P${i}`, en: "" } });
    await asUser(t, writerId).mutation(api.posts.update, fullContent(postId, `p${i}`));
    if (publish) await asUser(t, adminId).mutation(api.posts.publish, { postId });
  }
  const sections = [...DEFAULT_PAGES.home.sections, newSection("latestPosts")];
  await asUser(t, adminId).mutation(api.pages.saveDraft, { key: "home", seo: DEFAULT_PAGES.home.seo, sections });
  await asUser(t, adminId).mutation(api.pages.publish, { key: "home" });
  const home = await t.query(api.pages.getPublished, { key: "home" });
  const latest = home!.sections.find((s) => s.type === "latestPosts") as { posts: Array<{ slug: string }> };
  expect(latest.posts.map((p) => p.slug)).toEqual(["p1"]);
});
