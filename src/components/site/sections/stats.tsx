import type { PublicSection } from "../../../../convex/lib/sections";
import type { Locale } from "@/i18n/routing";
import { SectionShell, t } from "./text";

type Stats = Extract<PublicSection, { type: "stats" }>;

export function StatsSection({ section, locale }: { section: Stats; locale: Locale }) {
  return (
    <SectionShell className="py-12 sm:py-14">
      <dl className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {section.items.map((item, i) => (
          <div key={i} className="flex flex-col gap-1 border-l-2 border-leaf pl-4">
            <dt className="order-2 text-sm text-muted-foreground">{t(item.label, locale)}</dt>
            <dd className="order-1 text-3xl font-semibold tracking-tight text-forest sm:text-4xl">{item.value}</dd>
          </div>
        ))}
      </dl>
    </SectionShell>
  );
}
