"use client";

import { useState, type FormEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import { pickLoc, type Loc } from "../../../../convex/lib/i18n";
import { slugify } from "../../../../convex/lib/slugs";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedField } from "@/components/admin/localized-field";
import { AccessDenied, PageHeader } from "@/components/admin/page-header";
import { useErrorMessage } from "@/lib/errors";
import { useCan } from "@/lib/use-can";

type Category = FunctionReturnType<typeof api.productCategories.list>[number];
const EMPTY: Loc = { fr: "", en: "" };

function CategoryDialog({ category, open, onOpenChange }: { category: Category | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("Categories");
  const errorMessage = useErrorMessage();
  const create = useMutation(api.productCategories.create);
  const update = useMutation(api.productCategories.update);
  const [name, setName] = useState<Loc>(category?.name ?? EMPTY);
  const [description, setDescription] = useState<Loc>(category?.description ?? EMPTY);
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(category !== null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (category) await update({ categoryId: category._id, slug, name, description });
      else await create({ slug, name, description });
      toast.success(t("saved"));
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{category ? t("editTitle") : t("addTitle")}</DialogTitle>
          </DialogHeader>
          <LocalizedField
            id="category-name"
            label={t("name")}
            value={name}
            required
            onChange={(v) => {
              setName(v);
              if (!slugTouched) setSlug(slugify(v.fr || v.en, ""));
            }}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category-slug" required>
              {t("slug")}
            </Label>
            <Input
              id="category-slug"
              value={slug}
              required
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
              }}
            />
            <p className="text-xs text-muted-foreground">{t("slugHint")}</p>
          </div>
          <LocalizedField id="category-description" label={t("description")} value={description} onChange={setDescription} multiline />
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** /admin/products/categories: order, add, edit, delete (when unused). */
export function CategoriesPanel() {
  const t = useTranslations("Categories");
  const locale = useLocale() as Locale;
  const errorMessage = useErrorMessage();
  const canManage = useCan("products.manage");
  const categories = useQuery(api.productCategories.list, canManage ? {} : "skip");
  const move = useMutation(api.productCategories.move);
  const remove = useMutation(api.productCategories.remove);
  const [editing, setEditing] = useState<Category | null | undefined>(undefined);

  if (canManage === undefined) return null;
  if (!canManage) return <AccessDenied message={t("accessDenied")} />;

  async function run(action: () => Promise<unknown>, success?: string) {
    try {
      await action();
      if (success) toast.success(success);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <>
      <Link href="/admin/products" className="mb-2 inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Button onClick={() => setEditing(null)}>
            <Plus aria-hidden />
            {t("add")}
          </Button>
        }
      />
      <ol className="flex flex-col gap-2">
        {(categories ?? []).map((category, i, all) => (
          <li key={category._id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{pickLoc(category.name, locale)}</p>
              <p className="text-xs text-muted-foreground">
                /{category.slug} · {t("productCount", { count: category.productCount })}
              </p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon-sm" aria-label={t("moveUp")} disabled={i === 0} onClick={() => run(() => move({ categoryId: category._id, direction: "up" }))}>
                <ArrowUp aria-hidden />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label={t("moveDown")} disabled={i === all.length - 1} onClick={() => run(() => move({ categoryId: category._id, direction: "down" }))}>
                <ArrowDown aria-hidden />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label={t("edit")} onClick={() => setEditing(category)}>
                <Pencil aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("delete")}
                disabled={category.productCount > 0}
                title={category.productCount > 0 ? t("deleteBlocked") : undefined}
                onClick={() => {
                  if (window.confirm(t("deleteConfirm", { name: pickLoc(category.name, locale) }))) {
                    void run(() => remove({ categoryId: category._id }), t("deleted"));
                  }
                }}
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
          </li>
        ))}
      </ol>
      {categories?.length === 0 ? <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">{t("empty")}</p> : null}
      {editing !== undefined ? (
        <CategoryDialog key={editing?._id ?? "new"} category={editing} open onOpenChange={(open) => !open && setEditing(undefined)} />
      ) : null}
    </>
  );
}
