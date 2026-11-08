import { v } from "convex/values";

/** Validator for PageKey (kept apart from ./pages.ts, which the browser imports). */
export const pageKeyValidator = v.union(
  v.literal("home"),
  v.literal("about"),
  v.literal("solutions"),
  v.literal("innovation"),
  v.literal("projects"),
  v.literal("contact"),
);
