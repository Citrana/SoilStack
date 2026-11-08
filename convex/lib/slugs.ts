import { appError } from "./errors";

/** URL slugs, shared by posts and products: one per item, both languages. */
export const SLUG_MAX_LENGTH = 80;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "Récolte 2026 : nos résultats !" -> "recolte-2026-nos-resultats" */
export function slugify(text: string, fallback = "item"): string {
  return (
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, SLUG_MAX_LENGTH)
      .replace(/-+$/g, "") || fallback
  );
}

export function cleanSlug(slug: string): string {
  const value = slug.trim().toLowerCase();
  if (!SLUG_PATTERN.test(value) || value.length > SLUG_MAX_LENGTH) {
    throw appError("INVALID_INPUT", "The address may only use lowercase letters, digits and hyphens.");
  }
  return value;
}

