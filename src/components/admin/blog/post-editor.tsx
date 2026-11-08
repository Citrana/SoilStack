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
import { slugify } from "../../../../convex/lib/posts";
import { isEmptyDoc, richTextMediaIds, type LocRich } from "../../../../convex/lib/richText";
import type { Locale } from "@/i18n/routing";
import { Link, useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedField } from "@/components/admin/localized-field";
import { AccessDenied } from "@/components/admin/page-header";
import { ImageField } from "@/components/admin/pages/fields";
import { RichText } from "@/components/site/rich-text";
import { useErrorMessage } from "@/lib/errors";
import { useMyPermissions } from "@/lib/use-can";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "./rich-text-editor";

type Draft = {
  slug: string;
  title: Loc;
  excerpt: Loc;
  body: LocRich;
  coverImageId: Id<"media"> | undefined;
  tags: string;
};

const fromPost = (post: Doc<"posts">): Draft => ({
  slug: post.slug,
  title: post.title,
  excerpt: post.excerpt,
  body: post.body,
  coverImageId: post.coverImageId,
  tags: post.tags.join(", "),
});

function stable(value: unknown) {
  return JSON.stringify(value, (_k, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v,
  );
}

/** Fields still missing before the post can be published (both languages). */
function missingFields(draft: Draft) {
  const missing: Array<{ field: "title" | "excerpt" | "body"; lang: "fr" | "en" }> = [];
  for (const lang of ["fr", "en"] as const) {
    if (!draft.title[lang].trim()) missing.push({ field: "title", lang });
    if (!draft.excerpt[lang].trim()) missing.push({ field: "excerpt", lang });
    if (isEmptyDoc(draft.body[lang])) missing.push({ field: "body", lang });
  }
  return missing;
}

function Editor({ data }: { data: NonNullable<ReturnType<typeof useQuery<typeof api.posts.getForAdmin>>> }) {
  const t = useTranslations("BlogAdmin");
  const tCommon = useTranslations("Common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const update = useMutation(api.posts.update);
  const publish = useMutation(api.posts.publish);
  const unpublish = useMutation(api.posts.unpublish);
  const remove = useMutation(api.posts.remove);
  const { post, canEdit, canPublish, canDelete, authorName } = data;

  const initial = useMemo(() => fromPost(post), [post]);
  const [draft, setDraft] = useState<Draft>(initial);
  const [baseline, setBaseline] = useState<Draft>(initial);
  // Follow the title until the address is edited by hand (never published only).
  const [slugTouched, setSlugTouched] = useState(post.status === "published" || post.publishedAt !== undefined || post.slug !== slugify(post.title.fr || post.title.en, "article"));
  const [tab, setTab] = useState<"fr" | "en">("fr");
  const [busy, setBusy] = useState<null | "save" | "publish" | "unpublish" | "delete">(null);
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
    () => [...new Set([...richTextMediaIds(draft.body.fr), ...richTextMediaIds(draft.body.en), ...(draft.coverImageId ? [draft.coverImageId] : [])])],
    [draft.body, draft.coverImageId],
  );
  const images = useQuery(api.media.publicImages, mediaIds.length ? { mediaIds } : "skip") ?? {};

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const setTitle = (title: Loc) =>
    setDraft((d) => ({ ...d, title, ...(slugTouched ? {} : { slug: slugify(title.fr || title.en, "article") }) }));

  const toArgs = () => ({
    postId: post._id,
    slug: draft.slug,
    title: draft.title,
    excerpt: draft.excerpt,
    body: draft.body,
    coverImageId: draft.coverImageId,
    tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
  });

  async function save() {
    await update(toArgs());
    setBaseline(draft);
  }

  async function run(kind: NonNullable<typeof busy>) {
    if (kind === "delete" && !window.confirm(t("deleteConfirm"))) return;
    setBusy(kind);
    try {
      if (kind === "save") {
        await save();
        toast.success(post.status === "published" ? t("savedLive") : t("saved"));
      } else if (kind === "publish") {
        const missing = missingFields(draft);
        if (missing.length) {
          toast.error(t("missingBeforePublish", { fields: missing.map((m) => `${t(`fields.${m.field}`)} (${m.lang.toUpperCase()})`).join(", ") }));
          return;
        }
        if (dirty) await save();
        await publish({ postId: post._id });
        toast.success(t("publishedToast"));
      } else if (kind === "unpublish") {
        await unpublish({ postId: post._id });
        toast.success(t("unpublishedToast"));
      } else {
        await remove({ postId: post._id });
        toast.success(t("deleted"));
        router.replace("/admin/blog");
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const published = post.status === "published";
  return (
    <div className="flex flex-col gap-6 pb-28">
      <Link href="/admin/blog" className="inline-flex min-h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{pickLoc(draft.title, locale) || t("untitled")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("byAuthor", { name: authorName })}</p>
        </div>
        <div className="flex gap-2">
          {dirty ? <Badge variant="outline">{t("unsaved")}</Badge> : null}
          {published ? <Badge>{t("statusPublished")}</Badge> : <Badge variant="secondary">{t("statusDraft")}</Badge>}
        </div>
      </div>
      {!canEdit ? <p className="rounded-lg border bg-lime-tint/40 p-3 text-sm">{t("readOnly")}</p> : null}

      <fieldset disabled={!canEdit} className="flex flex-col gap-4">
        <Card>
          <CardContent className="flex flex-col gap-5 pt-6">
            <LocalizedField id="post-title" label={t("fields.title")} value={draft.title} onChange={setTitle} required />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="post-slug">{t("fields.slug")}</Label>
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-sm text-muted-foreground">/blog/</span>
                <Input
                  id="post-slug"
                  value={draft.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{published ? t("slugPublishedHint") : t("slugHint")}</p>
            </div>
            <LocalizedField id="post-excerpt" label={t("fields.excerpt")} value={draft.excerpt} onChange={(v) => set("excerpt", v)} multiline required />
            <ImageField id="post-cover" label={t("fields.cover")} value={draft.coverImageId} onChange={(v) => set("coverImageId", v)} images={images} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="post-tags">{t("fields.tags")}</Label>
              <Input id="post-tags" value={draft.tags} onChange={(e) => set("tags", e.target.value)} placeholder={t("tagsPlaceholder")} />
              <p className="text-xs text-muted-foreground">{t("tagsHint")}</p>
            </div>
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
            {/* Both editors stay mounted so undo history survives tab switches. */}
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
            {canDelete ? (
              <Button variant="ghost" disabled={busy !== null} onClick={() => run("delete")}>
                <Trash2 aria-hidden />
                {t("delete")}
              </Button>
            ) : null}
            {canPublish && published ? (
              <Button variant="ghost" disabled={busy !== null} onClick={() => run("unpublish")}>
                <EyeOff aria-hidden />
                {t("unpublish")}
              </Button>
            ) : null}
            {canEdit ? (
              <Button variant="outline" disabled={busy !== null || !dirty} onClick={() => run("save")}>
                {busy === "save" ? t("saving") : t("save")}
              </Button>
            ) : null}
            {canPublish && !published ? (
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
            <article className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-10">
              <h1 className="text-4xl font-semibold tracking-tight text-balance">{draft.title[preview]}</h1>
              <p className="text-lg text-muted-foreground">{draft.excerpt[preview]}</p>
              {draft.coverImageId && images[draft.coverImageId] ? (
                // Preview only; the public page uses next/image.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={images[draft.coverImageId].url} alt="" className="w-full rounded-3xl" />
              ) : null}
              <RichText doc={draft.body[preview]} images={images} locale={preview} />
            </article>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** /admin/blog/[id]: edit one post. */
export function PostEditorRoute() {
  const t = useTranslations("BlogAdmin");
  const { id } = useParams<{ id: string }>();
  const permissions = useMyPermissions();
  const allowed = permissions === undefined ? undefined : ["blog.write", "blog.edit_all", "blog.publish"].some((k) => permissions.has(k));
  const data = useQuery(api.posts.getForAdmin, allowed ? { postId: id } : "skip");
  if (allowed === undefined) return null;
  if (!allowed) return <AccessDenied message={t("accessDenied")} />;
  if (data === undefined) return null;
  if (data === null) notFound();
  return <Editor key={data.post._id} data={data} />;
}
