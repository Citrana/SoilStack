import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { diff } from "./lib/audit";
import { DEFAULT_PAGES } from "./lib/defaultContent";
import { appError } from "./lib/errors";
import { publicImage, setMediaUsages, type PublicImage } from "./lib/media";
import { PAGE_KEYS, pageKeyValidator, pageTag, type PageKey } from "./lib/pages";
import { latestPublished, toPostCard } from "./lib/posts";
import { authedMutation, authedQuery, type AuthedMutationCtx } from "./lib/rbac";
import {
  needsLatestPosts,
  resolveSections,
  sectionMediaIds,
  sectionMediaRefs,
  sectionValidator,
  seoValidator,
  validateSections,
  validateSeo,
  type Section,
} from "./lib/sections";
import { EMPTY_SETTINGS, toPublicContact } from "./lib/settings";

const PAGE_EDITORS = ["pages.edit", "pages.publish"] as const;

async function getPageByKey(ctx: QueryCtx, key: PageKey): Promise<Doc<"pages">> {
  const page = await ctx.db
    .query("pages")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (!page) {
    throw appError("NOT_FOUND", "Page not seeded. Run seed:seedReferenceData.");
  }
  return page;
}

export async function loadSettings(ctx: QueryCtx) {
  const row = await ctx.db.query("siteSettings").first();
  if (!row) return EMPTY_SETTINGS;
  const { _id, _creationTime, ...settings } = row;
  void _id;
  void _creationTime;
  return settings;
}

/** Draft and published images are both protected from deletion. */
async function syncMediaUsages(ctx: MutationCtx, page: Doc<"pages">) {
  await setMediaUsages(ctx, { ownerTable: "pages", ownerId: page._id }, [
    ...sectionMediaRefs(page.draft.sections, "draft"),
    ...sectionMediaRefs(page.published?.sections ?? [], "published"),
  ]);
}

function hasUnpublishedChanges(page: Doc<"pages">) {
  return diff({ v: page.draft }, { v: page.published }) !== null;
}

/** A compact audit summary (not every section's text). */
function auditSummary(key: PageKey, content: { seo: Doc<"pages">["draft"]["seo"]; sections: Section[] }) {
  return {
    page: key,
    seo: content.seo,
    sections: content.sections.map((s) => `${s.type}${s.hidden ? " (hidden)" : ""}`),
  };
}

async function notify(ctx: AuthedMutationCtx | MutationCtx, tags: string[]) {
  await ctx.scheduler.runAfter(0, internal.revalidate.notify, { tags });
}

export const listForAdmin = authedQuery({
  args: {},
  handler: async (ctx) => {
    await ctx.requireAnyPermission(PAGE_EDITORS);
    const pages = await ctx.db.query("pages").take(PAGE_KEYS.length);
    const byKey = new Map(pages.map((p) => [p.key, p]));
    return PAGE_KEYS.flatMap((key) => {
      const page = byKey.get(key);
      if (!page) return [];
      return [
        {
          key,
          title: page.draft.seo.title,
          published: page.published !== null,
          hasUnpublishedChanges: hasUnpublishedChanges(page),
          publishedAt: page.publishedAt ?? null,
          updatedAt: page.updatedAt,
        },
      ];
    });
  },
});

export const getForAdmin = authedQuery({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    await ctx.requireAnyPermission(PAGE_EDITORS);
    if (!(PAGE_KEYS as readonly string[]).includes(args.key)) return null;
    const page = await getPageByKey(ctx, args.key as PageKey);
    const updatedBy = page.updatedBy ? await ctx.db.get("users", page.updatedBy) : null;
    return {
      key: page.key,
      draft: page.draft,
      publishedAt: page.publishedAt ?? null,
      updatedAt: page.updatedAt,
      updatedByName: updatedBy?.name ?? null,
      hasUnpublishedChanges: hasUnpublishedChanges(page),
    };
  },
});

