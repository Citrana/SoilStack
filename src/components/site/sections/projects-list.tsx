import type { PublicSection } from "../../../../convex/lib/sections";
import type { Locale } from "@/i18n/routing";
import { ProjectCard } from "../project-card";
import { SectionHeading, SectionShell, t } from "./text";

type ProjectsList = Extract<PublicSection, { type: "projectsList" }>;

export function ProjectsListSection({ section, locale }: { section: ProjectsList; locale: Locale }) {
  if (section.projects.length === 0) return null;
  return (
    <SectionShell>
      <SectionHeading title={t(section.title, locale)} intro={t(section.intro, locale)} />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {section.projects.map((project) => (
          <li key={project.slug}>
            <ProjectCard project={project} locale={locale} />
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
