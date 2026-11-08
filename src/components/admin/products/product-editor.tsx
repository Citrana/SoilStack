"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, ArchiveRestore, ArrowLeft, Eye, EyeOff, Trash2, Upload } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { notFound, useParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { pickLoc, type Loc } from "../../../../convex/lib/i18n";
import { centsToInput, formatUsd, parseUsdToCents } from "../../../../convex/lib/money";
import { PRODUCT_LIMITS } from "../../../../convex/lib/products";
import { richTextMediaIds, type LocRich } from "../../../../convex/lib/richText";
import { slugify } from "../../../../convex/lib/slugs";
import type { Locale } from "@/i18n/routing";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { LocalizedField } from "@/components/admin/localized-field";
import { AccessDenied } from "@/components/admin/page-header";
import { ImageListField } from "@/components/admin/pages/fields";
import { RichTextEditor } from "@/components/admin/blog/rich-text-editor";
import { RichText } from "@/components/site/rich-text";
import { useErrorMessage } from "@/lib/errors";
import { useMyPermissions } from "@/lib/use-can";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./products-admin-panel";

type Draft = {
  slug: string;
  name: Loc;
  shortDescription: Loc;
  description: LocRich;
  price: string;
  unit: Loc;
  categoryId: Id<"productCategories">;
  imageIds: Id<"media">[];
  featured: boolean;
};

const EMPTY: Loc = { fr: "", en: "" };
const fromProduct = (p: Doc<"products">): Draft => ({
  slug: p.slug,
  name: p.name,
  shortDescription: p.shortDescription,
  description: p.description,
  price: centsToInput(p.priceCents),
  unit: p.unit ?? EMPTY,
  categoryId: p.categoryId,
  imageIds: p.imageIds,
  featured: p.featured,
});

