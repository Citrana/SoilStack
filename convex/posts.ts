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
  checkPostText,
  cleanSlug,
  cleanTags,
  latestPublished,
  POST_LIMITS,
  POSTS_TAG,
  postTag,
  slugify,
  toPostCard,
} from "./lib/posts";
import { authedMutation, authedQuery, type AuthedMutationCtx, type AuthedQueryCtx } from "./lib/rbac";
import {
  EMPTY_DOC,
  isEmptyDoc,
  locRichValidator,
  readingMinutes,
  richTextMediaIds,
  sanitizeRichText,
  type LocRich,
} from "./lib/richText";

const BLOG_PERMISSIONS = ["blog.write", "blog.edit_all", "blog.publish"] as const;

/**
 * Who can do what (CLAUDE.md, "Content model"):
 * - edit: the author (blog.write) while it's a draft, or blog.edit_all;
 * - publish/unpublish: blog.publish;
 * - delete: drafts only, by the author (blog.write) or blog.edit_all.
 */
function canEdit(ctx: AuthedQueryCtx, post: Doc<"posts">) {
  return ctx.can("blog.edit_all") || (ctx.can("blog.write") && post.status === "draft" && post.authorId === ctx.user._id);
}
function canDelete(ctx: AuthedQueryCtx, post: Doc<"posts">) {
  return post.status === "draft" && canEdit(ctx, post);
}

async function getPost(ctx: QueryCtx, postId: Id<"posts">) {
  const post = await ctx.db.get("posts", postId);
  if (!post) throw appError("NOT_FOUND", "Post not found.");
  return post;
}

async function slugTaken(ctx: QueryCtx, slug: string, except?: Id<"posts">) {
  const existing = await ctx.db
    .query("posts")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .first();
  return existing !== null && existing._id !== except;
}

async function uniqueSlug(ctx: QueryCtx, base: string) {
  let slug = base;
  for (let n = 2; await slugTaken(ctx, slug); n++) {
    slug = `${base.slice(0, POST_LIMITS.slug - 4)}-${n}`;
  }
  return slug;
}

async function syncMedia(ctx: MutationCtx, post: Pick<Doc<"posts">, "_id" | "coverImageId" | "body">) {
  await setMediaUsages(ctx, { ownerTable: "posts", ownerId: post._id }, [
    ...(post.coverImageId ? [{ mediaId: post.coverImageId, field: "cover" }] : []),
    ...richTextMediaIds(post.body.fr).map((mediaId) => ({ mediaId, field: "body" })),
    ...richTextMediaIds(post.body.en).map((mediaId) => ({ mediaId, field: "body" })),
  ]);
}

/** Compact audit snapshot (no bodies). */
const summary = (post: Pick<Doc<"posts">, "slug" | "title" | "excerpt" | "status" | "tags" | "coverImageId">) => ({
  slug: post.slug,
  title: post.title,
  excerpt: post.excerpt,
  status: post.status,
  tags: post.tags,
  coverImageId: post.coverImageId ?? null,
});

async function notify(ctx: AuthedMutationCtx, slugs: string[]) {
  await ctx.scheduler.runAfter(0, internal.revalidate.notify, {
    tags: [POSTS_TAG, ...new Set(slugs.map(postTag))],
  });
}

// ---------------------------------------------------------------- admin

export const listForAdmin = authedQuery({
  args: {},
  handler: async (ctx) => {
    await ctx.requireAnyPermission(BLOG_PERMISSIONS);
    const seesAll = ctx.can("blog.edit_all") || ctx.can("blog.publish");
    const posts = seesAll
      ? await ctx.db.query("posts").order("desc").take(500)
      : await ctx.db
          .query("posts")
          .withIndex("by_authorId", (q) => q.eq("authorId", ctx.user._id))
          .order("desc")
          .take(500);
    const names = new Map<Id<"users">, string>();
    for (const id of new Set(posts.map((p) => p.authorId))) {
      names.set(id, (await ctx.db.get("users", id))?.name ?? "");
    }
    return posts.map((post) => ({
      _id: post._id,
      slug: post.slug,
      title: post.title,
      status: post.status,
      publishedAt: post.publishedAt ?? null,
      updatedAt: post.updatedAt,
      authorName: names.get(post.authorId) ?? "",
      canEdit: canEdit(ctx, post),
    }));
  },
});