export const saveDraft = authedMutation({
  args: { key: pageKeyValidator, seo: seoValidator, sections: v.array(sectionValidator) },
  returns: v.null(),
  handler: async (ctx, { key, seo, sections }) => {
    await ctx.requirePermission("pages.edit");
    validateSeo(seo);
    validateSections(sections);
    const page = await getPageByKey(ctx, key);
    const changes = diff(auditSummary(key, page.draft), auditSummary(key, { seo, sections }));
    const sameContent = diff({ v: page.draft }, { v: { seo, sections } }) === null;
    if (sameContent) return null;
    await ctx.db.patch("pages", page._id, {
      draft: { seo, sections },
      updatedAt: Date.now(),
      updatedBy: ctx.user._id,
    });
    await syncMediaUsages(ctx, { ...page, draft: { seo, sections } });
    await ctx.audit({
      action: "update",
      entityTable: "pages",
      entityId: page._id,
      before: { page: key, ...(changes?.before ?? {}) },
      after: { page: key, ...(changes?.after ?? { sectionsEdited: true }) },
    });
    return null;
  },
});

/** Makes the draft live and tells the site to refresh the page. */
export const publish = authedMutation({
  args: { key: pageKeyValidator },
  returns: v.null(),
  handler: async (ctx, { key }) => {
    await ctx.requirePermission("pages.publish");
    const page = await getPageByKey(ctx, key);
    validateSeo(page.draft.seo);
    validateSections(page.draft.sections);
    const now = Date.now();
    await ctx.db.patch("pages", page._id, {
      published: page.draft,
      publishedAt: now,
      updatedAt: now,
      updatedBy: ctx.user._id,
    });
    await syncMediaUsages(ctx, { ...page, published: page.draft });
    await ctx.audit({
      action: "publish",
      entityTable: "pages",
      entityId: page._id,
      after: auditSummary(key, page.draft),
    });
    await notify(ctx, [pageTag(key)]);
    return null;
  },
});

/** Throws away unpublished edits: the draft becomes the live version again. */
export const discardDraft = authedMutation({
  args: { key: pageKeyValidator },
  returns: v.null(),
  handler: async (ctx, { key }) => {
    await ctx.requirePermission("pages.edit");
    const page = await getPageByKey(ctx, key);
    if (!page.published || !hasUnpublishedChanges(page)) return null;
    await ctx.db.patch("pages", page._id, {
      draft: page.published,
      updatedAt: Date.now(),
      updatedBy: ctx.user._id,
    });
    await syncMediaUsages(ctx, { ...page, draft: page.published });
    await ctx.audit({
      action: "update",
      entityTable: "pages",
      entityId: page._id,
      before: auditSummary(key, page.draft),
      after: { ...auditSummary(key, page.published), draftDiscarded: true },
    });
    return null;
  },
});

async function imageMap(ctx: QueryCtx, ids: Id<"media">[]) {
  const map = new Map<Id<"media">, PublicImage>();
  for (const id of ids) {
    const image = await publicImage(ctx, id);
    if (image) map.set(id, image);
  }
  return map;
}

/**
 * PUBLIC: a page as the site shows it - the published version only (never
 * the draft or who edited it), images resolved, hidden sections removed.
 * Null if the page was never published.
 */
export const getPublished = query({
  args: { key: pageKeyValidator },
  handler: async (ctx, { key }) => {
    const page = await ctx.db
      .query("pages")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (!page?.published) return null;
    const { sections, seo } = page.published;
    const images = await imageMap(ctx, sectionMediaIds(sections));
    const contact = toPublicContact(await loadSettings(ctx));
    const latestPosts = needsLatestPosts(sections)
      ? await Promise.all((await latestPublished(ctx, 6)).map((post) => toPostCard(ctx, post)))
      : [];
    return {
      key,
      seo,
      sections: resolveSections(sections, (id) => (id ? (images.get(id) ?? null) : null), contact, latestPosts),
      publishedAt: page.publishedAt ?? null,
    };
  },
});

/**
 * Creates the six pages (published, with starter content) if they don't
 * exist yet. Never touches an existing page, so edits survive re-seeding.
 */
export const seedContent = internalMutation({
  args: {},
  returns: v.object({ created: v.array(v.string()) }),
  handler: async (ctx) => {
    const created: string[] = [];
    const now = Date.now();
    for (const key of PAGE_KEYS) {
      const existing = await ctx.db
        .query("pages")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
      if (existing) continue;
      const content = DEFAULT_PAGES[key];
      await ctx.db.insert("pages", {
        key,
        draft: content,
        published: content,
        publishedAt: now,
        updatedAt: now,
        updatedBy: null,
      });
      created.push(key);
    }
    if (!(await ctx.db.query("siteSettings").first())) {
      await ctx.db.insert("siteSettings", EMPTY_SETTINGS);
      created.push("siteSettings");
    }
    return { created };
  },
});
