import type { ProductCard as ProductCardData } from "../../../convex/lib/products";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { Price } from "./price";
import { FieldPattern, SectionImage } from "./sections/section-image";
import { t } from "./sections/text";

/** A product as a card: photo, category, name, short description, price. */
export function ProductCard({ product, locale }: { product: ProductCardData; locale: Locale }) {
  return (
    <Link
      href={{ pathname: "/products/[slug]", params: { slug: product.slug } }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-colors hover:border-leaf"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {product.image ? (
          <SectionImage
            image={product.image}
            locale={locale}
            sizes="(min-width: 1024px) 288px, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <FieldPattern />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {product.category ? <p className="text-xs font-medium text-leaf">{t(product.category.name, locale)}</p> : null}
        <h3 className="font-medium text-balance">{t(product.name, locale)}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{t(product.shortDescription, locale)}</p>
        <Price cents={product.priceCents} unit={product.unit} locale={locale} className="mt-auto pt-2 text-sm font-semibold text-forest" />
      </div>
    </Link>
  );
}
