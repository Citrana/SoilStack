import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { diff } from "./lib/audit";
import { appError } from "./lib/errors";
import { locValidator, trimLoc } from "./lib/i18n";
import { clearMediaUsages, publicImage, setMediaUsages, type PublicImage } from "./lib/media";
import {
  checkProjectText,
  PROJECT_LIMITS,
  PROJECTS_SEED_STEP,
  PROJECTS_TAG,
  projectStageValidator,
  projectTag,
  publishedProjects,
  STARTER_PROJECTS,
  starterBody,
  toProjectCard,
} from "./lib/projects";
import { authedMutation, authedQuery, type AuthedMutationCtx } from "./lib/rbac";
import { EMPTY_DOC, isEmptyDoc, locRichValidator, richTextMediaIds, sanitizeRichText, type LocRich } from "./lib/richText";
import { cleanSlug, SLUG_MAX_LENGTH, slugify } from "./lib/slugs";

async function getProject(ctx: QueryCtx, projectId: Id<"projects">) {
  const project = await ctx.db.get("projects", projectId);
  if (!project) throw appError("NOT_FOUND", "Project not found.");
  return project;
}

async function slugTaken(ctx: QueryCtx, slug: string, except?: Id<"projects">) {
  const existing = await ctx.db
    .query("projects")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .first();
  return existing !== null && existing._id !== except;
}

async function uniqueSlug(ctx: QueryCtx, base: string) {
  let slug = base;
  for (let n = 2; await slugTaken(ctx, slug); n++) slug = `${base.slice(0, SLUG_MAX_LENGTH - 4)}-${n}`;
  return slug;
}

async function nextOrder(ctx: QueryCtx) {
  const last = await ctx.db.query("projects").withIndex("by_order").order("desc").first();
  return (last?.order ?? 0) + 1;
}

async function syncMedia(ctx: MutationCtx, p: Pick<Doc<"projects">, "_id" | "coverImageId" | "galleryIds" | "body">) {
  await setMediaUsages(ctx, { ownerTable: "projects", ownerId: p._id }, [
    ...(p.coverImageId ? [{ mediaId: p.coverImageId, field: "cover" }] : []),
    ...p.galleryIds.map((mediaId) => ({ mediaId, field: "gallery" })),
    ...richTextMediaIds(p.body.fr).map((mediaId) => ({ mediaId, field: "body" })),
    ...richTextMediaIds(p.body.en).map((mediaId) => ({ mediaId, field: "body" })),
  ]);
}

const summary = (p: Pick<Doc<"projects">, "slug" | "title" | "summary" | "stage" | "location" | "year" | "coverImageId" | "galleryIds" | "status">) => ({
  slug: p.slug,
  title: p.title,
  summary: p.summary,
  stage: p.stage,
  location: p.location ?? null,
  year: p.year ?? null,
  coverImageId: p.coverImageId ?? null,
  galleryIds: p.galleryIds,
  status: p.status,
});

async function notify(ctx: AuthedMutationCtx, slugs: string[]) {
  await ctx.scheduler.runAfter(0, internal.revalidate.notify, {
    tags: [PROJECTS_TAG, ...new Set(slugs.map(projectTag))],
  });
}

// ---------------------------------------------------------------- admin

export const listForAdmin = authedQuery({
  args: {},
  handler: async (ctx) => {
    await ctx.requirePermission("projects.manage");
    const projects = await ctx.db.query("projects").withIndex("by_order").take(500);
    return await Promise.all(
      projects.map(async (p) => ({
        _id: p._id,
        slug: p.slug,
        title: p.title,
        stage: p.stage,
        status: p.status,
        cover: await publicImage(ctx, p.coverImageId),
        updatedAt: p.updatedAt,
      })),
    );
  },
});

export const getForAdmin = authedQuery({
  args: { projectId: v.string() },
  handler: async (ctx, args) => {
    await ctx.requirePermission("projects.manage");
    const projectId = ctx.db.normalizeId("projects", args.projectId);
    return projectId ? await ctx.db.get("projects", projectId) : null;
  },
});

