import { Suspense } from "react";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getPathname, Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getPostsPage } from "@/lib/content";
import { PostCard } from "@/components/site/post-card";
import { Eyebrow } from "@/components/site/sections/text";

export async function generateMetadata({ params }: PageProps<"/[locale]/blog">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Blog" });
  return {
    title: { absolute: t("metaTitle") },
    description: t("metaDescription"),
    alternates: {
      canonical: getPathname({ locale, href: "/blog" }),
      languages: Object.fromEntries(routing.locales.map((l) => [l, getPathname({ locale: l, href: "/blog" })])),
    },
  };
}

async function PostList({ locale, searchParams }: { locale: Locale; searchParams: PageProps<"/[locale]/blog">["searchParams"] }) {
  const t = await getTranslations({ locale, namespace: "Blog" });
  const raw = (await searchParams).page;
  const page = Math.max(1, Number.parseInt(typeof raw === "string" ? raw : "1", 10) || 1);
  const data = await getPostsPage(page);
  if (data.posts.length === 0) {
    return <p className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">{page === 1 ? t("empty") : t("noMore")}</p>;
  }
  const pageLink = (n: number) => ({ pathname: "/blog" as const, query: n > 1 ? { page: String(n) } : {} });
  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.posts.map((post) => (
          <li key={post.slug}>
            <PostCard post={post} locale={locale} />
          </li>
        ))}
      </ul>
      {data.page > 1 || data.hasMore ? (
        <nav aria-label={t("pagination")} className="mt-10 flex items-center justify-between gap-3">
          {data.page > 1 ? (
            <Link href={pageLink(data.page - 1)} className="inline-flex min-h-11 items-center rounded-xl border bg-card px-4 text-sm">
              ← {t("newer")}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted-foreground">{t("page", { page: data.page })}</span>
          {data.hasMore ? (
            <Link href={pageLink(data.page + 1)} className="inline-flex min-h-11 items-center rounded-xl border bg-card px-4 text-sm">
              {t("older")} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}

function GridSkeleton() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="h-80 animate-pulse rounded-2xl bg-muted" />
      ))}
    </ul>
  );
}

export default async function BlogPage({ params, searchParams }: PageProps<"/[locale]/blog">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Blog" });
  return (
    <section className="px-4 pt-28 pb-16 sm:pt-36">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex max-w-2xl flex-col items-start gap-4">
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Suspense fallback={<GridSkeleton />}>
          <PostList locale={locale} searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}
