import { cacheLife, cacheTag } from "next/cache";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../convex/_generated/api";
import { pageTag, SETTINGS_TAG, type PageKey } from "../../convex/lib/pages";

/**
 * Public content, read on the server and cached (CLAUDE.md, "Performance").
 * Each entry holds both languages. Publishing in the admin refreshes the
 * tag through /api/revalidate; cacheLife("hours") is the safety net.
 * A page also depends on the settings (its contact section).
 */
export async function getPage(key: PageKey) {
  "use cache";
  cacheTag(pageTag(key), SETTINGS_TAG);
  cacheLife("hours");
  return await fetchQuery(api.pages.getPublished, { key });
}

export async function getSettings() {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("hours");
  return await fetchQuery(api.settings.getPublic, {});
}

export type PublishedPage = NonNullable<Awaited<ReturnType<typeof getPage>>>;
export type PublicSettings = Awaited<ReturnType<typeof getSettings>>;
