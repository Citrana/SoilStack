import { v, type Infer } from "convex/values";

/**
 * Content languages. French is the default. Every piece of content is
 * stored in both (CLAUDE.md, "Content model").
 */
export const LOCALES = ["fr", "en"] as const;
export type ContentLocale = (typeof LOCALES)[number];

/** A localized plain-text field: `{ fr, en }`. */
export const locValidator = v.object({ fr: v.string(), en: v.string() });
export type Loc = Infer<typeof locValidator>;

/** The text for `locale`, falling back to the other language if empty. */
export function pickLoc(loc: Loc, locale: ContentLocale): string {
  return loc[locale].trim() || loc.fr.trim() || loc.en.trim();
}

/** Trims both languages. */
export function trimLoc(loc: Loc): Loc {
  return { fr: loc.fr.trim(), en: loc.en.trim() };
}
