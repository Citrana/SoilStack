import { defineSchema } from "convex/server";

/**
 * Single source of truth for every table. Tables are added feature by
 * feature (auth + RBAC, media, pages, blog, products, projects) — see the
 * project plan in CLAUDE.md.
 */
export default defineSchema({});
