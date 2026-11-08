import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { SITE_NAV } from "./nav-items";

/** Floating dark pill navbar (as in the design reference). */
export async function Navbar() {
  const t = await getTranslations("Site.nav");
  return (
    <header className="fixed inset-x-0 top-3 z-50 px-3">
      <nav
        aria-label={t("label")}
        className="relative mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 rounded-full bg-ink/95 pr-1.5 pl-5 text-white shadow-lg ring-1 ring-white/10 backdrop-blur"
      >
        <Link href="/" className="flex min-h-11 items-center" aria-label={t("home")}>
          <Logo />
        </Link>
        <ul className="hidden items-center gap-0.5 text-sm lg:flex">
          {SITE_NAV.filter((item) => item.key !== "home").map(({ key, href }) => (
            <li key={key}>
              <Link href={href} className="rounded-full px-3 py-2 text-white/80 transition-colors hover:text-white">
                {t(key)}
              </Link>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-2 lg:flex">
          <LocaleSwitcher tone="dark" />
          <Link
            href="/contact"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-sm hover:bg-white/10"
          >
            <span aria-hidden className="size-1.5 rounded-full bg-[#8bc34a]" />
            {t("contact")}
          </Link>
        </div>
        <MobileMenu />
      </nav>
    </header>
  );
}
