import type { QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { appError } from "./errors";
import type { Loc } from "./i18n";
import { publicImage, type PublicImage } from "./media";
import { isValidPriceCents } from "./money";

/** Cache tags of the catalogue (src/lib/content.ts, src/lib/revalidate-request.ts). */
export const PRODUCTS_TAG = "products";
export const productTag = (slug: string) => `product:${slug}`;

export const PRODUCT_LIMITS = { name: 200, shortDescription: 400, unit: 60, images: 8, categoryName: 100, categoryDescription: 500 } as const;

export function checkProductText(name: Loc, shortDescription: Loc, unit: Loc | undefined) {
  for (const lang of ["fr", "en"] as const) {
    if (name[lang].length > PRODUCT_LIMITS.name) throw appError("INVALID_INPUT", "Name is too long.");
    if (shortDescription[lang].length > PRODUCT_LIMITS.shortDescription) throw appError("INVALID_INPUT", "Short description is too long.");
    if (unit && unit[lang].length > PRODUCT_LIMITS.unit) throw appError("INVALID_INPUT", "Unit is too long.");
  }
}

export function checkPrice(priceCents: number | undefined) {
  if (priceCents !== undefined && !isValidPriceCents(priceCents)) throw appError("INVALID_INPUT", "Invalid price.");
}

/** A product as a card (catalogue, related products, featured section). */
export type ProductCard = {
  slug: string;
  name: Loc;
  shortDescription: Loc;
  image: PublicImage | null;
  priceCents: number | null;
  unit: Loc | null;
  category: { slug: string; name: Loc } | null;
};

export async function toProductCard(ctx: QueryCtx, product: Doc<"products">): Promise<ProductCard> {
  const category = await ctx.db.get("productCategories", product.categoryId);
  return {
    slug: product.slug,
    name: product.name,
    shortDescription: product.shortDescription,
    image: await publicImage(ctx, product.imageIds[0]),
    priceCents: product.priceCents ?? null,
    unit: product.unit ?? null,
    category: category ? { slug: category.slug, name: category.name } : null,
  };
}

/** Published products: featured first, then by French name. */
export async function publishedProducts(ctx: QueryCtx) {
  const products = await ctx.db
    .query("products")
    .withIndex("by_status", (q) => q.eq("status", "published"))
    .take(1000);
  return products.sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.fr.localeCompare(b.name.fr, "fr"));
}

/** For featuredProducts sections: featured ones, else the newest. */
export async function featuredProducts(ctx: QueryCtx, limit: number) {
  const featured = await ctx.db
    .query("products")
    .withIndex("by_status_and_featured", (q) => q.eq("status", "published").eq("featured", true))
    .take(limit);
  if (featured.length > 0) return featured;
  return await ctx.db
    .query("products")
    .withIndex("by_status", (q) => q.eq("status", "published"))
    .order("desc")
    .take(limit);
}

/** Starter categories, created once (appliedSeedSteps). */
export const DEFAULT_CATEGORIES: ReadonlyArray<{ slug: string; name: Loc; description: Loc }> = [
  { slug: "engrais", name: { fr: "Engrais", en: "Fertilizers" }, description: { fr: "Pour nourrir vos sols et vos cultures.", en: "To feed your soil and crops." } },
  { slug: "semences", name: { fr: "Semences", en: "Seeds" }, description: { fr: "Des semences adaptées aux conditions de la RDC.", en: "Seeds suited to conditions in the DRC." } },
  { slug: "outils-equipements", name: { fr: "Outils et équipements", en: "Tools and equipment" }, description: { fr: "Le matériel pour travailler vos parcelles.", en: "Equipment to work your plots." } },
  { slug: "protection-cultures", name: { fr: "Protection des cultures", en: "Crop protection" }, description: { fr: "Pour protéger vos cultures des maladies et ravageurs.", en: "To protect your crops from disease and pests." } },
];
export const CATEGORY_SEED_STEP = "2026-11-product-categories";
