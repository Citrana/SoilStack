import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { DEFAULT_PAGES } from "./lib/defaultContent";
import type { RichDoc } from "./lib/richText";
import { newSection } from "./lib/sections";
import { asUser, insertRole, insertUserWithRole, setupTest, type T } from "./lib/test.utils";

const doc = (text: string, mediaId?: string): RichDoc => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }, ...(mediaId ? [{ type: "mediaImage", attrs: { mediaId } }] : [])],
});

async function setup() {
  const t = await setupTest();
  await t.mutation(internal.pages.seedContent, {});
  await t.mutation(internal.productCategories.seedCategories, {});
  const managerId = await insertUserWithRole(t, "product_manager"); // manage + publish
  const adminId = await insertUserWithRole(t, "super_admin");
  const categories = await asUser(t, adminId).query(api.productCategories.list, {});
  return { t, managerId, adminId, engrais: categories[0]._id, semences: categories[1]._id };
}

async function storeImage(t: T, userId: Id<"users">) {
  const storageId = await t.run((ctx) => ctx.storage.store(new Blob([new Uint8Array(10)], { type: "image/webp" })));
  const result = await asUser(t, userId).mutation(api.media.saveMedia, {
    storageId, filename: "p.webp", alt: { fr: "", en: "" }, width: 800, height: 800, blurDataUrl: "data:image/webp;base64,x",
  });
  if (!result.ok) throw new Error("refused");
  return result.mediaId;
}

const content = (productId: Id<"products">, categoryId: Id<"productCategories">, extra: Record<string, unknown> = {}) => ({
  productId,
  slug: "npk-17-17-17",
  name: { fr: "Engrais NPK 17-17-17", en: "NPK 17-17-17 fertilizer" },
  shortDescription: { fr: "Engrais complet", en: "Complete fertilizer" },
  description: { fr: doc("Description"), en: doc("Description") },
  priceCents: 3500,
  unit: { fr: "sac de 50 kg", en: "50 kg bag" },
  categoryId,
  imageIds: [] as Id<"media">[],
  featured: false,
  ...extra,
});

async function publishedProduct(t: T, userId: Id<"users">, categoryId: Id<"productCategories">, slug: string, extra: Record<string, unknown> = {}) {
  const productId = await asUser(t, userId).mutation(api.products.create, { name: { fr: slug, en: "" }, categoryId });
  const image = await storeImage(t, userId);
  await asUser(t, userId).mutation(api.products.update, content(productId, categoryId, { slug, name: { fr: slug, en: slug }, imageIds: [image], ...extra }));
  await asUser(t, userId).mutation(api.products.publish, { productId });
  return productId;
}

test("create and update need products.manage; publish needs products.publish", async () => {
  const { t, managerId, engrais } = await setup();
  const writerId = await insertUserWithRole(t, "blog_writer");
  await expect(asUser(t, writerId).mutation(api.products.create, { name: { fr: "x", en: "" }, categoryId: engrais })).rejects.toThrow(/products\.manage/);
  await expect(t.mutation(api.products.create, { name: { fr: "x", en: "" }, categoryId: engrais })).rejects.toThrow(/NOT_AUTHENTICATED/);
  await expect(asUser(t, writerId).query(api.products.listForAdmin, {})).rejects.toThrow(/FORBIDDEN/);

  const productId = await asUser(t, managerId).mutation(api.products.create, { name: { fr: "Engrais NPK", en: "" }, categoryId: engrais });
  const image = await storeImage(t, managerId);
  await asUser(t, managerId).mutation(api.products.update, content(productId, engrais, { imageIds: [image] }));

  const managerOnly = await insertRole(t, "manage_only", ["products.manage"]);
  const managerOnlyId = await t.run((ctx) =>
    ctx.db.insert("users", { name: "M", email: "m@example.com", roleId: managerOnly, status: "active", mustChangePassword: false, createdBy: null }),
  );
  await expect(asUser(t, managerOnlyId).mutation(api.products.publish, { productId })).rejects.toThrow(/products\.publish/);
  await asUser(t, managerId).mutation(api.products.publish, { productId });
  expect((await t.query(api.products.getBySlug, { slug: "npk-17-17-17" }))?.priceCents).toBe(3500);
});

test("publish needs both languages and a photo; prices and photos are validated", async () => {
  const { t, managerId, engrais } = await setup();
  const productId = await asUser(t, managerId).mutation(api.products.create, { name: { fr: "Semence", en: "" }, categoryId: engrais });
  await expect(asUser(t, managerId).mutation(api.products.publish, { productId })).rejects.toThrow(/name\.en.*photo/);
  await expect(asUser(t, managerId).mutation(api.products.update, content(productId, engrais, { priceCents: -5 }))).rejects.toThrow(/INVALID_INPUT/);
  await expect(asUser(t, managerId).mutation(api.products.update, content(productId, engrais, { priceCents: 12.5 }))).rejects.toThrow(/INVALID_INPUT/);
  const nine = await Promise.all(Array.from({ length: 9 }, () => storeImage(t, managerId)));
  await expect(asUser(t, managerId).mutation(api.products.update, content(productId, engrais, { imageIds: nine }))).rejects.toThrow(/At most 8/);
});

