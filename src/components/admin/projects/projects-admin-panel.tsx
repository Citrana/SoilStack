"use client";

import { useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { pickLoc } from "../../../../convex/lib/i18n";
import type { Locale } from "@/i18n/routing";
import { Link, useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccessDenied, PageHeader } from "@/components/admin/page-header";
import { StageBadge } from "@/components/site/project-card";
import { useErrorMessage } from "@/lib/errors";
import { useCan } from "@/lib/use-can";

function NewProjectDialog() {
  const t = useTranslations("ProjectsAdmin");
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const create = useMutation(api.projects.create);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const id = await create({ title: { fr: title, en: "" } });
      router.push({ pathname: "/admin/projects/[id]", params: { id } });
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus aria-hidden />
            {t("newProject")}
          </Button>
        }
      />
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t("newProject")}</DialogTitle>
            <DialogDescription>{t("newProjectDescription")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-project-title" required>
              {t("titleFr")}
            </Label>
            <Input id="new-project-title" lang="fr" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={busy || !title.trim()}>
              {busy ? t("creating") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** /admin/projects: projects in their display order on the site. */
export function ProjectsAdminPanel() {
  const t = useTranslations("ProjectsAdmin");
  const locale = useLocale() as Locale;
  const errorMessage = useErrorMessage();
  const canManage = useCan("projects.manage");
  const projects = useQuery(api.projects.listForAdmin, canManage ? {} : "skip");
  const move = useMutation(api.projects.move);

  if (canManage === undefined) return null;
  if (!canManage) return <AccessDenied message={t("accessDenied")} />;

  async function reorder(projectId: Id<"projects">, direction: "up" | "down") {
    try {
      await move({ projectId, direction });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} actions={<NewProjectDialog />} />
      {projects?.length === 0 ? <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">{t("empty")}</p> : null}
      <ol className="flex flex-col gap-2">
        {(projects ?? []).map((project, i, all) => (
          <li key={project._id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
            <span className="relative size-14 shrink-0 overflow-hidden rounded-lg border bg-muted">
              {project.cover ? (
                // Admin thumbnail of an optimized library image.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={project.cover.url} alt="" className="size-full object-cover" />
              ) : null}
            </span>
            <div className="min-w-0 flex-1">
              <Link
                href={{ pathname: "/admin/projects/[id]", params: { id: project._id } }}
                className="font-medium underline-offset-4 hover:underline"
              >
                {pickLoc(project.title, locale) || t("untitled")}
              </Link>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {project.status === "published" ? <Badge>{t("statusPublished")}</Badge> : <Badge variant="secondary">{t("statusDraft")}</Badge>}
                <StageBadge stage={project.stage} />
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon-sm" aria-label={t("moveUp")} disabled={i === 0} onClick={() => reorder(project._id, "up")}>
                <ArrowUp aria-hidden />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label={t("moveDown")} disabled={i === all.length - 1} onClick={() => reorder(project._id, "down")}>
                <ArrowDown aria-hidden />
              </Button>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
