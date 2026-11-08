"use client";

import { useEffect, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { LocaleSwitcher, type LocaleSwitcherLabels } from "@/components/locale-switcher";
import { SITE_NAV } from "./nav-items";

export type MobileMenuLabels = {
  open: string;
  close: string;
  nav: Record<(typeof SITE_NAV)[number]["key"] | "contact", string>;
  switcher: LocaleSwitcherLabels;
};

/**
 * Phone menu: a tiny toggle and panel. Labels come from the server navbar
 * and the icons are inline, so it ships no translations or icon library.
 */
export function MobileMenu({ labels }: { labels: MobileMenuLabels }) {
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
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? labels.close : labels.open}
        onClick={() => setOpen((value) => !value)}
        className="flex size-11 items-center justify-center rounded-full text-white hover:bg-white/10"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
        </svg>
      </button>
      {open ? (
        <div id="mobile-menu" className="absolute inset-x-0 top-full mt-2 rounded-3xl bg-ink p-3 text-white shadow-xl ring-1 ring-white/10">
          <ul className="flex flex-col">
            {[...SITE_NAV, { key: "contact", href: "/contact" } as const].map(({ key, href }) => (
              <li key={key}>
                <Link
                  href={href}
                  aria-current={pathname === href ? "page" : undefined}
                  className="flex min-h-12 items-center rounded-2xl px-4 text-base hover:bg-white/10 aria-[current=page]:bg-white/10"
                >
                  {labels.nav[key]}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-2 border-t border-white/10 px-2 pt-3">
            <LocaleSwitcher tone="dark" labels={labels.switcher} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