test("public queries show published products only, filter by category, featured first, with related ones", async () => {
  const { t, managerId, engrais, semences } = await setup();
  await publishedProduct(t, managerId, engrais, "b-engrais");
  await publishedProduct(t, managerId, engrais, "a-engrais");
  await publishedProduct(t, managerId, engrais, "z-vedette", { featured: true });
  await publishedProduct(t, managerId, semences, "mais-hybride", { priceCents: undefined });
  const archived = await publishedProduct(t, managerId, semences, "archive");
  await asUser(t, managerId).mutation(api.products.archive, { productId: archived });
  await asUser(t, managerId).mutation(api.products.create, { name: { fr: "Brouillon", en: "" }, categoryId: semences });

  const all = await t.query(api.products.catalogue, {});
  expect(all.products.map((p) => p.slug)).toEqual(["z-vedette", "a-engrais", "b-engrais", "mais-hybride"]);
  expect(all.categories.map((c) => [c.slug, c.count])).toEqual([["engrais", 3], ["semences", 1]]);
  expect(all.products[3].priceCents).toBeNull();

  const seeds = await t.query(api.products.catalogue, { category: "semences" });
  expect(seeds.products.map((p) => p.slug)).toEqual(["mais-hybride"]);
  expect(seeds.selected?.slug).toBe("semences");
  expect((await t.query(api.products.catalogue, { category: "nope" })).products).toEqual([]);

  expect(await t.query(api.products.getBySlug, { slug: "archive" })).toBeNull();
  const product = await t.query(api.products.getBySlug, { slug: "a-engrais" });
  expect(product?.related.map((p) => p.slug)).toEqual(["z-vedette", "b-engrais"]);
  expect(product).not.toHaveProperty("status");
  expect(product).not.toHaveProperty("updatedBy");
  expect((await t.query(api.products.publishedSlugs, {})).length).toBe(4);
});

test("archive, restore and delete: only drafts can be deleted, and their images are freed", async () => {
  const { t, managerId, adminId, engrais } = await setup();
  const productId = await publishedProduct(t, managerId, engrais, "outil");
  const image = (await t.run((ctx) => ctx.db.get("products", productId)))!.imageIds[0];
  await expect(asUser(t, managerId).mutation(api.products.remove, { productId })).rejects.toThrow(/Only drafts/);
  await expect(asUser(t, adminId).mutation(api.media.remove, { mediaId: image })).rejects.toThrow(/MEDIA_IN_USE/);
  await asUser(t, managerId).mutation(api.products.archive, { productId });
  await asUser(t, managerId).mutation(api.products.restore, { productId });
  expect((await t.run((ctx) => ctx.db.get("products", productId)))!.status).toBe("draft");
  await asUser(t, managerId).mutation(api.products.remove, { productId });
  await asUser(t, adminId).mutation(api.media.remove, { mediaId: image });
});

test("renaming a published product refreshes both addresses; changes are audited", async () => {
  const { t, managerId, engrais } = await setup();
  const productId = await publishedProduct(t, managerId, engrais, "ancien");
  const product = (await t.run((ctx) => ctx.db.get("products", productId)))!;
  await asUser(t, managerId).mutation(api.products.update, content(productId, engrais, { slug: "nouveau", imageIds: product.imageIds }));
  const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
  expect(scheduled.at(-1)?.args).toEqual([{ tags: ["products", "product:ancien", "product:nouveau"] }]);
  const actions = (await t.run((ctx) => ctx.db.query("auditLogs").withIndex("by_entityTable_and_timestamp", (q) => q.eq("entityTable", "products")).collect())).map((l) => l.action);
  expect(actions).toEqual(["create", "update", "publish", "update"]);
});

test("a featuredProducts section shows featured published products", async () => {
  const { t, managerId, adminId, engrais } = await setup();
  await publishedProduct(t, managerId, engrais, "normal");
  await publishedProduct(t, managerId, engrais, "vedette", { featured: true });
  const sections = [...DEFAULT_PAGES.home.sections, newSection("featuredProducts")];
  await asUser(t, adminId).mutation(api.pages.saveDraft, { key: "home", seo: DEFAULT_PAGES.home.seo, sections });
  await asUser(t, adminId).mutation(api.pages.publish, { key: "home" });
  const home = await t.query(api.pages.getPublished, { key: "home" });
  const section = home!.sections.find((s) => s.type === "featuredProducts") as { products: Array<{ slug: string }> };
  expect(section.products.map((p) => p.slug)).toEqual(["vedette"]);
});
