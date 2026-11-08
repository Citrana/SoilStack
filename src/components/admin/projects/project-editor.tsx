"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Trash2, Upload } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { notFound, useParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { pickLoc, type Loc } from "../../../../convex/lib/i18n";
import { PROJECT_LIMITS, PROJECT_STAGES, type ProjectStage } from "../../../../convex/lib/projects";
import { isEmptyDoc, richTextMediaIds, type LocRich } from "../../../../convex/lib/richText";
import { slugify } from "../../../../convex/lib/slugs";
import type { Locale } from "@/i18n/routing";
import { Link, useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { LocalizedField } from "@/components/admin/localized-field";
import { AccessDenied } from "@/components/admin/page-header";
import { ImageField, ImageListField } from "@/components/admin/pages/fields";
import { RichTextEditor } from "@/components/admin/blog/rich-text-editor";
import { StageBadge } from "@/components/site/project-card";
import { RichText } from "@/components/site/rich-text";
import { useErrorMessage } from "@/lib/errors";
import { useCan } from "@/lib/use-can";
import { cn } from "@/lib/utils";

type Draft = {
  slug: string;
  title: Loc;
  summary: Loc;
  body: LocRich;
  stage: ProjectStage;
  location: Loc;
  year: string;
  coverImageId: Id<"media"> | undefined;
  galleryIds: Id<"media">[];
};

const EMPTY: Loc = { fr: "", en: "" };
const fromProject = (p: Doc<"projects">): Draft => ({
  slug: p.slug,
  title: p.title,
  summary: p.summary,
  body: p.body,
  stage: p.stage,
  location: p.location ?? EMPTY,
  year: p.year ?? "",
  coverImageId: p.coverImageId,
  galleryIds: p.galleryIds,
});

function stable(value: unknown) {
  return JSON.stringify(value, (_k, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v,
  );
}

function Editor({ project }: { project: Doc<"projects"> }) {
  const t = useTranslations("ProjectsAdmin");
  const tStages = useTranslations("Projects.stages");
  const tCommon = useTranslations("Common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const update = useMutation(api.projects.update);
  const publish = useMutation(api.projects.publish);
  const unpublish = useMutation(api.projects.unpublish);
  const remove = useMutation(api.projects.remove);

  const initial = useMemo(() => fromProject(project), [project]);
  const [draft, setDraft] = useState<Draft>(initial);
  const [baseline, setBaseline] = useState<Draft>(initial);
  const [slugTouched, setSlugTouched] = useState(project.status !== "draft" || project.slug !== slugify(project.title.fr || project.title.en, "projet"));
  const [tab, setTab] = useState<"fr" | "en">("fr");
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<Locale | null>(null);
  const dirty = stable(draft) !== stable(baseline);

  const [lastInitial, setLastInitial] = useState(initial);
  if (stable(initial) !== stable(lastInitial)) {
    setLastInitial(initial);
    if (!dirty) {
      setDraft(initial);
      setBaseline(initial);
    }
  }

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const mediaIds = useMemo(
    () => [...new Set([...(draft.coverImageId ? [draft.coverImageId] : []), ...draft.galleryIds, ...richTextMediaIds(draft.body.fr), ...richTextMediaIds(draft.body.en)])],
    [draft.coverImageId, draft.galleryIds, draft.body],
  );
  const images = useQuery(api.media.publicImages, mediaIds.length ? { mediaIds } : "skip") ?? {};
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  async function save() {
    await update({
      projectId: project._id,
      slug: draft.slug,
      title: draft.title,
      summary: draft.summary,
      body: draft.body,
      stage: draft.stage,
      location: draft.location.fr.trim() || draft.location.en.trim() ? draft.location : undefined,
      year: draft.year.trim() || undefined,
      coverImageId: draft.coverImageId,
      galleryIds: draft.galleryIds,
    });
    setBaseline(draft);
  }

  function missing() {
    const out: string[] = [];
    for (const lang of ["fr", "en"] as const) {
      const L = lang.toUpperCase();
      if (!draft.title[lang].trim()) out.push(`${t("fields.title")} (${L})`);
      if (!draft.summary[lang].trim()) out.push(`${t("fields.summary")} (${L})`);
      if (isEmptyDoc(draft.body[lang])) out.push(`${t("fields.body")} (${L})`);
    }
    return out;
  }

  async function run(kind: "save" | "publish" | "unpublish" | "delete") {
    if (kind === "delete" && !window.confirm(t("deleteConfirm"))) return;
    setBusy(kind);
    try {
      if (kind === "save") {
        await save();
        toast.success(project.status === "published" ? t("savedLive") : t("saved"));
      } else if (kind === "publish") {
        const gaps = missing();
        if (gaps.length) {
          toast.error(t("missingBeforePublish", { fields: gaps.join(", ") }));
          return;
        }
        if (dirty) await save();
        await publish({ projectId: project._id });
        toast.success(t("publishedToast"));
      } else if (kind === "unpublish") {
        await unpublish({ projectId: project._id });
        toast.success(t("unpublishedToast"));
      } else {
        await remove({ projectId: project._id });
        toast.success(t("deleted"));
        router.replace("/admin/projects");
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const published = project.status === "published";
  const cover = draft.coverImageId ? images[draft.coverImageId] : undefined;
  return (
    <div className="flex flex-col gap-6 pb-28">
      <Link href="/admin/projects" className="inline-flex min-h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{pickLoc(draft.title, locale) || t("untitled")}</h1>
        <div className="flex gap-2">
          {dirty ? <Badge variant="outline">{t("unsaved")}</Badge> : null}
          {published ? <Badge>{t("statusPublished")}</Badge> : <Badge variant="secondary">{t("statusDraft")}</Badge>}
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-5 pt-6">
          <LocalizedField
            id="project-title"
            label={t("fields.title")}
            value={draft.title}
            required
            onChange={(title) => setDraft((d) => ({ ...d, title, ...(slugTouched ? {} : { slug: slugify(title.fr || title.en, "projet") }) }))}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-slug">{t("fields.slug")}</Label>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm text-muted-foreground">/projets/</span>
              <Input
                id="project-slug"
                value={draft.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                }}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-stage">{t("fields.stage")}</Label>
              <NativeSelect id="project-stage" value={draft.stage} onChange={(e) => set("stage", e.target.value as ProjectStage)}>
                {PROJECT_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {tStages(stage)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-year">{t("fields.year")}</Label>
              <Input id="project-year" value={draft.year} maxLength={PROJECT_LIMITS.year} placeholder="2026" onChange={(e) => set("year", e.target.value)} />
            </div>
          </div>
          <LocalizedField id="project-location" label={t("fields.location")} value={draft.location} onChange={(v) => set("location", v)} />
          <LocalizedField id="project-summary" label={t("fields.summary")} value={draft.summary} onChange={(v) => set("summary", v)} multiline required />
          <ImageField id="project-cover" label={t("fields.cover")} value={draft.coverImageId} onChange={(v) => set("coverImageId", v)} images={images} />
          <ImageListField
            label={t("fields.gallery")}
            value={draft.galleryIds}
            onChange={(v) => set("galleryIds", v)}
            images={images}
            max={PROJECT_LIMITS.gallery}
            reorderable
            hint={t("galleryHint", { max: PROJECT_LIMITS.gallery })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>{t("fields.body")}</CardTitle>
          <div role="tablist" aria-label={t("fields.body")} className="inline-flex rounded-lg border p-0.5">
            {(["fr", "en"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                role="tab"
                aria-selected={tab === lang}
                onClick={() => setTab(lang)}
                className={cn("min-h-10 rounded-md px-4 text-sm md:min-h-8", tab === lang ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              >
                {tCommon(lang === "fr" ? "french" : "english")}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {(["fr", "en"] as const).map((lang) => (
            <div key={lang} hidden={tab !== lang}>
              <RichTextEditor
                lang={lang}
                label={`${t("fields.body")} (${lang.toUpperCase()})`}
                value={draft.body[lang]}
                images={images}
                onChange={(doc) => setDraft((d) => ({ ...d, body: { ...d.body, [lang]: doc } }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 px-4 py-3 backdrop-blur md:left-64">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setPreview("fr")}>
            <Eye aria-hidden />
            {t("preview")} FR
          </Button>
          <Button variant="outline" onClick={() => setPreview("en")}>
            {t("preview")} EN
          </Button>
          <div className="ml-auto flex flex-wrap gap-2">
            {!published ? (
              <Button variant="ghost" disabled={busy !== null} onClick={() => run("delete")}>
                <Trash2 aria-hidden />
                {t("delete")}
              </Button>
            ) : (
              <Button variant="ghost" disabled={busy !== null} onClick={() => run("unpublish")}>
                <EyeOff aria-hidden />
                {t("unpublish")}
              </Button>
            )}
            <Button variant="outline" disabled={busy !== null || !dirty} onClick={() => run("save")}>
              {busy === "save" ? t("saving") : t("save")}
            </Button>
            {!published ? (
              <Button disabled={busy !== null} onClick={() => run("publish")}>
                <Upload aria-hidden />
                {busy === "publish" ? t("publishing") : t("publish")}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="h-dvh w-screen max-w-none gap-0 overflow-y-auto rounded-none bg-background p-0 sm:max-w-none">
          <DialogTitle className="sticky top-0 z-[60] flex h-12 items-center border-b bg-card px-4 text-sm">
            {t("previewTitle", { lang: (preview ?? "fr").toUpperCase() })}
          </DialogTitle>
          {preview ? (
            <article className="mx-auto flex w-full max-w-3xl flex-col items-start gap-5 px-4 py-10">
              <StageBadge stage={draft.stage} />
              <h1 className="text-4xl font-semibold tracking-tight text-balance">{draft.title[preview]}</h1>
              <p className="text-lg text-muted-foreground">{draft.summary[preview]}</p>
              {cover ? (
                // Preview only; the public page uses next/image.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover.url} alt="" className="w-full rounded-3xl" />
              ) : null}
              <RichText doc={draft.body[preview]} images={images} locale={preview} />
            </article>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** /admin/projects/[id]: edit one project. */
export function ProjectEditorRoute() {
  const t = useTranslations("ProjectsAdmin");
  const { id } = useParams<{ id: string }>();
  const canManage = useCan("projects.manage");
  const project = useQuery(api.projects.getForAdmin, canManage ? { projectId: id } : "skip");
  if (canManage === undefined) return null;
  if (!canManage) return <AccessDenied message={t("accessDenied")} />;
  if (project === undefined) return null;
  if (project === null) notFound();
  return <Editor key={project._id} project={project} />;
}