/** One post for the editor. Takes the URL id as a string; null if unknown or not visible. */
export const getForAdmin = authedQuery({
  args: { postId: v.string() },
  handler: async (ctx, args) => {
    await ctx.requireAnyPermission(BLOG_PERMISSIONS);
    const postId = ctx.db.normalizeId("posts", args.postId);
    const post = postId ? await ctx.db.get("posts", postId) : null;
    if (!post) return null;
    const seesAll = ctx.can("blog.edit_all") || ctx.can("blog.publish");
    if (!seesAll && post.authorId !== ctx.user._id) return null;
    const author = await ctx.db.get("users", post.authorId);
    return {
      post,
      authorName: author?.name ?? "",
      canEdit: canEdit(ctx, post),
      canPublish: ctx.can("blog.publish"),
      canDelete: canDelete(ctx, post),
    };
  },
});

/** A new empty draft; returns its id for the editor. */
export const create = authedMutation({
  args: { title: locValidator },
  returns: v.id("posts"),
  handler: async (ctx, args) => {
    await ctx.requireAnyPermission(["blog.write", "blog.edit_all"]);
    const title = trimLoc(args.title);
    checkPostText(title, { fr: "", en: "" });
    const slug = await uniqueSlug(ctx, slugify(title.fr || title.en, "article"));
    const now = Date.now();
    const post = {
      slug,
      title,
      excerpt: { fr: "", en: "" },
      body: { fr: EMPTY_DOC, en: EMPTY_DOC },
      tags: [],
      status: "draft" as const,
      readingMinutes: { fr: 1, en: 1 },
      authorId: ctx.user._id,
      updatedAt: now,
      updatedBy: ctx.user._id,
    };
    const postId = await ctx.db.insert("posts", post);
    await ctx.audit({ action: "create", entityTable: "posts", entityId: postId, after: summary(post) });
    return postId;
  },
});

export const update = authedMutation({
  args: {
    postId: v.id("posts"),
    slug: v.string(),
    title: locValidator,
    excerpt: locValidator,
    body: locRichValidator,
    coverImageId: v.optional(v.id("media")),
    tags: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.requireAnyPermission(["blog.write", "blog.edit_all"]);
    const post = await getPost(ctx, args.postId);
    if (!canEdit(ctx, post)) {
      throw appError("FORBIDDEN", "Forbidden: this post can only be edited by its author while it's a draft, or with \"blog.edit_all\".");
    }
    const title = trimLoc(args.title);
    const excerpt = trimLoc(args.excerpt);
    checkPostText(title, excerpt);
    const slug = cleanSlug(args.slug);
    if (await slugTaken(ctx, slug, post._id)) throw appError("INVALID_INPUT", "This address is already used by another post.");
    const body: LocRich = { fr: sanitizeRichText(args.body.fr), en: sanitizeRichText(args.body.en) };
    const next = {
      slug,
      title,
      excerpt,
      body,
      coverImageId: args.coverImageId,
      tags: cleanTags(args.tags),
      readingMinutes: { fr: readingMinutes(body.fr), en: readingMinutes(body.en) },
    };
    const changed = diff(
      { ...summary(post), body: post.body },
      { ...summary({ ...post, ...next }), body },
    );
    if (!changed) return null;
    await ctx.db.patch("posts", post._id, { ...next, updatedAt: Date.now(), updatedBy: ctx.user._id });
    await syncMedia(ctx, { _id: post._id, coverImageId: next.coverImageId, body });
    const auditChanges = diff(summary(post), summary({ ...post, ...next }));
    await ctx.audit({
      action: "update",
      entityTable: "posts",
      entityId: post._id,
      before: { slug: post.slug, ...(auditChanges?.before ?? {}) },
      after: { slug, ...(auditChanges?.after ?? { bodyEdited: true }) },
    });
    if (post.status === "published") await notify(ctx, [post.slug, slug]);
    return null;
  },
});

function missingTranslations(post: Doc<"posts">) {
  const missing: string[] = [];
  for (const lang of ["fr", "en"] as const) {
    if (!post.title[lang]) missing.push(`title.${lang}`);
    if (!post.excerpt[lang]) missing.push(`excerpt.${lang}`);
    if (isEmptyDoc(post.body[lang])) missing.push(`body.${lang}`);
  }
  return missing;
}

