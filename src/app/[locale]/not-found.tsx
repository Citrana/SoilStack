import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** Shown for every missing page under a locale (see [...rest] and notFound()). */
export default function NotFound() {
  const t = useTranslations("NotFound");
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="text-sm font-medium text-leaf">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground">{t("description")}</p>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground"
      >
        {t("backHome")}
      </Link>
    </main>
  );
}
