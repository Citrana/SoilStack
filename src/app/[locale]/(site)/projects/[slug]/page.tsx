import { Suspense } from "react";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getPathname, Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { baseOpenGraph } from "@/lib/metadata";
import { getProject, getProjectSlugs } from "@/lib/content";
import { ProjectCard, projectMeta, StageBadge } from "@/components/site/project-card";
import { RichText } from "@/components/site/rich-text";
import { SectionImage } from "@/components/site/sections/section-image";
import { t as pick } from "@/components/site/sections/text";
import { buttonClasses } from "@/components/site/site-link";

type Props = PageProps<"/[locale]/projects/[slug]">;

/** Placeholder when nothing is published yet (Cache Components needs one param). */
const PLACEHOLDER = "__none__";

export async function generateStaticParams() {
  const slugs = await getProjectSlugs();
  return slugs.length ? slugs.map(({ slug }) => ({ slug })) : [{ slug: PLACEHOLDER }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale) || slug === PLACEHOLDER) return {};
  const project = await getProject(slug);
  if (!project) return {};
  const href = { pathname: "/projects/[slug]" as const, params: { slug } };
  return {
    title: pick(project.title, locale),
    description: pick(project.summary, locale),
    alternates: {
      canonical: getPathname({ locale, href }),
      languages: Object.fromEntries(routing.locales.map((l) => [l, getPathname({ locale: l, href })])),
    },
    openGraph: {
      ...baseOpenGraph(locale),
      title: pick(project.title, locale),
      description: pick(project.summary, locale),
      ...(project.cover ? { images: [{ url: project.cover.url, width: project.cover.width, height: project.cover.height }] } : {}),
    },
  };
}

async function Project({ locale, params }: { locale: Locale; params: Props["params"] }) {
  const { slug } = await params;
  if (slug === PLACEHOLDER) notFound();
  const project = await getProject(slug);
  if (!project) notFound();
  const t = await getTranslations({ locale, namespace: "Projects" });
  const meta = projectMeta(project, locale);
  return (
    <article>
      <header className="mx-auto flex max-w-3xl flex-col items-start gap-5">
        <Link href="/projects" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
          {t("back")}
        </Link>
        <StageBadge stage={project.stage} />
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{pick(project.title, locale)}</h1>
        <p className="text-lg text-muted-foreground">{pick(project.summary, locale)}</p>
        {meta ? <p className="text-sm text-muted-foreground">{meta}</p> : null}
      </header>
      {project.cover ? (
        <div className="relative mx-auto mt-10 aspect-[16/9] max-w-5xl overflow-hidden rounded-3xl">
          <SectionImage image={project.cover} locale={locale} sizes="(min-width: 1024px) 1024px, 100vw" preload />
        </div>
      ) : null}
      <div className="mx-auto mt-10 max-w-3xl">
        <RichText doc={project.body[locale]} images={project.bodyImages} locale={locale} />
      </div>
      {project.gallery.length ? (
        <section className="mx-auto mt-12 max-w-5xl" aria-label={t("gallery")}>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {project.gallery.map((image) => (
              <li key={image.url} className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
                <SectionImage image={image} locale={locale} sizes="(min-width: 768px) 33vw, 50vw" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="mx-auto mt-12 flex max-w-3xl flex-col items-start gap-3 rounded-3xl bg-forest p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <p className="font-medium">{t("ctaText")}</p>
        <Link href="/contact" className={buttonClasses.light}>
          {t("ctaButton")}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      {project.others.length ? (
        <aside className="mx-auto mt-16 max-w-6xl border-t pt-10">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">{t("others")}</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {project.others.map((other) => (
              <li key={other.slug}>
                <ProjectCard project={other} locale={locale} />
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </article>
  );
}

function ProjectSkeleton() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4" aria-hidden>
      <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
      <div className="h-12 w-full animate-pulse rounded bg-muted" />
      <div className="h-64 w-full animate-pulse rounded-3xl bg-muted" />
    </div>
  );
}

export default async function ProjectPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <div className="px-4 pt-28 pb-16 sm:pt-36">
      <Suspense fallback={<ProjectSkeleton />}>
        <Project locale={locale} params={params} />
      </Suspense>
    </div>
  );
}
