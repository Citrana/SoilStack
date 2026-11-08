"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Eye, EyeOff, Plus, Trash2, Undo2, Upload } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { notFound, useParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import { isPageKey, type PageKey } from "../../../../convex/lib/pages";
import {
  needsFeaturedProducts,
  needsLatestPosts,
  newSection,
  resolveSections,
  SECTION_TYPES,
  sectionMediaIds,
  type Section,
  type SectionType,
  type Seo,
} from "../../../../convex/lib/sections";
import { toPublicContact, EMPTY_SETTINGS } from "../../../../convex/lib/settings";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import { LocalizedField } from "@/components/admin/localized-field";
import { AccessDenied } from "@/components/admin/page-header";
import { Sections } from "@/components/site/sections/sections";
import { useErrorMessage } from "@/lib/errors";
import { useMyPermissions } from "@/lib/use-can";
import { cn } from "@/lib/utils";
import { SectionFields } from "./section-editors";
import type { ImageMap } from "./fields";

type Draft = { seo: Seo; sections: Section[] };

/** JSON with sorted keys: compares drafts whatever order Convex returns. */
function stable(value: unknown) {
  return JSON.stringify(value, (_k, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v,
  );
}

function SectionCard({
  section,
  index,
  count,
  images,
  onChange,
  onMove,
  onRemove,
}: {
  section: Section;
  index: number;
  count: number;
  images: ImageMap;
  onChange: (section: Section) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("Sections");
  const [open, setOpen] = useState(index < 2);
  return (
    <Card className={cn(section.hidden && "opacity-70")}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left">
          <span className="text-xs text-muted-foreground tabular-nums">{String(index + 1).padStart(2, "0")}</span>
          <CardTitle className="truncate">{t(`types.${section.type}`)}</CardTitle>
          {section.hidden ? <Badge variant="outline">{t("hiddenBadge")}</Badge> : null}
        </button>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t("moveUp")} disabled={index === 0} onClick={() => onMove(index - 1)}>
            <ArrowUp aria-hidden />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t("moveDown")} disabled={index === count - 1} onClick={() => onMove(index + 1)}>
            <ArrowDown aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={section.hidden ? t("show") : t("hide")}
            onClick={() => onChange({ ...section, hidden: !section.hidden })}
          >
            {section.hidden ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("deleteSection")}
            onClick={() => {
              if (window.confirm(t("deleteConfirm"))) onRemove();
            }}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      </CardHeader>
      {open ? (
        <CardContent className="flex flex-col gap-5">
          <p className="-mt-2 text-sm text-muted-foreground">{t(`descriptions.${section.type}`)}</p>
          <SectionFields section={section} onChange={onChange} images={images} />
        </CardContent>
      ) : null}
    </Card>
  );
}

function AddSection({ onAdd }: { onAdd: (type: SectionType) => void }) {
  const t = useTranslations("Sections");
  const [type, setType] = useState<SectionType>("textImage");
  return (
    <div className="flex flex-col gap-2 rounded-xl border-2 border-dashed p-4 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1.5">
        <label htmlFor="add-section-type" className="text-sm font-medium">
          {t("addSection")}
        </label>
        <NativeSelect id="add-section-type" value={type} onChange={(e) => setType(e.target.value as SectionType)}>
          {SECTION_TYPES.map((value) => (
            <option key={value} value={value}>
              {t(`types.${value}`)}
            </option>
          ))}
        </NativeSelect>
      </div>
      <Button type="button" variant="outline" onClick={() => onAdd(type)}>
        <Plus aria-hidden />
        {t("add")}
      </Button>
    </div>
  );
}

