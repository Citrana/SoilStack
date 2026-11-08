import { cacheLife, cacheTag } from "next/cache";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../convex/_generated/api";
import { pageTag, SETTINGS_TAG, type PageKey } from "../../convex/lib/pages";
import { POSTS_TAG, postTag } from "../../convex/lib/posts";
import { PRODUCTS_TAG, productTag } from "../../convex/lib/products";
import { PROJECTS_TAG, projectTag } from "../../convex/lib/projects";

/**
 * Public content, read on the server and cached (CLAUDE.md, "Performance").
 * Each entry holds both languages. Publishing in the admin refreshes the
 * tag through /api/revalidate; cacheLife("hours") is the safety net.
 * A page also depends on the settings (contact section), the blog (latest
 * posts), the catalogue (featured products) and the projects list.
 */
export async function getPage(key: PageKey) {
  "use cache";
  cacheTag(pageTag(key), SETTINGS_TAG, POSTS_TAG, PRODUCTS_TAG, PROJECTS_TAG);
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

/** The catalogue, optionally one category ("" = all). */
export async function getCatalogue(category: string) {
  "use cache";
  cacheTag(PRODUCTS_TAG);
  cacheLife("hours");
  return await fetchQuery(api.products.catalogue, category ? { category } : {});
}

export async function getProduct(slug: string) {
  "use cache";
  cacheTag(productTag(slug), PRODUCTS_TAG);
  cacheLife("hours");
  return await fetchQuery(api.products.getBySlug, { slug });
}

export async function getProductSlugs() {
  "use cache";
  cacheTag(PRODUCTS_TAG);
  cacheLife("hours");
  return await fetchQuery(api.products.publishedSlugs, {});
}

export async function getProject(slug: string) {
  "use cache";
  cacheTag(projectTag(slug), PROJECTS_TAG);
  cacheLife("hours");
  return await fetchQuery(api.projects.getBySlug, { slug });
}

export async function getProjectSlugs() {
  "use cache";
  cacheTag(PROJECTS_TAG);
  cacheLife("hours");
  return await fetchQuery(api.projects.publishedSlugs, {});
}

export type PublishedPage = NonNullable<Awaited<ReturnType<typeof getPage>>>;
export type PublicSettings = Awaited<ReturnType<typeof getSettings>>;
export type PublishedProduct = NonNullable<Awaited<ReturnType<typeof getProduct>>>;
export type PublishedPost = NonNullable<Awaited<ReturnType<typeof getPost>>>;
