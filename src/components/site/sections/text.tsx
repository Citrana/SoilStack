import type { ReactNode } from "react";
import { pickLoc, type Loc } from "../../../../convex/lib/i18n";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/** Text in the visitor's language (falls back to the other one). */
export function t(loc: Loc | undefined, locale: Locale) {
  return loc ? pickLoc(loc, locale) : "";
}

/** Body text: paragraphs separated by blank lines. */
export function Paragraphs({ text, className }: { text: string; className?: string }) {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {paragraphs.map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          {p}
        </p>
      ))}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-leaf",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-leaf" />
      {children}
    </span>
  );
}

export function SectionShell({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn("px-4 py-16 sm:py-20", className)}>
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

/** Eyebrow + title + intro, shared by most sections. */
export function SectionHeading({
  eyebrow,
  title,
  intro,
  center = false,
}: {
  eyebrow?: string;
  title?: string;
  intro?: string;
  center?: boolean;
}) {
  if (!eyebrow && !title && !intro) return null;
  return (
    <div className={cn("mb-10 flex max-w-2xl flex-col items-start gap-4", center && "mx-auto items-center text-center")}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      {title ? <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2> : null}
      {intro ? <p className="text-muted-foreground">{intro}</p> : null}
    </div>
  );
}