function Editor({ pageKey, initial, meta }: { pageKey: PageKey; initial: Draft; meta: { hasUnpublishedChanges: boolean; publishedAt: number | null; updatedByName: string | null } }) {
  const t = useTranslations("Pages");
  const tNames = useTranslations("Pages.names");
  const locale = useLocale() as Locale;
  const errorMessage = useErrorMessage();
  const permissions = useMyPermissions();
  const canEdit = permissions?.has("pages.edit") === true;
  const canPublish = permissions?.has("pages.publish") === true;
  const saveDraft = useMutation(api.pages.saveDraft);
  const publish = useMutation(api.pages.publish);
  const discardDraft = useMutation(api.pages.discardDraft);

  const [draft, setDraft] = useState<Draft>(initial);
  const [baseline, setBaseline] = useState<Draft>(initial);
  const [busy, setBusy] = useState<null | "save" | "publish" | "discard">(null);
  const [preview, setPreview] = useState<Locale | null>(null);
  const dirty = stable(draft) !== stable(baseline);

  // The server's draft changed (saved here, or by someone else) and we have
  // no local edits: take it.
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

  const mediaIds = useMemo(() => sectionMediaIds(draft.sections), [draft.sections]);
  const images = useQuery(api.media.publicImages, mediaIds.length ? { mediaIds } : "skip") ?? {};
  const settings = useQuery(api.settings.getPublic) ?? EMPTY_SETTINGS;
  const latest = useQuery(api.posts.listPublished, preview && needsLatestPosts(draft.sections) ? { page: 1 } : "skip");
  const catalogue = useQuery(api.products.catalogue, preview && needsFeaturedProducts(draft.sections) ? {} : "skip");

  const setSections = (sections: Section[]) => setDraft((d) => ({ ...d, sections }));
  const updateSection = (index: number, section: Section) => setSections(draft.sections.map((s, i) => (i === index ? section : s)));
  const moveSection = (from: number, to: number) => {
    const next = [...draft.sections];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setSections(next);
  };

  async function run(kind: "save" | "publish" | "discard") {
    setBusy(kind);
    try {
      if (kind === "discard") {
        if (!window.confirm(t("discardConfirm"))) return;
        await discardDraft({ key: pageKey });
        toast.success(t("discarded"));
        return;
      }
      if (dirty || kind === "save") {
        await saveDraft({ key: pageKey, ...draft });
        setBaseline(draft);
      }
      if (kind === "publish") {
        await publish({ key: pageKey });
        toast.success(t("publishedToast"));
      } else {
        toast.success(t("saved"));
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const previewSections = preview
    ? resolveSections(draft.sections, (id) => (id ? (images[id] ?? null) : null), {
        contact: toPublicContact(settings),
        latestPosts: latest?.posts ?? [],
        featuredProducts: catalogue?.products ?? [],
      })
    : [];
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="flex flex-col gap-6 pb-28">
      <Link href="/admin/pages" className="inline-flex min-h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{tNames(pageKey)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {meta.publishedAt ? t("lastPublished", { date: dateFormat.format(meta.publishedAt) }) : t("neverPublished")}
            {meta.updatedByName ? ` · ${t("updatedBy", { name: meta.updatedByName })}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {dirty ? <Badge variant="outline">{t("unsaved")}</Badge> : meta.hasUnpublishedChanges ? <Badge variant="secondary">{t("unpublishedChanges")}</Badge> : <Badge>{t("upToDate")}</Badge>}
        </div>
      </div>

      <fieldset disabled={!canEdit} className="flex flex-col gap-4">
        {draft.sections.map((section, index) => (
          <SectionCard
            key={section.id}
            section={section}
            index={index}
            count={draft.sections.length}
            images={images}
            onChange={(s) => updateSection(index, s)}
            onMove={(to) => moveSection(index, to)}
            onRemove={() => setSections(draft.sections.filter((_, i) => i !== index))}
          />
        ))}
        <AddSection onAdd={(type) => setSections([...draft.sections, newSection(type)])} />

        <Card>
          <CardHeader>
            <CardTitle>{t("seoTitle")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("seoHint")}</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <LocalizedField id="seo-title" label={t("seoTitleField")} value={draft.seo.title} onChange={(title) => setDraft((d) => ({ ...d, seo: { ...d.seo, title } }))} />
            <LocalizedField
              id="seo-description"
              label={t("seoDescriptionField")}
              value={draft.seo.description}
              onChange={(description) => setDraft((d) => ({ ...d, seo: { ...d.seo, description } }))}
              multiline
            />
          </CardContent>
        </Card>
      </fieldset>

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
            {canEdit && meta.hasUnpublishedChanges && !dirty ? (
              <Button variant="ghost" disabled={busy !== null} onClick={() => run("discard")}>
                <Undo2 aria-hidden />
                {t("discard")}
              </Button>
            ) : null}
            {canEdit ? (
              <Button variant="outline" disabled={busy !== null || !dirty} onClick={() => run("save")}>
                {busy === "save" ? t("saving") : t("save")}
              </Button>
            ) : null}
            {canPublish ? (
              <Button disabled={busy !== null || (!dirty && !meta.hasUnpublishedChanges)} onClick={() => run("publish")}>
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
            {t("previewTitle", { page: tNames(pageKey), lang: (preview ?? "fr").toUpperCase() })}
          </DialogTitle>
          {preview ? (
            <div className="flex flex-col pb-10">
              <Sections sections={previewSections} locale={preview} />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** /admin/pages/[key]: edit a page's sections and SEO, then publish. */
export function PageEditorRoute() {
  const t = useTranslations("Pages");
  const { key } = useParams<{ key: string }>();
  const permissions = useMyPermissions();
  const allowed = permissions === undefined ? undefined : permissions.has("pages.edit") || permissions.has("pages.publish");
  const data = useQuery(api.pages.getForAdmin, allowed ? { key } : "skip");

  if (!isPageKey(key)) notFound();
  if (allowed === undefined) return null;
  if (!allowed) return <AccessDenied message={t("accessDenied")} />;
  if (data === undefined) return null;
  if (data === null) notFound();
  return (
    <Editor
      key={key}
      pageKey={key}
      initial={data.draft}
      meta={{ hasUnpublishedChanges: data.hasUnpublishedChanges, publishedAt: data.publishedAt, updatedByName: data.updatedByName }}
    />
  );
}
