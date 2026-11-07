import type { QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { appError } from "./errors";
import type { Loc } from "./i18n";
import { publicImage, type PublicImage } from "./media";

/** Cache tags of the blog (src/lib/content.ts, src/lib/revalidate-request.ts). */
export const POSTS_TAG = "posts";
export const postTag = (slug: string) => `post:${slug}`;

export const POST_LIMITS = { title: 200, excerpt: 400, tags: 8, tagLength: 30, slug: 80, pageSize: 12, maxPage: 100 } as const;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "Récolte 2026 : nos résultats !" -> "recolte-2026-nos-resultats" */
export function slugify(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, POST_LIMITS.slug)
      .replace(/-+$/g, "") || "article"
  );
}

export function cleanSlug(slug: string): string {
  const value = slug.trim().toLowerCase();
  if (!SLUG_PATTERN.test(value) || value.length > POST_LIMITS.slug) {
    throw appError("INVALID_INPUT", "The address may only use lowercase letters, digits and hyphens.");
  }
  return value;
}

/** Lowercased, trimmed, unique, at most 8 tags of 30 characters. */
export function cleanTags(tags: readonly string[]): string[] {
  const clean = [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
  if (clean.length > POST_LIMITS.tags) throw appError("INVALID_INPUT", `At most ${POST_LIMITS.tags} tags.`);
  if (clean.some((t) => t.length > POST_LIMITS.tagLength)) throw appError("INVALID_INPUT", "A tag is too long.");
  return clean;
}

export function checkPostText(title: Loc, excerpt: Loc) {
  for (const lang of ["fr", "en"] as const) {
    if (title[lang].length > POST_LIMITS.title) throw appError("INVALID_INPUT", "Title is too long.");
    if (excerpt[lang].length > POST_LIMITS.excerpt) throw appError("INVALID_INPUT", "Summary is too long.");
  }
}

/** A post as a card on the blog list, related posts and latestPosts sections. */
export type PostCard = {
  slug: string;
  title: Loc;
  excerpt: Loc;
  cover: PublicImage | null;
  publishedAt: number;
  readingMinutes: { fr: number; en: number };
  tags: string[];
};

export async function toPostCard(ctx: QueryCtx, post: Doc<"posts">): Promise<PostCard> {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    cover: await publicImage(ctx, post.coverImageId),
    publishedAt: post.publishedAt ?? post._creationTime,
    readingMinutes: post.readingMinutes,
    tags: post.tags,
  };
}

/** The newest published posts (at most `limit`), newest first. */
export async function latestPublished(ctx: QueryCtx, limit: number) {
  return await ctx.db
    .query("posts")
    .withIndex("by_status_and_publishedAt", (q) => q.eq("status", "published"))
    .order("desc")
    .take(limit);
}