function stable(value: unknown) {
  return JSON.stringify(value, (_k, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v,
  );
}

/** The price input as cents: undefined = "Price on request", null = invalid. */
function parsePrice(input: string): number | undefined | null {
  if (!input.trim()) return undefined;
  try {
    return parseUsdToCents(input);
  } catch {
    return null;
  }
}

function Editor({ product, canEdit, canPublish }: { product: Doc<"products">; canEdit: boolean; canPublish: boolean }) {
  const t = useTranslations("ProductsAdmin");
  const tCommon = useTranslations("Common");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const update = useMutation(api.products.update);
  const publish = useMutation(api.products.publish);
  const unpublish = useMutation(api.products.unpublish);
  const archive = useMutation(api.products.archive);
  const restore = useMutation(api.products.restore);
  const remove = useMutation(api.products.remove);
  const categories = useQuery(api.productCategories.list) ?? [];

  const initial = useMemo(() => fromProduct(product), [product]);
  const [draft, setDraft] = useState<Draft>(initial);
  const [baseline, setBaseline] = useState<Draft>(initial);
  const [slugTouched, setSlugTouched] = useState(product.status !== "draft" || product.slug !== slugify(product.name.fr || product.name.en, "produit"));
  const [tab, setTab] = useState<"fr" | "en">("fr");
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<Locale | null>(null);
  const dirty = stable(draft) !== stable(baseline);
  const priceCents = parsePrice(draft.price);

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
    () => [...new Set([...draft.imageIds, ...richTextMediaIds(draft.description.fr), ...richTextMediaIds(draft.description.en)])],
    [draft.imageIds, draft.description],
  );
  const images = useQuery(api.media.publicImages, mediaIds.length ? { mediaIds } : "skip") ?? {};
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  async function save() {
    if (priceCents === null) throw new Error("price");
    await update({
      productId: product._id,
      slug: draft.slug,
      name: draft.name,
      shortDescription: draft.shortDescription,
      description: draft.description,
      priceCents,
      unit: draft.unit.fr.trim() || draft.unit.en.trim() ? draft.unit : undefined,
      categoryId: draft.categoryId,
      imageIds: draft.imageIds,
      featured: draft.featured,
    });
    setBaseline(draft);
  }

  function missing() {
    const out: string[] = [];
    for (const lang of ["fr", "en"] as const) {
      if (!draft.name[lang].trim()) out.push(`${t("fields.name")} (${lang.toUpperCase()})`);
      if (!draft.shortDescription[lang].trim()) out.push(`${t("fields.shortDescription")} (${lang.toUpperCase()})`);
    }
    if (draft.imageIds.length === 0) out.push(t("fields.photos"));
    return out;
  }

  async function run(kind: "save" | "publish" | "unpublish" | "archive" | "restore" | "delete") {
    if (priceCents === null && (kind === "save" || kind === "publish")) {
      toast.error(t("priceInvalid"));
      return;
    }
    if (kind === "delete" && !window.confirm(t("deleteConfirm"))) return;
    if (kind === "archive" && !window.confirm(t("archiveConfirm"))) return;
    setBusy(kind);
    try {
      if (kind === "save") {
        await save();
        toast.success(product.status === "published" ? t("savedLive") : t("saved"));
      } else if (kind === "publish") {
        const gaps = missing();
        if (gaps.length) {
          toast.error(t("missingBeforePublish", { fields: gaps.join(", ") }));
          return;
        }
        if (dirty) await save();
        await publish({ productId: product._id });
        toast.success(t("publishedToast"));
      } else if (kind === "unpublish") {
        await unpublish({ productId: product._id });
        toast.success(t("unpublishedToast"));
      } else if (kind === "archive") {
        await archive({ productId: product._id });
        toast.success(t("archivedToast"));
      } else if (kind === "restore") {
        await restore({ productId: product._id });
        toast.success(t("restoredToast"));
      } else {
        await remove({ productId: product._id });
        toast.success(t("deleted"));
        router.replace("/admin/products");
      }
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const status = product.status;
  const previewImage = draft.imageIds[0] ? images[draft.imageIds[0]] : undefined;
  return (
    <div className="flex flex-col gap-6 pb-28">
      <Link href="/admin/products" className="inline-flex min-h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{pickLoc(draft.name, locale) || t("untitled")}</h1>
        <div className="flex gap-2">
          {dirty ? <Badge variant="outline">{t("unsaved")}</Badge> : null}
          <StatusBadge status={status} />
        </div>
      </div>

      <fieldset disabled={!canEdit} className="flex flex-col gap-4">
        <Card>
          <CardContent className="flex flex-col gap-5 pt-6">
            <LocalizedField
              id="product-name"
              label={t("fields.name")}
              value={draft.name}
              required
              onChange={(name) => setDraft((d) => ({ ...d, name, ...(slugTouched ? {} : { slug: slugify(name.fr || name.en, "produit") }) }))}
            />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="product-slug">{t("fields.slug")}</Label>
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-sm text-muted-foreground">/produits/</span>
                <Input
                  id="product-slug"
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
                <Label htmlFor="product-category" required>
                  {t("category")}
                </Label>
                <NativeSelect id="product-category" value={draft.categoryId} onChange={(e) => set("categoryId", e.target.value as Id<"productCategories">)}>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {pickLoc(c.name, locale)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="product-price">{t("fields.price")}</Label>
                <Input
                  id="product-price"
                  inputMode="decimal"
                  placeholder={t("pricePlaceholder")}
                  value={draft.price}
                  aria-invalid={priceCents === null}
                  onChange={(e) => set("price", e.target.value)}
                />
                <p className={cn("text-xs", priceCents === null ? "text-destructive" : "text-muted-foreground")}>
                  {priceCents === null ? t("priceInvalid") : priceCents === undefined ? t("priceOnRequestHint") : formatUsd(priceCents, locale)}
                </p>
              </div>
            </div>
            <LocalizedField id="product-unit" label={t("fields.unit")} value={draft.unit} onChange={(v) => set("unit", v)} />
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input type="checkbox" className="size-5 accent-forest" checked={draft.featured} onChange={(e) => set("featured", e.target.checked)} />
              <span className="text-sm">{t("fields.featured")}</span>
            </label>
            <LocalizedField id="product-short" label={t("fields.shortDescription")} value={draft.shortDescription} onChange={(v) => set("shortDescription", v)} multiline required />
            <ImageListField
              label={t("fields.photos")}
              value={draft.imageIds}
              onChange={(v) => set("imageIds", v)}
              images={images}
              max={PRODUCT_LIMITS.images}
              reorderable
              hint={t("photosHint", { max: PRODUCT_LIMITS.images })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>{t("fields.description")}</CardTitle>
            <div role="tablist" aria-label={t("fields.description")} className="inline-flex rounded-lg border p-0.5">
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
                  label={`${t("fields.description")} (${lang.toUpperCase()})`}
                  value={draft.description[lang]}
                  images={images}
                  onChange={(doc) => setDraft((d) => ({ ...d, description: { ...d.description, [lang]: doc } }))}
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
            {canEdit && status === "draft" ? (
              <Button variant="ghost" disabled={busy !== null} onClick={() => run("delete")}>
                <Trash2 aria-hidden />
                {t("delete")}
              </Button>
            ) : null}
            {canEdit && status !== "archived" ? (
              <Button variant="ghost" disabled={busy !== null} onClick={() => run("archive")}>
                <Archive aria-hidden />
                {t("archive")}
              </Button>
            ) : null}
            {canEdit && status === "archived" ? (
              <Button variant="ghost" disabled={busy !== null} onClick={() => run("restore")}>
                <ArchiveRestore aria-hidden />
                {t("restore")}
              </Button>
            ) : null}
            {canPublish && status === "published" ? (
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
            {canPublish && status === "draft" ? (
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
            <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-10 lg:grid-cols-2">
              <div className="aspect-square overflow-hidden rounded-3xl bg-muted">
                {previewImage ? (
                  // Preview only; the public page uses next/image.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewImage.url} alt="" className="size-full object-cover" />
                ) : null}
              </div>
              <div className="flex flex-col gap-4">
                <h1 className="text-3xl font-semibold tracking-tight">{draft.name[preview]}</h1>
                <p className="text-2xl font-semibold text-forest">
                  {priceCents ? formatUsd(priceCents, preview) : t("priceOnRequest")}
                  {draft.unit[preview] ? <span className="text-base font-normal text-muted-foreground"> · {draft.unit[preview]}</span> : null}
                </p>
                <p className="text-lg text-muted-foreground">{draft.shortDescription[preview]}</p>
                <RichText doc={draft.description[preview]} images={images} locale={preview} />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** /admin/products/[id]: edit one product. */
export function ProductEditorRoute() {
  const t = useTranslations("ProductsAdmin");
  const { id } = useParams<{ id: string }>();
  const permissions = useMyPermissions();
  const allowed = permissions === undefined ? undefined : permissions.has("products.manage") || permissions.has("products.publish");
  const data = useQuery(api.products.getForAdmin, allowed ? { productId: id } : "skip");
  if (allowed === undefined) return null;
  if (!allowed) return <AccessDenied message={t("accessDenied")} />;
  if (data === undefined) return null;
  if (data === null) notFound();
  return <Editor key={data.product._id} product={data.product} canEdit={data.canEdit} canPublish={data.canPublish} />;
}
