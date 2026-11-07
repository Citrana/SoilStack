"use client";

import { useTranslations } from "next-intl";
import type { Loc } from "../../../convex/lib/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * One content field in both languages (CLAUDE.md, "Content model"):
 * a French and an English input side by side (stacked on phones).
 */
export function LocalizedField({
  id,
  label,
  value,
  onChange,
  required = false,
  multiline = false,
  disabled = false,
}: {
  id: string;
  label: string;
  value: Loc;
  onChange: (value: Loc) => void;
  required?: boolean;
  multiline?: boolean;
  disabled?: boolean;
}) {
  const t = useTranslations("Common");
  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-2 text-sm font-medium">
        {label}
        {required ? (
          <span className="ml-0.5 text-destructive" aria-hidden>
            *
          </span>
        ) : null}
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["fr", "en"] as const).map((lang) => {
          const fieldId = `${id}-${lang}`;
          const common = {
            id: fieldId,
            lang,
            value: value[lang],
            required,
            onChange: (
              event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
            ) => onChange({ ...value, [lang]: event.target.value }),
          };
          return (
            <div key={lang} className="flex flex-col gap-1.5">
              <Label htmlFor={fieldId} className="text-xs text-muted-foreground">
                {t(lang === "fr" ? "french" : "english")}
              </Label>
              {multiline ? (
                <textarea
                  {...common}
                  rows={3}
                  className={cn(
                    "min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 md:text-sm",
                  )}
                />
              ) : (
                <Input {...common} />
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
