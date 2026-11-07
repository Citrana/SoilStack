import type { PublicSection } from "../../../../convex/lib/sections";
import type { Locale } from "@/i18n/routing";
import { buttonClasses, SiteLink } from "@/components/site/site-link";
import { FieldPattern, SectionImage } from "./section-image";
import { Eyebrow, t } from "./text";

type Hero = Extract<PublicSection, { type: "hero" }>;

/** Badge, big headline, subtitle, buttons, then a wide field photo. */
export function HeroSection({ section, locale, first }: { section: Hero; locale: Locale; first: boolean }) {
  const Title = first ? "h1" : "h2";
  return (
    <section className="px-4 pt-28 sm:pt-36">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <Eyebrow>{t(section.eyebrow, locale)}</Eyebrow>
        <Title className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">{t(section.title, locale)}</Title>
        {t(section.subtitle, locale) ? (
          <p className="max-w-2xl text-pretty text-muted-foreground sm:text-lg">{t(section.subtitle, locale)}</p>
        ) : null}
        {section.primaryCta || section.secondaryCta ? (
          <div className="flex flex-wrap justify-center gap-3">
            {section.primaryCta ? (
              <SiteLink link={section.primaryCta.link} className={buttonClasses.primary}>
                {t(section.primaryCta.label, locale)}
              </SiteLink>
            ) : null}
            {section.secondaryCta ? (
              <SiteLink link={section.secondaryCta.link} className={buttonClasses.secondary}>
                {t(section.secondaryCta.label, locale)}
              </SiteLink>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="relative mx-auto mt-12 aspect-[4/3] w-full max-w-6xl overflow-hidden rounded-3xl sm:aspect-[21/9]">
        {section.image ? (
          <SectionImage image={section.image} locale={locale} sizes="(min-width: 1152px) 1152px, 100vw" preload={first} />
        ) : (
          <FieldPattern />
        )}
      </div>
    </section>
  );
}
