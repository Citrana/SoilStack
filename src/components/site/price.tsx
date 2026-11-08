import { useTranslations } from "next-intl";
import type { Loc } from "../../../convex/lib/i18n";
import { formatUsd } from "../../../convex/lib/money";
import type { Locale } from "@/i18n/routing";
import { t } from "./sections/text";

/** "35 $US · sac de 50 kg", or "Prix sur demande". */
export function Price({ cents, unit, locale, className }: { cents: number | null; unit: Loc | null; locale: Locale; className?: string }) {
  const tp = useTranslations("Products");
  if (cents === null) return <span className={className}>{tp("priceOnRequest")}</span>;
  const unitText = unit ? t(unit, locale) : "";
  return (
    <span className={className}>
      {formatUsd(cents, locale)}
      {unitText ? <span className="font-normal text-muted-foreground"> · {unitText}</span> : null}
    </span>
  );
}
