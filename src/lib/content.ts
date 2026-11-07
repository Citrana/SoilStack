import { cacheLife, cacheTag } from "next/cache";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../convex/_generated/api";
import { pageTag, SETTINGS_TAG, type PageKey } from "../../convex/lib/pages";
import { POSTS_TAG, postTag } from "../../convex/lib/posts";

/**
 * Public content, read on the server and cached (CLAUDE.md, "Performance").
 * Each entry holds both languages. Publishing in the admin refreshes the
 * tag through /api/revalidate; cacheLife("hours") is the safety net.
 * A page also depends on the settings (contact section) and the blog
 * (latest posts section).
 */
export async function getPage(key: PageKey) {
  "use cache";
  cacheTag(pageTag(key), SETTINGS_TAG, POSTS_TAG);
  cacheLife("hours");
  return await fetchQuery(api.pages.getPublished, { key });
}

export async function getSettings() {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("hours");
  return await fetchQuery(api.settings.getPublic, {});
}

/** One page of the blog list (12 posts). */
export async function getPostsPage(page: number) {
  "use cache";
  cacheTag(POSTS_TAG);
  cacheLife("hours");
  return await fetchQuery(api.posts.listPublished, { page });
}

export async function getPost(slug: string) {
  "use cache";
  cacheTag(postTag(slug), POSTS_TAG);
  cacheLife("hours");
  return await fetchQuery(api.posts.getBySlug, { slug });
}

export async function getPublishedSlugs() {
  "use cache";
  cacheTag(POSTS_TAG);
  cacheLife("hours");
  return await fetchQuery(api.posts.publishedSlugs, {});
}

export type PublishedPage = NonNullable<Awaited<ReturnType<typeof getPage>>>;
export type PublicSettings = Awaited<ReturnType<typeof getSettings>>;
export type PublishedPost = NonNullable<Awaited<ReturnType<typeof getPost>>>;
