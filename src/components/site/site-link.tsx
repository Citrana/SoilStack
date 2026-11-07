import type { ReactNode } from "react";
import { PAGE_PATHS } from "../../../convex/lib/pages";
import type { SectionLink } from "../../../convex/lib/sections";
import { Link } from "@/i18n/navigation";

/** A section link: a company page (localized path) or an external URL. */
export function SiteLink({ link, className, children }: { link: SectionLink; className?: string; children: ReactNode }) {
  if (link.kind === "page") {
    return (
      <Link href={PAGE_PATHS[link.page]} className={className}>
        {children}
      </Link>
    );
  }
  const external = link.url.startsWith("https://");
  return (
    <a href={link.url} className={className} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  );
}

export const buttonClasses = {
  primary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-medium text-white transition-colors hover:bg-forest",
  secondary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border bg-card px-5 text-sm font-medium text-ink transition-colors hover:border-leaf",
  light:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-medium text-forest transition-colors hover:bg-lime-tint",
};
