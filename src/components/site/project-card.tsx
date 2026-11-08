import { useTranslations } from "next-intl";
import type { ProjectCard as ProjectCardData, ProjectStage } from "../../../convex/lib/projects";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { FieldPattern, SectionImage } from "./sections/section-image";
import { t } from "./sections/text";

const STAGE_STYLES: Record<ProjectStage, string> = {
  planned: "bg-card text-muted-foreground border",
  in_progress: "bg-lime-tint text-forest",
  completed: "bg-forest text-white",
};

/** "Prévu" / "En cours" / "Terminé". */
export function StageBadge({ stage, className }: { stage: ProjectStage; className?: string }) {
  const tp = useTranslations("Projects.stages");
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", STAGE_STYLES[stage], className)}>{tp(stage)}</span>;
}

/** "Nord-Kivu · 2026" */
export function projectMeta(project: Pick<ProjectCardData, "location" | "year">, locale: Locale) {
  return [project.location ? t(project.location, locale) : "", project.year ?? ""].filter(Boolean).join(" · ");
}

export function ProjectCard({ project, locale }: { project: ProjectCardData; locale: Locale }) {
  const meta = projectMeta(project, locale);
  return (
    <Link
      href={{ pathname: "/projects/[slug]", params: { slug: project.slug } }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-colors hover:border-leaf"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {project.cover ? (
          <SectionImage
            image={project.cover}
            locale={locale}
            sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <FieldPattern />
        )}
        <StageBadge stage={project.stage} className="absolute top-3 left-3 shadow-sm" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-lg font-medium text-balance">{t(project.title, locale)}</h3>
        <p className="line-clamp-3 text-sm text-muted-foreground">{t(project.summary, locale)}</p>
        {meta ? <p className="mt-auto pt-2 text-xs text-muted-foreground">{meta}</p> : null}
      </div>
    </Link>
  );
}
