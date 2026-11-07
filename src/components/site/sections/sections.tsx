import type { PublicSection } from "../../../../convex/lib/sections";
import type { Locale } from "@/i18n/routing";
import { AccordionSection } from "./accordion";
import { BentoSection } from "./bento";
import { ContactInfoSection } from "./contact-info";
import { CtaSection } from "./cta";
import { FeatureGridSection } from "./feature-grid";
import { HeroSection } from "./hero";
import { LatestPostsSection } from "./latest-posts";
import { StatsSection } from "./stats";
import { TextImageSection } from "./text-image";

/**
 * Renders a page's sections. Used by the public pages (server) and the
 * admin preview (client) alike - keep these components free of
 * server-only APIs.
 */
export function Sections({ sections, locale }: { sections: PublicSection[]; locale: Locale }) {
  return (
    <>
      {sections.map((section, index) => {
        const key = section.id;
        switch (section.type) {
          case "hero":
            return <HeroSection key={key} section={section} locale={locale} first={index === 0} />;
          case "featureGrid":
            return <FeatureGridSection key={key} section={section} locale={locale} />;
          case "textImage":
            return <TextImageSection key={key} section={section} locale={locale} />;
          case "accordion":
            return <AccordionSection key={key} section={section} locale={locale} />;
          case "bento":
            return <BentoSection key={key} section={section} locale={locale} />;
          case "stats":
            return <StatsSection key={key} section={section} locale={locale} />;
          case "cta":
            return <CtaSection key={key} section={section} locale={locale} />;
          case "contactInfo":
            return <ContactInfoSection key={key} section={section} locale={locale} />;
          case "latestPosts":
            return <LatestPostsSection key={key} section={section} locale={locale} />;
        }
      })}
    </>
  );
}
