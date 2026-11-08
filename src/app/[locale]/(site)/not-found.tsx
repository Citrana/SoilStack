import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonClasses } from "@/components/site/site-link";

/**
 * Unknown article, product, project or page, inside the site frame. When
 * it streams in after the page started, the status stays 200 and Next
 * adds a noindex tag (Next 16 docs, notFound "Status codes").
 */
export default function SiteNotFound() {
  const t = useTranslations("NotFound");
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-5 px-4 pt-36 pb-24 text-center">
      <p className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-leaf">404</p>
      <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{t("title")}</h1>
      <p className="max-w-md text-muted-foreground">{t("description")}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonClasses.primary}>
          {t("backHome")}
        </Link>
        <Link href="/products" className={buttonClasses.secondary}>
          {t("products")}
        </Link>
        <Link href="/blog" className={buttonClasses.secondary}>
          {t("blog")}
        </Link>
      </div>
    </section>
  );
}
