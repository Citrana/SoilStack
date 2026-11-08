import { Suspense } from "react";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { hasLocale } from "next-intl";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getPathname, Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { baseOpenGraph } from "@/lib/metadata";
import { getPost, getPublishedSlugs } from "@/lib/content";
import { JsonLd } from "@/components/site/json-ld";
import { PostCard } from "@/components/site/post-card";
import { absoluteUrl } from "@/lib/site-url";
import { RichText } from "@/components/site/rich-text";
import { SectionImage } from "@/components/site/sections/section-image";
import { t as pick } from "@/components/site/sections/text";

/** Placeholder when nothing is published yet (Cache Components needs one param). */
const PLACEHOLDER = "__none__";

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs();
  return slugs.length ? slugs.map(({ slug }) => ({ slug })) : [{ slug: PLACEHOLDER }];
}

export async function generateMetadata({ params }: PageProps<"/[locale]/blog/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale) || slug === PLACEHOLDER) return {};
  const post = await getPost(slug);
  if (!post) return {};
  const href = { pathname: "/blog/[slug]" as const, params: { slug } };
  return {
    title: pick(post.title, locale),
    description: pick(post.excerpt, locale),
    alternates: {
      canonical: getPathname({ locale, href }),
      languages: Object.fromEntries(routing.locales.map((l) => [l, getPathname({ locale: l, href })])),
    },
    openGraph: {
      ...baseOpenGraph(locale),
      type: "article",
      title: pick(post.title, locale),
      description: pick(post.excerpt, locale),
      publishedTime: new Date(post.publishedAt).toISOString(),
      ...(post.cover ? { images: [{ url: post.cover.url, width: post.cover.width, height: post.cover.height }] } : {}),
    },
  };
}

async function Article({ locale, params }: { locale: Locale; params: PageProps<"/[locale]/blog/[slug]">["params"] }) {
  const { slug } = await params;
  if (slug === PLACEHOLDER) notFound();
  const post = await getPost(slug);
  if (!post) notFound();
  const t = await getTranslations({ locale, namespace: "Blog" });
  const format = await getFormatter({ locale });
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: pick(post.title, locale),
    description: pick(post.excerpt, locale),
    datePublished: new Date(post.publishedAt).toISOString(),
    inLanguage: locale,
    ...(post.cover ? { image: [post.cover.url] } : {}),
    publisher: { "@type": "Organization", name: "SoilStack", logo: { "@type": "ImageObject", url: absoluteUrl("/icon.svg") } },
  };
  return (
    <article>
      <JsonLd data={jsonLd} />
      <header className="mx-auto flex max-w-3xl flex-col gap-5">
        <Link href="/blog" className="inline-flex min-h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
          {t("back")}
        </Link>
        <p className="text-sm text-muted-foreground">
          <time dateTime={new Date(post.publishedAt).toISOString()}>{format.dateTime(post.publishedAt, { dateStyle: "long" })}</time>
          {" · "}
          {t("readingTime", { minutes: post.readingMinutes[locale] })}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{pick(post.title, locale)}</h1>
        <p className="text-lg text-muted-foreground">{pick(post.excerpt, locale)}</p>
      </header>
      {post.cover ? (
        <div className="relative mx-auto mt-10 aspect-[16/9] max-w-5xl overflow-hidden rounded-3xl">
          <SectionImage image={post.cover} locale={locale} sizes="(min-width: 1024px) 1024px, 100vw" preload />
        </div>
      ) : null}
      <div className="mx-auto mt-10 max-w-3xl">
        <RichText doc={post.body[locale]} images={post.images} locale={locale} />
        {post.tags.length ? (
          <ul className="mt-10 flex flex-wrap gap-2" aria-label={t("tags")}>
            {post.tags.map((tag) => (
              <li key={tag} className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
                #{tag}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {post.related.length ? (
        <aside className="mx-auto mt-16 max-w-6xl border-t pt-10">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">{t("related")}</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {post.related.map((related) => (
              <li key={related.slug}>
                <PostCard post={related} locale={locale} />
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </article>
  );
}

function ArticleSkeleton() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4" aria-hidden>
      <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      <div className="h-12 w-full animate-pulse rounded bg-muted" />
      <div className="h-64 w-full animate-pulse rounded-3xl bg-muted" />
    </div>
  );
}

export default async function ArticlePage({ params }: PageProps<"/[locale]/blog/[slug]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <div className="px-4 pt-28 pb-16 sm:pt-36">
      <Suspense fallback={<ArticleSkeleton />}>
        <Article locale={locale} params={params} />
      </Suspense>
    </div>
  );
}
