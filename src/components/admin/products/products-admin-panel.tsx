"use client";

import { useState, type FormEvent } from "react";
import { FolderTree, Plus, Star } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useLocale, useTranslations } from "next-intl";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { pickLoc, type Loc } from "../../../../convex/lib/i18n";
import { formatUsd } from "../../../../convex/lib/money";
import type { Locale } from "@/i18n/routing";
import { Link, useRouter } from "@/i18n/navigation";
import { DataTable } from "@/components/data-table/data-table";
import type { DataTableColumn } from "@/components/data-table/features";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { AccessDenied, PageHeader } from "@/components/admin/page-header";
import { useErrorMessage } from "@/lib/errors";
import { useMyPermissions } from "@/lib/use-can";

type Row = FunctionReturnType<typeof api.products.listForAdmin>[number];
export type ProductStatus = Row["status"];

export function StatusBadge({ status }: { status: ProductStatus }) {
  const t = useTranslations("ProductsAdmin");
  if (status === "published") return <Badge>{t("statusPublished")}</Badge>;
  if (status === "archived") return <Badge variant="outline">{t("statusArchived")}</Badge>;
  return <Badge variant="secondary">{t("statusDraft")}</Badge>;
}

function NewProductDialog({ categories }: { categories: Array<{ _id: Id<"productCategories">; name: Loc }> }) {
  const t = useTranslations("ProductsAdmin");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const create = useMutation(api.products.create);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<Id<"productCategories"> | "">("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!categoryId) return;
    setBusy(true);
    setError(null);
    try {
      const id = await create({ name: { fr: name, en: "" }, categoryId });
      router.push({ pathname: "/admin/products/[id]", params: { id } });
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button disabled={categories.length === 0}>
            <Plus aria-hidden />
            {t("newProduct")}
          </Button>
        }
      />
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t("newProduct")}</DialogTitle>
            <DialogDescription>{t("newProductDescription")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-product-name" required>
              {t("nameFr")}
            </Label>
            <Input id="new-product-name" lang="fr" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-product-category" required>
              {t("category")}
            </Label>
            <NativeSelect id="new-product-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value as Id<"productCategories">)} required>
              <option value="" disabled>
                {t("chooseCategory")}
              </option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {pickLoc(c.name, locale)}
                </option>
              ))}
            </NativeSelect>
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={busy || !name.trim() || !categoryId}>
              {busy ? t("creating") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** /admin/products: the catalogue, with status and category filters. */
export function ProductsAdminPanel() {
  const t = useTranslations("ProductsAdmin");
  const locale = useLocale() as Locale;
  const permissions = useMyPermissions();
  const allowed = permissions === undefined ? undefined : permissions.has("products.manage") || permissions.has("products.publish");
  const canManage = permissions?.has("products.manage") === true;
  const products = useQuery(api.products.listForAdmin, allowed ? {} : "skip");
  const categories = useQuery(api.productCategories.list, allowed ? {} : "skip");
  const [status, setStatus] = useState<"" | ProductStatus>("");
  const [category, setCategory] = useState<"" | Id<"productCategories">>("");

  if (allowed === undefined) return null;
  if (!allowed) return <AccessDenied message={t("accessDenied")} />;

  const name = (loc: Loc) => pickLoc(loc, locale) || t("untitled");
  const price = (row: Row) => (row.priceCents === null ? t("priceOnRequest") : formatUsd(row.priceCents, locale));
  const thumb = (row: Row) => (
    <span className="relative block size-12 shrink-0 overflow-hidden rounded-lg border bg-muted">
      {row.image ? (
        // Admin thumbnail of an optimized library image.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={row.image.url} alt="" className="size-full object-cover" />
      ) : null}
    </span>
  );
  const editLink = (row: Row) => (
    <Link
      href={{ pathname: "/admin/products/[id]", params: { id: row._id } }}
      className="inline-flex min-h-11 items-center font-medium text-leaf underline-offset-4 hover:underline md:min-h-0"
    >
      {canManage ? t("edit") : t("view")}
    </Link>
  );

  const columns: DataTableColumn<Row>[] = [
    {
      id: "name",
      accessorFn: (row) => name(row.name),
      header: t("nameHeader"),
      enableSorting: true,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          {thumb(row.original)}
          <div className="min-w-0">
            <p className="flex items-center gap-1 font-medium">
              {name(row.original.name)}
              {row.original.featured ? <Star className="size-3.5 fill-current text-leaf" aria-label={t("featured")} /> : null}
            </p>
            <p className="text-xs text-muted-foreground">{row.original.categoryName ? pickLoc(row.original.categoryName, locale) : ""}</p>
          </div>
        </div>
      ),
    },
    { id: "price", accessorFn: (row) => row.priceCents ?? -1, header: t("priceHeader"), enableSorting: true, cell: ({ row }) => price(row.original), meta: { hideBelow: "md", className: "whitespace-nowrap" } },
    { id: "status", header: t("statusHeader"), cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: "edit", header: () => <span className="sr-only">{t("edit")}</span>, cell: ({ row }) => editLink(row.original), meta: { className: "text-right" } },
  ];

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/products/categories" className={buttonVariants({ variant: "outline" })}>
                <FolderTree aria-hidden />
                {t("categoriesLink")}
              </Link>
              <NewProductDialog categories={categories ?? []} />
            </div>
          ) : null
        }
      />
      <DataTable
        columns={columns}
        data={products?.filter((p) => (!status || p.status === status) && (!category || p.categoryId === category))}
        getRowId={(p) => p._id}
        emptyMessage={t("empty")}
        search={{ placeholder: t("searchPlaceholder") }}
        initialSorting={[{ id: "name", desc: false }]}
        toolbar={
          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:w-48">
              <Label htmlFor="product-status">{t("statusHeader")}</Label>
              <NativeSelect id="product-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value="">{t("allStatuses")}</option>
                <option value="draft">{t("statusDraft")}</option>
                <option value="published">{t("statusPublished")}</option>
                <option value="archived">{t("statusArchived")}</option>
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5 sm:w-56">
              <Label htmlFor="product-category">{t("category")}</Label>
              <NativeSelect id="product-category" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
                <option value="">{t("allCategories")}</option>
                {(categories ?? []).map((c) => (
                  <option key={c._id} value={c._id}>
                    {pickLoc(c.name, locale)}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
        }
        renderCard={(row) => (
          <div className="flex items-start gap-3">
            {thumb(row)}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{name(row.name)}</p>
                <StatusBadge status={row.status} />
              </div>
              <p className="text-sm text-muted-foreground">{price(row)}</p>
              {editLink(row)}
            </div>
          </div>
        )}
      />
    </>
  );
}