/** Puts a post online. Needs the title, summary and text in both languages. */
export const publish = authedMutation({
  args: { postId: v.id("posts") },
  returns: v.null(),
  handler: async (ctx, { postId }) => {
    await ctx.requirePermission("blog.publish");
    const post = await getPost(ctx, postId);
    if (post.status === "published") return null;
    const missing = missingTranslations(post);
    if (missing.length) throw appError("INVALID_INPUT", `Missing before publishing: ${missing.join(", ")}.`);
    const now = Date.now();
    await ctx.db.patch("posts", post._id, {
      status: "published",
      publishedAt: post.publishedAt ?? now,
      updatedAt: now,
      updatedBy: ctx.user._id,
    });
    await ctx.audit({ action: "publish", entityTable: "posts", entityId: post._id, after: summary({ ...post, status: "published" }) });
    await notify(ctx, [post.slug]);
    return null;
  },
});

export const unpublish = authedMutation({
  args: { postId: v.id("posts") },
  returns: v.null(),
  handler: async (ctx, { postId }) => {
    await ctx.requirePermission("blog.publish");
    const post = await getPost(ctx, postId);
    if (post.status === "draft") return null;
    await ctx.db.patch("posts", post._id, { status: "draft", updatedAt: Date.now(), updatedBy: ctx.user._id });
    await ctx.audit({ action: "unpublish", entityTable: "posts", entityId: post._id, after: summary({ ...post, status: "draft" }) });
    await notify(ctx, [post.slug]);
    return null;
  },
});

/** Deletes a draft (unpublish first) and frees its images. */
export const remove = authedMutation({
  args: { postId: v.id("posts") },
  returns: v.null(),
  handler: async (ctx, { postId }) => {
    await ctx.requireAnyPermission(["blog.write", "blog.edit_all"]);
    const post = await getPost(ctx, postId);
    if (post.status !== "draft") throw appError("INVALID_INPUT", "Unpublish the post before deleting it.");
    if (!canDelete(ctx, post)) throw appError("FORBIDDEN", "Forbidden: only the author or \"blog.edit_all\" can delete this draft.");
    await clearMediaUsages(ctx, { ownerTable: "posts", ownerId: post._id });
    await ctx.db.delete("posts", post._id);
    await ctx.audit({ action: "delete", entityTable: "posts", entityId: post._id, before: summary(post) });
    return null;
  },
});

// ---------------------------------------------------------------- public

/** PUBLIC: published posts, newest first, 12 per page. */
export const listPublished = query({
  args: { page: v.number() },
  handler: async (ctx, args) => {
    const page = Math.min(Math.max(1, Math.floor(args.page) || 1), POST_LIMITS.maxPage);
    const size = POST_LIMITS.pageSize;
    const posts = await latestPublished(ctx, page * size + 1);
    const slice = posts.slice((page - 1) * size, page * size);
    return {
      page,
      hasMore: posts.length > page * size,
      posts: await Promise.all(slice.map((post) => toPostCard(ctx, post))),
    };
  },
});

/**
 * PUBLIC: one published article (null otherwise), its body images resolved,
 * and up to 3 other recent posts. Never the author or drafts.
 */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const post = await ctx.db
      .query("posts")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!post || post.status !== "published") return null;
    const images: Record<string, PublicImage> = {};
    for (const id of new Set([...richTextMediaIds(post.body.fr), ...richTextMediaIds(post.body.en)])) {
      const image = await publicImage(ctx, id);
      if (image) images[id] = image;
    }
    const recent = await latestPublished(ctx, 4);
    return {
      ...(await toPostCard(ctx, post)),
      body: post.body,
      images,
      related: await Promise.all(recent.filter((p) => p._id !== post._id).slice(0, 3).map((p) => toPostCard(ctx, p))),
    };
  },
});

/** PUBLIC: every published slug (sitemap, prebuilt article pages). */
export const publishedSlugs = query({
  args: {},
  handler: async (ctx) => {
    const posts = await latestPublished(ctx, 1000);
    return posts.map((p) => ({ slug: p.slug, updatedAt: p.updatedAt }));
  },
});

