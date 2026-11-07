"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SITE_NAV } from "./nav-items";

/** Phone menu: a tiny toggle and panel (no dialog library, little JS). */
export function MobileMenu() {
  const t = useTranslations("Site.nav");
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // Close when the page changes.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? t("closeMenu") : t("openMenu")}
        onClick={() => setOpen((value) => !value)}
        className="flex size-11 items-center justify-center rounded-full text-white hover:bg-white/10"
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
      </button>
      {open ? (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full mt-2 rounded-3xl bg-ink p-3 text-white shadow-xl ring-1 ring-white/10"
        >
          <ul className="flex flex-col">
            {[...SITE_NAV, { key: "contact", href: "/contact" } as const].map(({ key, href }) => (
              <li key={key}>
                <Link
                  href={href}
                  aria-current={pathname === href ? "page" : undefined}
                  className="flex min-h-12 items-center rounded-2xl px-4 text-base hover:bg-white/10 aria-[current=page]:bg-white/10"
                >
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-2 border-t border-white/10 px-2 pt-3">
            <LocaleSwitcher tone="dark" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
