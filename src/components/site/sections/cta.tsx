import { ArrowRight } from "lucide-react";
import type { PublicSection } from "../../../../convex/lib/sections";
import type { Locale } from "@/i18n/routing";
import { buttonClasses, SiteLink } from "@/components/site/site-link";
import { SectionShell, t } from "./text";

type Cta = Extract<PublicSection, { type: "cta" }>;

export function CtaSection({ section, locale }: { section: Cta; locale: Locale }) {
  return (
    <SectionShell>
      <div className="relative overflow-hidden rounded-3xl bg-forest px-6 py-12 text-white sm:px-12">
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{ backgroundImage: "radial-gradient(60% 120% at 100% 0%, rgb(78 139 58), transparent 70%)" }}
        />
        <div className="relative flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{t(section.title, locale)}</h2>
            {t(section.text, locale) ? <p className="mt-2 text-white/80">{t(section.text, locale)}</p> : null}
          </div>
          <SiteLink link={section.button.link} className={buttonClasses.light}>
            {t(section.button.label, locale)}
            <ArrowRight className="size-4" aria-hidden />
          </SiteLink>
        </div>
      </div>
    </SectionShell>
  );
}
