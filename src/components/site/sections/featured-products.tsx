import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PublicSection } from "../../../../convex/lib/sections";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { ProductCard } from "../product-card";
import { SectionHeading, SectionShell, t } from "./text";

type FeaturedProducts = Extract<PublicSection, { type: "featuredProducts" }>;

export function FeaturedProductsSection({ section, locale }: { section: FeaturedProducts; locale: Locale }) {
  const tp = useTranslations("Products");
  if (section.products.length === 0) return null;
  return (
    <SectionShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading title={t(section.title, locale)} intro={t(section.intro, locale)} />
        <Link href="/products" className="mb-10 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-leaf">
          {tp("allProducts")}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {section.products.map((product) => (
          <li key={product.slug}>
            <ProductCard product={product} locale={locale} />
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
