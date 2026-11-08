import { v } from "convex/values";
import { query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { diff } from "./lib/audit";
import { appError } from "./lib/errors";
import { locValidator, trimLoc } from "./lib/i18n";
import { clearMediaUsages, publicImage, setMediaUsages, type PublicImage } from "./lib/media";
import {
  checkPrice,
  checkProductText,
  PRODUCT_LIMITS,
  PRODUCTS_TAG,
  productTag,
  publishedProducts,
  toProductCard,
} from "./lib/products";
import { authedMutation, authedQuery, type AuthedMutationCtx } from "./lib/rbac";
import {
  EMPTY_DOC,
  locRichValidator,
  richTextMediaIds,
  sanitizeRichText,
  type LocRich,
} from "./lib/richText";
import { cleanSlug, SLUG_MAX_LENGTH, slugify } from "./lib/slugs";

const VIEWERS = ["products.manage", "products.publish"] as const;

async function getProduct(ctx: QueryCtx, productId: Id<"products">) {
  const product = await ctx.db.get("products", productId);
  if (!product) throw appError("NOT_FOUND", "Product not found.");
  return product;
}

async function getCategory(ctx: QueryCtx, categoryId: Id<"productCategories">) {
  const category = await ctx.db.get("productCategories", categoryId);
  if (!category) throw appError("NOT_FOUND", "Category not found.");
  return category;
}

async function slugTaken(ctx: QueryCtx, slug: string, except?: Id<"products">) {
  const existing = await ctx.db
    .query("products")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .first();
  return existing !== null && existing._id !== except;
}

async function uniqueSlug(ctx: QueryCtx, base: string) {
  let slug = base;
  for (let n = 2; await slugTaken(ctx, slug); n++) slug = `${base.slice(0, SLUG_MAX_LENGTH - 4)}-${n}`;
  return slug;
}

async function syncMedia(ctx: MutationCtx, product: Pick<Doc<"products">, "_id" | "imageIds" | "description">) {
  await setMediaUsages(ctx, { ownerTable: "products", ownerId: product._id }, [
    ...product.imageIds.map((mediaId) => ({ mediaId, field: "gallery" })),
    ...richTextMediaIds(product.description.fr).map((mediaId) => ({ mediaId, field: "body" })),
    ...richTextMediaIds(product.description.en).map((mediaId) => ({ mediaId, field: "body" })),
  ]);
}

/** Compact audit snapshot (no description bodies). */
const summary = (p: Pick<Doc<"products">, "slug" | "name" | "shortDescription" | "priceCents" | "unit" | "categoryId" | "imageIds" | "status" | "featured">) => ({
  slug: p.slug,
  name: p.name,
  shortDescription: p.shortDescription,
  priceCents: p.priceCents ?? null,
  unit: p.unit ?? null,
  categoryId: p.categoryId,
  imageIds: p.imageIds,
  status: p.status,
  featured: p.featured,
});

async function notify(ctx: AuthedMutationCtx, slugs: string[]) {
  await ctx.scheduler.runAfter(0, internal.revalidate.notify, {
    tags: [PRODUCTS_TAG, ...new Set(slugs.map(productTag))],
  });
}

async function setStatus(ctx: AuthedMutationCtx, product: Doc<"products">, status: Doc<"products">["status"], action: "publish" | "unpublish" | "update") {
  if (product.status === status) return;
  await ctx.db.patch("products", product._id, { status, updatedAt: Date.now(), updatedBy: ctx.user._id });
  await ctx.audit({
    action,
    entityTable: "products",
    entityId: product._id,
    before: { slug: product.slug, status: product.status },
    after: { slug: product.slug, status },
  });
  if (product.status === "published" || status === "published") await notify(ctx, [product.slug]);
}

// ---------------------------------------------------------------- admin

export const listForAdmin = authedQuery({
  args: {},
  handler: async (ctx) => {
    await ctx.requireAnyPermission(VIEWERS);
    const products = await ctx.db.query("products").order("desc").take(1000);
    const categories = new Map((await ctx.db.query("productCategories").take(200)).map((c) => [c._id, c]));
    return await Promise.all(
      products.map(async (p) => ({
        _id: p._id,
        slug: p.slug,
        name: p.name,
        status: p.status,
        featured: p.featured,
        priceCents: p.priceCents ?? null,
        categoryId: p.categoryId,
        categoryName: categories.get(p.categoryId)?.name ?? null,
        image: await publicImage(ctx, p.imageIds[0]),
        updatedAt: p.updatedAt,
      })),
    );
  },
});

/** One product for the editor (URL id as a string; null if unknown). */
export const getForAdmin = authedQuery({
  args: { productId: v.string() },
  handler: async (ctx, args) => {
    await ctx.requireAnyPermission(VIEWERS);
    const productId = ctx.db.normalizeId("products", args.productId);
    const product = productId ? await ctx.db.get("products", productId) : null;
    if (!product) return null;
    return {
      product,
      canEdit: ctx.can("products.manage"),
      canPublish: ctx.can("products.publish"),
    };
  },
});

export const create = authedMutation({
  args: { name: locValidator, categoryId: v.id("productCategories") },
  returns: v.id("products"),
  handler: async (ctx, args) => {
    await ctx.requirePermission("products.manage");
    await getCategory(ctx, args.categoryId);
    const name = trimLoc(args.name);
    checkProductText(name, { fr: "", en: "" }, undefined);
    const product = {
      slug: await uniqueSlug(ctx, slugify(name.fr || name.en, "produit")),
      name,
      shortDescription: { fr: "", en: "" },
      description: { fr: EMPTY_DOC, en: EMPTY_DOC },
      categoryId: args.categoryId,
      imageIds: [],
      status: "draft" as const,
      featured: false,
      updatedAt: Date.now(),
      updatedBy: ctx.user._id,
    };
    const productId = await ctx.db.insert("products", product);
    await ctx.audit({ action: "create", entityTable: "products", entityId: productId, after: summary(product) });
    return productId;
  },
});

export const update = authedMutation({
  args: {
    productId: v.id("products"),
    slug: v.string(),
    name: locValidator,
    shortDescription: locValidator,
    description: locRichValidator,
    priceCents: v.optional(v.number()),
    unit: v.optional(locValidator),
    categoryId: v.id("productCategories"),
    imageIds: v.array(v.id("media")),
    featured: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.requirePermission("products.manage");
    const product = await getProduct(ctx, args.productId);
    await getCategory(ctx, args.categoryId);
    const name = trimLoc(args.name);
    const shortDescription = trimLoc(args.shortDescription);
    const unit = args.unit && (args.unit.fr.trim() || args.unit.en.trim()) ? trimLoc(args.unit) : undefined;
    checkProductText(name, shortDescription, unit);
    checkPrice(args.priceCents);
    const imageIds = [...new Set(args.imageIds)];
    if (imageIds.length > PRODUCT_LIMITS.images) throw appError("INVALID_INPUT", `At most ${PRODUCT_LIMITS.images} photos.`);
    const slug = cleanSlug(args.slug);
    if (await slugTaken(ctx, slug, product._id)) throw appError("INVALID_INPUT", "This address is already used by another product.");
    const description: LocRich = { fr: sanitizeRichText(args.description.fr), en: sanitizeRichText(args.description.en) };
    const next = { slug, name, shortDescription, description, priceCents: args.priceCents, unit, categoryId: args.categoryId, imageIds, featured: args.featured };

    if (!diff({ ...summary(product), d: product.description }, { ...summary({ ...product, ...next }), d: description })) return null;
    await ctx.db.patch("products", product._id, { ...next, updatedAt: Date.now(), updatedBy: ctx.user._id });
    await syncMedia(ctx, { _id: product._id, imageIds, description });
    const changes = diff(summary(product), summary({ ...product, ...next }));
    await ctx.audit({
      action: "update",
      entityTable: "products",
      entityId: product._id,
      before: { slug: product.slug, ...(changes?.before ?? {}) },
      after: { slug, ...(changes?.after ?? { descriptionEdited: true }) },
    });
    if (product.status === "published") await notify(ctx, [product.slug, slug]);
    return null;
  },
});

/** Online. Needs name and short description in both languages, and a photo. */
export const publish = authedMutation({
  args: { productId: v.id("products") },
  returns: v.null(),
  handler: async (ctx, { productId }) => {
    await ctx.requirePermission("products.publish");
    const product = await getProduct(ctx, productId);
    const missing: string[] = [];
    for (const lang of ["fr", "en"] as const) {
      if (!product.name[lang]) missing.push(`name.${lang}`);
      if (!product.shortDescription[lang]) missing.push(`shortDescription.${lang}`);
    }
    if (product.imageIds.length === 0) missing.push("photo");
    if (missing.length) throw appError("INVALID_INPUT", `Missing before publishing: ${missing.join(", ")}.`);
    await setStatus(ctx, product, "published", "publish");
    return null;
  },
});

export const unpublish = authedMutation({
  args: { productId: v.id("products") },
  returns: v.null(),
  handler: async (ctx, { productId }) => {
    await ctx.requirePermission("products.publish");
    const product = await getProduct(ctx, productId);
    if (product.status !== "published") return null;
    await setStatus(ctx, product, "draft", "unpublish");
    return null;
  },
});

/** Hides a product from the site for good, keeping it and its history. */
export const archive = authedMutation({
  args: { productId: v.id("products") },
  returns: v.null(),
  handler: async (ctx, { productId }) => {
    await ctx.requirePermission("products.manage");
    await setStatus(ctx, await getProduct(ctx, productId), "archived", "update");
    return null;
  },
});

/** Brings an archived product back as a draft. */
export const restore = authedMutation({
  args: { productId: v.id("products") },
  returns: v.null(),
  handler: async (ctx, { productId }) => {
    await ctx.requirePermission("products.manage");
    const product = await getProduct(ctx, productId);
    if (product.status !== "archived") return null;
    await setStatus(ctx, product, "draft", "update");
    return null;
  },
});

/** Deletes a draft and frees its images (published ones are archived). */
export const remove = authedMutation({
  args: { productId: v.id("products") },
  returns: v.null(),
  handler: async (ctx, { productId }) => {
    await ctx.requirePermission("products.manage");
    const product = await getProduct(ctx, productId);
    if (product.status !== "draft") throw appError("INVALID_INPUT", "Only drafts can be deleted: unpublish or archive instead.");
    await clearMediaUsages(ctx, { ownerTable: "products", ownerId: product._id });
    await ctx.db.delete("products", product._id);
    await ctx.audit({ action: "delete", entityTable: "products", entityId: product._id, before: summary(product) });
    return null;
  },
});

// ---------------------------------------------------------------- public

/**
 * PUBLIC: the catalogue - categories that have published products (in
 * order, with counts) and the published products, optionally of one
 * category. Featured first, then by name.
 */
export const catalogue = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const products = await publishedProducts(ctx);
    const counts = new Map<Id<"productCategories">, number>();
    for (const p of products) counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
    const categories = (await ctx.db.query("productCategories").withIndex("by_order").take(200))
      .filter((c) => counts.has(c._id))
      .map((c) => ({ slug: c.slug, name: c.name, description: c.description, count: counts.get(c._id)! }));
    const selected = args.category
      ? await ctx.db
          .query("productCategories")
          .withIndex("by_slug", (q) => q.eq("slug", args.category!))
          .first()
      : null;
    const shown = selected ? products.filter((p) => p.categoryId === selected._id) : args.category ? [] : products;
    return {
      categories,
      selected: selected ? { slug: selected.slug, name: selected.name, description: selected.description } : null,
      products: await Promise.all(shown.map((p) => toProductCard(ctx, p))),
    };
  },
});

/** PUBLIC: one published product with its photos and related products. */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const product = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!product || product.status !== "published") return null;
    const images: PublicImage[] = [];
    for (const id of product.imageIds) {
      const image = await publicImage(ctx, id);
      if (image) images.push(image);
    }
    const bodyImages: Record<string, PublicImage> = {};
    for (const id of new Set([...richTextMediaIds(product.description.fr), ...richTextMediaIds(product.description.en)])) {
      const image = await publicImage(ctx, id);
      if (image) bodyImages[id] = image;
    }
    const sameCategory = (await publishedProducts(ctx)).filter((p) => p.categoryId === product.categoryId && p._id !== product._id);
    return {
      ...(await toProductCard(ctx, product)),
      images,
      description: product.description,
      bodyImages,
      related: await Promise.all(sameCategory.slice(0, 4).map((p) => toProductCard(ctx, p))),
    };
  },
});

/** PUBLIC: every published slug (sitemap, prebuilt product pages). */
export const publishedSlugs = query({
  args: {},
  handler: async (ctx) => (await publishedProducts(ctx)).map((p) => ({ slug: p.slug, updatedAt: p.updatedAt })),
});

