import type { PublicSection } from "../../../../convex/lib/sections";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { FieldPattern, SectionImage } from "./section-image";
import { Eyebrow, Paragraphs, SectionShell, t } from "./text";

type TextImage = Extract<PublicSection, { type: "textImage" }>;

export function TextImageSection({ section, locale }: { section: TextImage; locale: Locale }) {
  return (
    <SectionShell>
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div className={cn("flex flex-col gap-5", section.imageSide === "left" && "lg:order-2")}>
          {t(section.eyebrow, locale) ? <Eyebrow className="self-start">{t(section.eyebrow, locale)}</Eyebrow> : null}
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{t(section.title, locale)}</h2>
          <Paragraphs text={t(section.body, locale)} className="text-muted-foreground" />
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
          {section.image ? (
            <SectionImage image={section.image} locale={locale} sizes="(min-width: 1024px) 576px, 100vw" />
          ) : (
            <FieldPattern />
          )}
        </div>
      </div>
    </SectionShell>
  );
}