export const create = authedMutation({
  args: { title: locValidator },
  returns: v.id("projects"),
  handler: async (ctx, args) => {
    await ctx.requirePermission("projects.manage");
    const title = trimLoc(args.title);
    checkProjectText(title, { fr: "", en: "" }, undefined, undefined);
    const project = {
      slug: await uniqueSlug(ctx, slugify(title.fr || title.en, "projet")),
      title,
      summary: { fr: "", en: "" },
      body: { fr: EMPTY_DOC, en: EMPTY_DOC },
      stage: "planned" as const,
      galleryIds: [],
      status: "draft" as const,
      order: await nextOrder(ctx),
      updatedAt: Date.now(),
      updatedBy: ctx.user._id,
    };
    const projectId = await ctx.db.insert("projects", project);
    await ctx.audit({ action: "create", entityTable: "projects", entityId: projectId, after: summary(project) });
    return projectId;
  },
});

export const update = authedMutation({
  args: {
    projectId: v.id("projects"),
    slug: v.string(),
    title: locValidator,
    summary: locValidator,
    body: locRichValidator,
    stage: projectStageValidator,
    location: v.optional(locValidator),
    year: v.optional(v.string()),
    coverImageId: v.optional(v.id("media")),
    galleryIds: v.array(v.id("media")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.requirePermission("projects.manage");
    const project = await getProject(ctx, args.projectId);
    const title = trimLoc(args.title);
    const summaryText = trimLoc(args.summary);
    const location = args.location && (args.location.fr.trim() || args.location.en.trim()) ? trimLoc(args.location) : undefined;
    const year = args.year?.trim() || undefined;
    checkProjectText(title, summaryText, location, year);
    const galleryIds = [...new Set(args.galleryIds)];
    if (galleryIds.length > PROJECT_LIMITS.gallery) throw appError("INVALID_INPUT", `At most ${PROJECT_LIMITS.gallery} photos.`);
    const slug = cleanSlug(args.slug);
    if (await slugTaken(ctx, slug, project._id)) throw appError("INVALID_INPUT", "This address is already used by another project.");
    const body: LocRich = { fr: sanitizeRichText(args.body.fr), en: sanitizeRichText(args.body.en) };
    const next = { slug, title, summary: summaryText, body, stage: args.stage, location, year, coverImageId: args.coverImageId, galleryIds };

    if (!diff({ ...summary(project), b: project.body }, { ...summary({ ...project, ...next }), b: body })) return null;
    await ctx.db.patch("projects", project._id, { ...next, updatedAt: Date.now(), updatedBy: ctx.user._id });
    await syncMedia(ctx, { _id: project._id, coverImageId: next.coverImageId, galleryIds, body });
    const changes = diff(summary(project), summary({ ...project, ...next }));
    await ctx.audit({
      action: "update",
      entityTable: "projects",
      entityId: project._id,
      before: { slug: project.slug, ...(changes?.before ?? {}) },
      after: { slug, ...(changes?.after ?? { bodyEdited: true }) },
    });
    if (project.status === "published") await notify(ctx, [project.slug, slug]);
    return null;
  },
});

/** Moves a project one place up or down in the site's order. */
export const move = authedMutation({
  args: { projectId: v.id("projects"), direction: v.union(v.literal("up"), v.literal("down")) },
  returns: v.null(),
  handler: async (ctx, { projectId, direction }) => {
    await ctx.requirePermission("projects.manage");
    const all = await ctx.db.query("projects").withIndex("by_order").take(500);
    const index = all.findIndex((p) => p._id === projectId);
    if (index === -1) throw appError("NOT_FOUND", "Project not found.");
    const other = all[direction === "up" ? index - 1 : index + 1];
    if (!other) return null;
    const current = all[index];
    await ctx.db.patch("projects", current._id, { order: other.order });
    await ctx.db.patch("projects", other._id, { order: current.order });
    await ctx.audit({
      action: "update",
      entityTable: "projects",
      entityId: current._id,
      before: { slug: current.slug, order: current.order },
      after: { slug: current.slug, order: other.order },
    });
    if (current.status === "published" || other.status === "published") await notify(ctx, []);
    return null;
  },
});

/** Online. Needs title, summary and story in both languages. */
export const publish = authedMutation({
  args: { projectId: v.id("projects") },
  returns: v.null(),
  handler: async (ctx, { projectId }) => {
    await ctx.requirePermission("projects.manage");
    const project = await getProject(ctx, projectId);
    if (project.status === "published") return null;
    const missing: string[] = [];
    for (const lang of ["fr", "en"] as const) {
      if (!project.title[lang]) missing.push(`title.${lang}`);
      if (!project.summary[lang]) missing.push(`summary.${lang}`);
      if (isEmptyDoc(project.body[lang])) missing.push(`body.${lang}`);
    }
    if (missing.length) throw appError("INVALID_INPUT", `Missing before publishing: ${missing.join(", ")}.`);
    await ctx.db.patch("projects", project._id, { status: "published", updatedAt: Date.now(), updatedBy: ctx.user._id });
    await ctx.audit({ action: "publish", entityTable: "projects", entityId: project._id, after: summary({ ...project, status: "published" }) });
    await notify(ctx, [project.slug]);
    return null;
  },
});

export const unpublish = authedMutation({
  args: { projectId: v.id("projects") },
  returns: v.null(),
  handler: async (ctx, { projectId }) => {
    await ctx.requirePermission("projects.manage");
    const project = await getProject(ctx, projectId);
    if (project.status === "draft") return null;
    await ctx.db.patch("projects", project._id, { status: "draft", updatedAt: Date.now(), updatedBy: ctx.user._id });
    await ctx.audit({ action: "unpublish", entityTable: "projects", entityId: project._id, after: summary({ ...project, status: "draft" }) });
    await notify(ctx, [project.slug]);
    return null;
  },
});

/** Deletes a draft and frees its images. */
export const remove = authedMutation({
  args: { projectId: v.id("projects") },
  returns: v.null(),
  handler: async (ctx, { projectId }) => {
    await ctx.requirePermission("projects.manage");
    const project = await getProject(ctx, projectId);
    if (project.status !== "draft") throw appError("INVALID_INPUT", "Unpublish the project before deleting it.");
    await clearMediaUsages(ctx, { ownerTable: "projects", ownerId: project._id });
    await ctx.db.delete("projects", project._id);
    await ctx.audit({ action: "delete", entityTable: "projects", entityId: project._id, before: summary(project) });
    return null;
  },
});

/** Creates the starter projects as drafts, once (recorded). */
export const seedProjects = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const applied = await ctx.db
      .query("appliedSeedSteps")
      .withIndex("by_key", (q) => q.eq("key", PROJECTS_SEED_STEP))
      .unique();
    if (applied) return 0;
    let created = 0;
    for (const starter of STARTER_PROJECTS) {
      if (await slugTaken(ctx, starter.slug)) continue;
      await ctx.db.insert("projects", {
        ...starter,
        body: starterBody(starter.summary),
        galleryIds: [],
        status: "draft",
        order: await nextOrder(ctx),
        updatedAt: Date.now(),
        updatedBy: null,
      });
      created++;
    }
    await ctx.db.insert("appliedSeedSteps", { key: PROJECTS_SEED_STEP });
    return created;
  },
});

