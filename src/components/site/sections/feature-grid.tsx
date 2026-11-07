import type { PublicSection } from "../../../../convex/lib/sections";
import type { Locale } from "@/i18n/routing";
import { SECTION_ICON_COMPONENTS } from "./icons";
import { SectionHeading, SectionShell, t } from "./text";

type FeatureGrid = Extract<PublicSection, { type: "featureGrid" }>;

/** Icon tile, title and text per feature: 1 → 2 → 4 columns. */
export function FeatureGridSection({ section, locale }: { section: FeatureGrid; locale: Locale }) {
  return (
    <SectionShell className="bg-card">
      <SectionHeading eyebrow={t(section.eyebrow, locale)} title={t(section.title, locale)} />
      <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {section.items.map((item, i) => {
          const Icon = SECTION_ICON_COMPONENTS[item.icon];
          return (
            <li key={i} className="flex flex-col gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl border bg-background text-leaf shadow-xs">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="font-medium text-balance">{t(item.title, locale)}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{t(item.text, locale)}</p>
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}
