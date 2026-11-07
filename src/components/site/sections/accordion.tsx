import { Minus, Plus } from "lucide-react";
import type { PublicSection } from "../../../../convex/lib/sections";
import type { Locale } from "@/i18n/routing";
import { SectionImage } from "./section-image";
import { Paragraphs, SectionHeading, SectionShell, t } from "./text";

type Accordion = Extract<PublicSection, { type: "accordion" }>;

/** Numbered items that open in place (native <details>: no JavaScript). */
export function AccordionSection({ section, locale }: { section: Accordion; locale: Locale }) {
  return (
    <SectionShell>
      <SectionHeading eyebrow={t(section.eyebrow, locale)} title={t(section.title, locale)} intro={t(section.intro, locale)} />
      {section.images.length > 0 ? (
        <div
          className={
            section.images.length === 1
              ? "mb-10 grid"
              : section.images.length === 2
                ? "mb-10 grid grid-cols-[2fr_1fr] gap-3"
                : "mb-10 grid grid-cols-[2fr_1fr_1fr] gap-3"
          }
        >
          {section.images.map((image, i) => (
            <div
              key={i}
              className={
                section.images.length === 1
                  ? "relative aspect-[21/9] overflow-hidden rounded-2xl"
                  : "relative aspect-[3/4] overflow-hidden rounded-2xl sm:aspect-[4/3] first:sm:aspect-auto"
              }
            >
              <SectionImage image={image} locale={locale} sizes={i === 0 ? "(min-width: 1024px) 576px, 50vw" : "25vw"} />
            </div>
          ))}
        </div>
      ) : null}
      <ol className="divide-y border-y">
        {section.items.map((item, i) => (
          <li key={i}>
            <details className="group" open={i === 0}>
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-4 py-3 text-lg font-medium [&::-webkit-details-marker]:hidden">
                <span className="w-6 text-xs font-normal text-muted-foreground tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1">{t(item.title, locale)}</span>
                <Plus className="size-5 shrink-0 group-open:hidden" aria-hidden />
                <Minus className="hidden size-5 shrink-0 group-open:block" aria-hidden />
              </summary>
              <Paragraphs text={t(item.body, locale)} className="pb-5 pl-10 text-muted-foreground" />
            </details>
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}
