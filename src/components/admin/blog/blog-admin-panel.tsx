"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useLocale, useTranslations } from "next-intl";
import { api } from "../../../../convex/_generated/api";
import { pickLoc, type Loc } from "../../../../convex/lib/i18n";
import type { Locale } from "@/i18n/routing";
import { Link, useRouter } from "@/i18n/navigation";
import { DataTable } from "@/components/data-table/data-table";
import type { DataTableColumn } from "@/components/data-table/features";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { AccessDenied, PageHeader } from "@/components/admin/page-header";
import { useErrorMessage } from "@/lib/errors";
import { useMyPermissions } from "@/lib/use-can";

type PostRow = FunctionReturnType<typeof api.posts.listForAdmin>[number];

function NewPostDialog() {
  const t = useTranslations("BlogAdmin");
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const create = useMutation(api.posts.create);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const id = await create({ title: { fr: title, en: "" } });
      router.push({ pathname: "/admin/blog/[id]", params: { id } });
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
            {t("newPost")}
          </Button>
        }
      />
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t("newPost")}</DialogTitle>
            <DialogDescription>{t("newPostDescription")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-post-title" required>
              {t("titleFr")}
            </Label>
            <Input id="new-post-title" lang="fr" value={title} onChange={(e) => setTitle(e.target.value)} required />
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

/** /admin/blog: posts (writers see their own), with status filter. */
export function BlogAdminPanel() {
  const t = useTranslations("BlogAdmin");
  const locale = useLocale() as Locale;
  const permissions = useMyPermissions();
  const allowed = permissions === undefined ? undefined : ["blog.write", "blog.edit_all", "blog.publish"].some((k) => permissions.has(k));
  const canCreate = permissions?.has("blog.write") || permissions?.has("blog.edit_all");
  const posts = useQuery(api.posts.listForAdmin, allowed ? {} : "skip");
  const [status, setStatus] = useState<"" | "draft" | "published">("");

  if (allowed === undefined) return null;
  if (!allowed) return <AccessDenied message={t("accessDenied")} />;

  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const title = (loc: Loc) => pickLoc(loc, locale) || t("untitled");
  const statusBadge = (post: PostRow) =>
    post.status === "published" ? <Badge>{t("statusPublished")}</Badge> : <Badge variant="outline">{t("statusDraft")}</Badge>;
  const editLink = (post: PostRow) => (
    <Link
      href={{ pathname: "/admin/blog/[id]", params: { id: post._id } }}
      className="inline-flex min-h-11 items-center font-medium text-leaf underline-offset-4 hover:underline md:min-h-0"
    >
      {post.canEdit ? t("edit") : t("view")}
    </Link>
  );

  const columns: DataTableColumn<PostRow>[] = [
    {
      id: "title",
      accessorFn: (post) => title(post.title),
      header: t("titleHeader"),
      enableSorting: true,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-medium">{title(row.original.title)}</p>
          <p className="font-mono text-xs text-muted-foreground">/{row.original.slug}</p>
        </div>
      ),
    },
    { id: "status", header: t("statusHeader"), cell: ({ row }) => statusBadge(row.original) },
    { accessorKey: "authorName", header: t("authorHeader"), meta: { hideBelow: "md" } },
    {
      id: "updated",
      accessorFn: (post) => post.updatedAt,
      header: t("updatedHeader"),
      enableSorting: true,
      cell: ({ row }) => dateFormat.format(row.original.updatedAt),
      meta: { hideBelow: "lg", className: "whitespace-nowrap text-muted-foreground" },
    },
    { id: "edit", header: () => <span className="sr-only">{t("edit")}</span>, cell: ({ row }) => editLink(row.original), meta: { className: "text-right" } },
  ];

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} actions={canCreate ? <NewPostDialog /> : null} />
      <DataTable
        columns={columns}
        data={posts?.filter((p) => !status || p.status === status)}
        getRowId={(p) => p._id}
        emptyMessage={t("empty")}
        search={{ placeholder: t("searchPlaceholder") }}
        initialSorting={[{ id: "updated", desc: true }]}
        toolbar={
          <div className="flex flex-col gap-1.5 sm:w-48">
            <Label htmlFor="post-status">{t("statusHeader")}</Label>
            <NativeSelect id="post-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="">{t("allStatuses")}</option>
              <option value="draft">{t("statusDraft")}</option>
              <option value="published">{t("statusPublished")}</option>
            </NativeSelect>
          </div>
        }
        renderCard={(post) => (
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{title(post.title)}</p>
              {statusBadge(post)}
            </div>
            <p className="text-xs text-muted-foreground">
              {post.authorName} · {dateFormat.format(post.updatedAt)}
            </p>
            {editLink(post)}
          </div>
        )}
      />
    </>
  );
}
