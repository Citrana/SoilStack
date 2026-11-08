import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { diff, snapshot } from "./lib/audit";
import { appError } from "./lib/errors";
import { locValidator, trimLoc, type Loc } from "./lib/i18n";
import { CATEGORY_SEED_STEP, DEFAULT_CATEGORIES, PRODUCT_LIMITS, PRODUCTS_TAG } from "./lib/products";
import { authedMutation, authedQuery, type AuthedMutationCtx } from "./lib/rbac";
import { cleanSlug } from "./lib/slugs";

async function slugTaken(ctx: QueryCtx, slug: string, except?: Id<"productCategories">) {
  const existing = await ctx.db
    .query("productCategories")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .first();
  return existing !== null && existing._id !== except;
}

function checkText(name: Loc, description: Loc) {
  if (!name.fr || !name.en) throw appError("INVALID_INPUT", "A category needs a name in French and English.");
  for (const lang of ["fr", "en"] as const) {
    if (name[lang].length > PRODUCT_LIMITS.categoryName || description[lang].length > PRODUCT_LIMITS.categoryDescription) {
      throw appError("INVALID_INPUT", "Text is too long.");
    }
  }
}

async function ordered(ctx: QueryCtx) {
  return await ctx.db.query("productCategories").withIndex("by_order").take(200);
}

async function notify(ctx: AuthedMutationCtx) {
  await ctx.scheduler.runAfter(0, internal.revalidate.notify, { tags: [PRODUCTS_TAG] });
}

/** Categories in display order, with how many products use each. */
export const list = authedQuery({
  args: {},
  handler: async (ctx) => {
    await ctx.requireAnyPermission(["products.manage", "products.publish"]);
    const categories = await ordered(ctx);
    return await Promise.all(
      categories.map(async (category) => ({
        ...category,
        productCount: (
          await ctx.db
            .query("products")
            .withIndex("by_categoryId", (q) => q.eq("categoryId", category._id))
            .take(1000)
        ).length,
      })),
    );
  },
});

const fields = { slug: v.string(), name: locValidator, description: locValidator };

export const create = authedMutation({
  args: fields,
  returns: v.id("productCategories"),
  handler: async (ctx, args) => {
    await ctx.requirePermission("products.manage");
    const name = trimLoc(args.name);
    const description = trimLoc(args.description);
    checkText(name, description);
    const slug = cleanSlug(args.slug);
    if (await slugTaken(ctx, slug)) throw appError("INVALID_INPUT", "This address is already used by another category.");
    const last = (await ordered(ctx)).at(-1);
    const category = { slug, name, description, order: (last?.order ?? 0) + 1 };
    const id = await ctx.db.insert("productCategories", category);
    await ctx.audit({ action: "create", entityTable: "productCategories", entityId: id, after: snapshot(category) });
    await notify(ctx);
    return id;
  },
});

export const update = authedMutation({
  args: { categoryId: v.id("productCategories"), ...fields },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.requirePermission("products.manage");
    const category = await ctx.db.get("productCategories", args.categoryId);
    if (!category) throw appError("NOT_FOUND", "Category not found.");
    const name = trimLoc(args.name);
    const description = trimLoc(args.description);
    checkText(name, description);
    const slug = cleanSlug(args.slug);
    if (await slugTaken(ctx, slug, category._id)) throw appError("INVALID_INPUT", "This address is already used by another category.");
    const changes = diff(snapshot(category, ["slug", "name", "description"]), { slug, name, description });
    if (!changes) return null;
    await ctx.db.patch("productCategories", category._id, { slug, name, description });
    await ctx.audit({ action: "update", entityTable: "productCategories", entityId: category._id, ...changes });
    await notify(ctx);
    return null;
  },
});

/** Moves a category one place up or down. */
export const move = authedMutation({
  args: { categoryId: v.id("productCategories"), direction: v.union(v.literal("up"), v.literal("down")) },
  returns: v.null(),
  handler: async (ctx, { categoryId, direction }) => {
    await ctx.requirePermission("products.manage");
    const categories = await ordered(ctx);
    const index = categories.findIndex((c) => c._id === categoryId);
    if (index === -1) throw appError("NOT_FOUND", "Category not found.");
    const other = categories[direction === "up" ? index - 1 : index + 1];
    if (!other) return null;
    const current = categories[index];
    await ctx.db.patch("productCategories", current._id, { order: other.order });
    await ctx.db.patch("productCategories", other._id, { order: current.order });
    await ctx.audit({
      action: "update",
      entityTable: "productCategories",
      entityId: current._id,
      before: { slug: current.slug, order: current.order },
      after: { slug: current.slug, order: other.order },
    });
    await notify(ctx);
    return null;
  },
});

/** Deletes a category no product uses. */
export const remove = authedMutation({
  args: { categoryId: v.id("productCategories") },
  returns: v.null(),
  handler: async (ctx, { categoryId }) => {
    await ctx.requirePermission("products.manage");
    const category = await ctx.db.get("productCategories", categoryId);
    if (!category) throw appError("NOT_FOUND", "Category not found.");
    const used = await ctx.db
      .query("products")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", categoryId))
      .first();
    if (used) throw appError("CATEGORY_IN_USE", "Move this category's products to another one first.");
    await ctx.db.delete("productCategories", categoryId);
    await ctx.audit({ action: "delete", entityTable: "productCategories", entityId: categoryId, before: snapshot(category) });
    await notify(ctx);
    return null;
  },
});

/** Creates the starter categories once (recorded, so deletions stick). */
export const seedCategories = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const applied = await ctx.db
      .query("appliedSeedSteps")
      .withIndex("by_key", (q) => q.eq("key", CATEGORY_SEED_STEP))
      .unique();
    if (applied) return 0;
    let created = 0;
    for (const [i, category] of DEFAULT_CATEGORIES.entries()) {
      const exists = await ctx.db
        .query("productCategories")
        .withIndex("by_slug", (q) => q.eq("slug", category.slug))
        .first();
      if (exists) continue;
      await ctx.db.insert("productCategories", { ...category, order: i + 1 });
      created++;
    }
    await ctx.db.insert("appliedSeedSteps", { key: CATEGORY_SEED_STEP });
    return created;
  },
});
