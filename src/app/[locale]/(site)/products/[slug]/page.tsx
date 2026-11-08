import { Suspense } from "react";
import type { Metadata } from "next";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getPathname, Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { baseOpenGraph } from "@/lib/metadata";
import { getProduct, getProductSlugs, getSettings } from "@/lib/content";
import { cn } from "@/lib/utils";
import { JsonLd } from "@/components/site/json-ld";
import { Price } from "@/components/site/price";
import { ProductCard } from "@/components/site/product-card";
import { RichText } from "@/components/site/rich-text";
import { whatsappUrl } from "@/components/site/sections/contact-info";
import { FieldPattern, SectionImage } from "@/components/site/sections/section-image";
import { t as pick } from "@/components/site/sections/text";
import { buttonClasses } from "@/components/site/site-link";

type Props = PageProps<"/[locale]/products/[slug]">;

/** Placeholder when nothing is published yet (Cache Components needs one param). */
const PLACEHOLDER = "__none__";

export async function generateStaticParams() {
  const slugs = await getProductSlugs();
  return slugs.length ? slugs.map(({ slug }) => ({ slug })) : [{ slug: PLACEHOLDER }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale) || slug === PLACEHOLDER) return {};
  const product = await getProduct(slug);
  if (!product) return {};
  const href = { pathname: "/products/[slug]" as const, params: { slug } };
  return {
    title: pick(product.name, locale),
    description: pick(product.shortDescription, locale),
    alternates: {
      canonical: getPathname({ locale, href }),
      languages: Object.fromEntries(routing.locales.map((l) => [l, getPathname({ locale: l, href })])),
    },
    openGraph: {
      ...baseOpenGraph(locale),
      title: pick(product.name, locale),
      description: pick(product.shortDescription, locale),
      ...(product.image ? { images: [{ url: product.image.url, width: product.image.width, height: product.image.height }] } : {}),
    },
  };
}

/** schema.org Product, with an offer only when there is a price. */
function ProductJsonLd({ product, locale }: { product: NonNullable<Awaited<ReturnType<typeof getProduct>>>; locale: Locale }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: pick(product.name, locale),
    description: pick(product.shortDescription, locale),
    image: product.images.map((i) => i.url),
    ...(product.category ? { category: pick(product.category.name, locale) } : {}),
    brand: { "@type": "Brand", name: "SoilStack" },
    ...(product.priceCents !== null
      ? { offers: { "@type": "Offer", price: (product.priceCents / 100).toFixed(2), priceCurrency: "USD", availability: "https://schema.org/InStock" } }
      : {}),
  };
  return <JsonLd data={data} />;
}

async function Product({ locale, params, searchParams }: { locale: Locale; params: Props["params"]; searchParams: Props["searchParams"] }) {
  const { slug } = await params;
  if (slug === PLACEHOLDER) notFound();
  const [product, settings, t] = await Promise.all([getProduct(slug), getSettings(), getTranslations({ locale, namespace: "Products" })]);
  if (!product) notFound();
  const rawImage = Number((await searchParams).image);
  const active = Number.isInteger(rawImage) && rawImage >= 0 && rawImage < product.images.length ? rawImage : 0;
  const main = product.images[active] ?? null;
  const name = pick(product.name, locale);
  const pageUrl = getPathname({ locale, href: { pathname: "/products/[slug]", params: { slug } } });
  const order = settings.whatsapp
    ? `${whatsappUrl(settings.whatsapp)}?text=${encodeURIComponent(t("orderMessage", { name, path: pageUrl }))}`
    : null;

  return (
    <>
      <ProductJsonLd product={product} locale={locale} />
      <div className="mx-auto max-w-6xl">
        <Link href="/products" className="mb-6 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
          {t("back")}
        </Link>
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="flex flex-col gap-3">
            <div className="relative aspect-square overflow-hidden rounded-3xl bg-muted">
              {main ? <SectionImage image={main} locale={locale} sizes="(min-width: 1024px) 560px, 100vw" preload /> : <FieldPattern />}
            </div>
            {product.images.length > 1 ? (
              <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-4">
                {product.images.map((image, i) => (
                  <li key={image.url}>
                    <Link
                      href={{ pathname: "/products/[slug]", params: { slug }, query: i ? { image: String(i) } : {} }}
                      scroll={false}
                      replace
                      aria-label={t("photo", { n: i + 1 })}
                      aria-current={i === active ? "true" : undefined}
                      className={cn("relative block aspect-square overflow-hidden rounded-xl border-2", i === active ? "border-leaf" : "border-transparent")}
                    >
                      <SectionImage image={image} locale={locale} sizes="120px" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="flex flex-col gap-5">
            {product.category ? (
              <Link
                href={{ pathname: "/products", query: { category: product.category.slug } }}
                className="self-start text-sm font-medium text-leaf hover:underline"
              >
                {pick(product.category.name, locale)}
              </Link>
            ) : null}
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{name}</h1>
            <Price cents={product.priceCents} unit={product.unit} locale={locale} className="text-2xl font-semibold text-forest" />
            <p className="text-lg text-muted-foreground">{pick(product.shortDescription, locale)}</p>
            <div className="flex flex-wrap gap-3">
              {order ? (
                <a href={order} target="_blank" rel="noopener noreferrer" className={buttonClasses.primary}>
                  <MessageCircle className="size-4" aria-hidden />
                  {t("orderWhatsapp")}
                </a>
              ) : null}
              <Link href="/contact" className={order ? buttonClasses.secondary : buttonClasses.primary}>
                {t("contactUs")}
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">{t("orderHint")}</p>
            <div className="border-t pt-5">
              <RichText doc={product.description[locale]} images={product.bodyImages} locale={locale} />
            </div>
          </div>
        </div>
        {product.related.length ? (
          <aside className="mt-16 border-t pt-10">
            <h2 className="mb-6 text-2xl font-semibold tracking-tight">{t("related")}</h2>
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {product.related.map((related) => (
                <li key={related.slug}>
                  <ProductCard product={related} locale={locale} />
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </div>
    </>
  );
}

function ProductSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2" aria-hidden>
      <div className="aspect-square animate-pulse rounded-3xl bg-muted" />
      <div className="flex flex-col gap-4">
        <div className="h-10 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-8 w-1/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <div className="px-4 pt-28 pb-16 sm:pt-36">
      <Suspense fallback={<ProductSkeleton />}>
        <Product locale={locale} params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
