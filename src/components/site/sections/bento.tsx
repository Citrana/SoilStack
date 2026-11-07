import type { PublicSection } from "../../../../convex/lib/sections";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { FieldPattern, SectionImage } from "./section-image";
import { SectionHeading, SectionShell, t } from "./text";

type Bento = Extract<PublicSection, { type: "bento" }>;

/** Tall cards: dark green, light green, or a photo with its title. */
export function BentoSection({ section, locale }: { section: Bento; locale: Locale }) {
  return (
    <SectionShell className="bg-muted/60">
      <SectionHeading eyebrow={t(section.eyebrow, locale)} title={t(section.title, locale)} intro={t(section.intro, locale)} />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {section.cards.map((card, i) => (
          <li
            key={i}
            className={cn(
              "relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl p-5",
              card.tone === "light" ? "bg-lime-tint text-forest" : "text-white",
              card.tone === "dark" && "bg-gradient-to-br from-forest to-ink",
            )}
          >
            {card.image ? (
              <>
                <SectionImage image={card.image} locale={locale} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
                {card.tone !== "light" ? <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" /> : null}
              </>
            ) : card.tone === "photo" ? (
              <FieldPattern />
            ) : null}
            <h3 className="relative text-2xl font-medium text-balance">{t(card.title, locale)}</h3>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
