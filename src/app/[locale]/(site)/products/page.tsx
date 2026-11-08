import { Suspense } from "react";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getPathname, Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getCatalogue } from "@/lib/content";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/site/product-card";
import { Eyebrow, t as pick } from "@/components/site/sections/text";

type Props = PageProps<"/[locale]/products">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Products" });
  return {
    title: { absolute: t("metaTitle") },
    description: t("metaDescription"),
    alternates: {
      canonical: getPathname({ locale, href: "/products" }),
      languages: Object.fromEntries(routing.locales.map((l) => [l, getPathname({ locale: l, href: "/products" })])),
    },
  };
}

async function Catalogue({ locale, searchParams }: { locale: Locale; searchParams: Props["searchParams"] }) {
  const t = await getTranslations({ locale, namespace: "Products" });
  const raw = (await searchParams).category;
  const category = typeof raw === "string" ? raw : "";
  const data = await getCatalogue(category);
  const chip = (active: boolean) =>
    cn(
      "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm whitespace-nowrap transition-colors",
      active ? "border-forest bg-forest text-white" : "bg-card hover:border-leaf",
    );
  const total = data.categories.reduce((sum, c) => sum + c.count, 0);
  return (
    <>
      {data.categories.length > 0 ? (
        <nav aria-label={t("categories")} className="-mx-4 mb-8 overflow-x-auto px-4">
          <ul className="flex gap-2 pb-1">
            <li>
              <Link href="/products" className={chip(!category)} aria-current={!category ? "page" : undefined}>
                {t("all")} <span className="opacity-70">{total}</span>
              </Link>
            </li>
            {data.categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={{ pathname: "/products", query: { category: c.slug } }}
                  className={chip(category === c.slug)}
                  aria-current={category === c.slug ? "page" : undefined}
                >
                  {pick(c.name, locale)} <span className="opacity-70">{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      {data.selected && pick(data.selected.description, locale) ? (
        <p className="mb-6 max-w-2xl text-muted-foreground">{pick(data.selected.description, locale)}</p>
      ) : null}
      {data.products.length === 0 ? (
        <p className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">{category ? t("empty") : t("emptyAll")}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {data.products.map((product) => (
            <li key={product.slug}>
              <ProductCard product={product} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function CatalogueSkeleton() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-muted" />
      ))}
    </ul>
  );
}

export default async function ProductsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Products" });
  return (
    <section className="px-4 pt-28 pb-16 sm:pt-36">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex max-w-2xl flex-col items-start gap-4">
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Suspense fallback={<CatalogueSkeleton />}>
          <Catalogue locale={locale} searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}
