import { v, type Infer } from "convex/values";
import type { QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { appError } from "./errors";
import type { Loc } from "./i18n";
import { publicImage, type PublicImage } from "./media";
import type { RichDoc } from "./richText";

/** Cache tags of the projects (src/lib/content.ts, src/lib/revalidate-request.ts). */
export const PROJECTS_TAG = "projects";
export const projectTag = (slug: string) => `project:${slug}`;

export const projectStageValidator = v.union(v.literal("planned"), v.literal("in_progress"), v.literal("completed"));
export type ProjectStage = Infer<typeof projectStageValidator>;
export const PROJECT_STAGES: readonly ProjectStage[] = ["planned", "in_progress", "completed"];

export const PROJECT_LIMITS = { title: 200, summary: 500, location: 100, year: 15, gallery: 12 } as const;

export function checkProjectText(title: Loc, summary: Loc, location: Loc | undefined, year: string | undefined) {
  for (const lang of ["fr", "en"] as const) {
    if (title[lang].length > PROJECT_LIMITS.title) throw appError("INVALID_INPUT", "Title is too long.");
    if (summary[lang].length > PROJECT_LIMITS.summary) throw appError("INVALID_INPUT", "Summary is too long.");
    if (location && location[lang].length > PROJECT_LIMITS.location) throw appError("INVALID_INPUT", "Location is too long.");
  }
  if (year !== undefined && year.length > PROJECT_LIMITS.year) throw appError("INVALID_INPUT", "Year is too long.");
}

/** A project as a card (projects list section, "other projects"). */
export type ProjectCard = {
  slug: string;
  title: Loc;
  summary: Loc;
  stage: ProjectStage;
  location: Loc | null;
  year: string | null;
  cover: PublicImage | null;
};

export async function toProjectCard(ctx: QueryCtx, project: Doc<"projects">): Promise<ProjectCard> {
  return {
    slug: project.slug,
    title: project.title,
    summary: project.summary,
    stage: project.stage,
    location: project.location ?? null,
    year: project.year ?? null,
    cover: await publicImage(ctx, project.coverImageId),
  };
}

/** Published projects in their display order. */
export async function publishedProjects(ctx: QueryCtx, limit = 200) {
  return await ctx.db
    .query("projects")
    .withIndex("by_status_and_order", (q) => q.eq("status", "published"))
    .take(limit);
}

const paragraph = (text: string): RichDoc => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

/** Starter projects (drafts), from the Projects page text; seeded once. */
export const STARTER_PROJECTS: ReadonlyArray<{
  slug: string;
  title: Loc;
  summary: Loc;
  stage: ProjectStage;
}> = [
  {
    slug: "plateforme-soilstack",
    title: { fr: "Plateforme SoilStack", en: "SoilStack Platform" },
    summary: {
      fr: "Notre logiciel de gestion agricole et nos conseils IA, réunis dans un même outil.",
      en: "Our farm management software and AI crop advice, together in one tool.",
    },
    stage: "in_progress",
  },
  {
    slug: "drones",
    title: { fr: "Drones", en: "Drones" },
    summary: { fr: "Surveillance aérienne et pulvérisation des champs.", en: "Aerial monitoring and field spraying." },
    stage: "planned",
  },
  {
    slug: "intrants",
    title: { fr: "Intrants", en: "Supplies" },
    summary: {
      fr: "Engrais, semences et outils pour les exploitations de toutes tailles.",
      en: "Fertilizer, seeds and tools for farms of every size.",
    },
    stage: "planned",
  },
  {
    slug: "api-partenaires",
    title: { fr: "API pour les partenaires", en: "API for partners" },
    summary: {
      fr: "Pour que coopératives, ONG et entreprises intègrent nos outils à leurs propres services.",
      en: "So cooperatives, NGOs and businesses can build our tools into their own services.",
    },
    stage: "planned",
  },
];
export const starterBody = (summary: Loc) => ({ fr: paragraph(summary.fr), en: paragraph(summary.en) });
export const PROJECTS_SEED_STEP = "2026-11-starter-projects";
