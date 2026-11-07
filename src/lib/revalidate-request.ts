import { PAGE_KEYS, SETTINGS_TAG } from "../../convex/lib/pages";
import { POSTS_TAG } from "../../convex/lib/posts";

/** Tags Convex may ask the site to refresh (convex/revalidate.ts). */
const ALLOWED_TAGS = new Set<string>([SETTINGS_TAG, POSTS_TAG, ...PAGE_KEYS.map((key) => `page:${key}`)]);
const POST_TAG = /^post:[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isAllowedTag(tag: unknown): tag is string {
  return typeof tag === "string" && tag.length <= 100 && (ALLOWED_TAGS.has(tag) || POST_TAG.test(tag));
}

/** Compares two strings in time independent of where they differ. */
export function safeEqual(a: string, b: string) {
  let mismatch = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return mismatch === 0;
}

export type RevalidateDecision = { ok: true; tags: string[] } | { ok: false; status: 400 | 401 | 503 };

/** Checks the shared secret and keeps only known tags. */
export function parseRevalidateRequest(
  authorization: string | null,
  body: unknown,
  secret: string | undefined,
): RevalidateDecision {
  if (!secret) return { ok: false, status: 503 };
  if (!authorization || !safeEqual(authorization, `Bearer ${secret}`)) return { ok: false, status: 401 };
  const tags = (body as { tags?: unknown } | null)?.tags;
  if (!Array.isArray(tags) || tags.length === 0 || tags.length > 20) return { ok: false, status: 400 };
  const known = tags.filter(isAllowedTag);
  if (known.length !== tags.length) return { ok: false, status: 400 };
  return { ok: true, tags: [...new Set(known)] };
}