// ---------------------------------------------------------------- public

/** PUBLIC: published projects in display order, as cards. */
export const listPublished = query({
  args: {},
  handler: async (ctx) => await Promise.all((await publishedProjects(ctx)).map((p) => toProjectCard(ctx, p))),
});

/** PUBLIC: one published project with its photos and other projects. */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const project = await ctx.db
      .query("projects")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();
    if (!project || project.status !== "published") return null;
    const gallery: PublicImage[] = [];
    for (const id of project.galleryIds) {
      const image = await publicImage(ctx, id);
      if (image) gallery.push(image);
    }
    const bodyImages: Record<string, PublicImage> = {};
    for (const id of new Set([...richTextMediaIds(project.body.fr), ...richTextMediaIds(project.body.en)])) {
      const image = await publicImage(ctx, id);
      if (image) bodyImages[id] = image;
    }
    const others = (await publishedProjects(ctx)).filter((p) => p._id !== project._id).slice(0, 3);
    return {
      ...(await toProjectCard(ctx, project)),
      body: project.body,
      gallery,
      bodyImages,
      others: await Promise.all(others.map((p) => toProjectCard(ctx, p))),
    };
  },
});

/** PUBLIC: every published slug (sitemap, prebuilt project pages). */
export const publishedSlugs = query({
  args: {},
  handler: async (ctx) => (await publishedProjects(ctx)).map((p) => ({ slug: p.slug, updatedAt: p.updatedAt })),
});
