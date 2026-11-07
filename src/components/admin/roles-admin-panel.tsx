"use client";

import { useState, type FormEvent } from "react";
import { Lock, Plus } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useTranslations } from "next-intl";
import { api } from "../../../convex/_generated/api";
import type { Loc } from "../../../convex/lib/i18n";
import { Link, useRouter } from "@/i18n/navigation";
import { DataTable } from "@/components/data-table/data-table";
import type { DataTableColumn } from "@/components/data-table/features";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RequiredFieldsHint } from "@/components/ui/required-fields-hint";
import { LocalizedField } from "@/components/admin/localized-field";
import { AccessDenied, PageHeader } from "@/components/admin/page-header";
import { useRoleText } from "@/components/admin/use-role-text";
import { useErrorMessage } from "@/lib/errors";
import { useCan } from "@/lib/use-can";

type RoleRow = FunctionReturnType<typeof api.rbac.listRoles>[number];

const EMPTY: Loc = { fr: "", en: "" };

function CreateRoleDialog() {
  const t = useTranslations("Admin.roles");
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const createRole = useMutation(api.rbac.createRole);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState<Loc>(EMPTY);
  const [description, setDescription] = useState<Loc>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const roleId = await createRole({ name, description });
      router.push({ pathname: "/admin/roles/[roleId]", params: { roleId } });
    } catch (e) {
      setError(errorMessage(e));
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setName(EMPTY);
          setDescription(EMPTY);
          setError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button>
            <Plus aria-hidden />
            {t("createRole")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{t("createRole")}</DialogTitle>
            <DialogDescription>{t("createDescription")}</DialogDescription>
          </DialogHeader>
          <RequiredFieldsHint />
          <LocalizedField id="role-name" label={t("nameLabel")} value={name} onChange={setName} required />
          <LocalizedField
            id="role-description"
            label={t("descriptionLabel")}
            value={description}
            onChange={setDescription}
            multiline
          />
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? t("creating") : t("createButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RolesAdminPanel() {
  const t = useTranslations("Admin.roles");
  const roleText = useRoleText();
  const canManageRoles = useCan("roles.manage");
  const roles = useQuery(api.rbac.listRoles, canManageRoles ? {} : "skip");

  if (canManageRoles === undefined) return null;
  if (!canManageRoles) return <AccessDenied message={t("accessDenied")} />;

  const nameCell = (role: RoleRow) => {
    const text = roleText(role);
    return (
      <div className="min-w-0">
        <div className="flex items-center gap-2 font-medium">
          {text.name}
          {role.locked ? (
            <Badge variant="secondary">
              <Lock aria-hidden />
              {t("lockedBadge")}
            </Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">{text.description}</p>
      </div>
    );
  };

  const editLink = (role: RoleRow) => (
    <Link
      href={{ pathname: "/admin/roles/[roleId]", params: { roleId: role._id } }}
      className="inline-flex min-h-11 items-center font-medium text-leaf underline-offset-4 hover:underline md:min-h-0"
    >
      {role.locked ? t("view") : t("edit")}
    </Link>
  );

  const columns: DataTableColumn<RoleRow>[] = [
    {
      id: "name",
      // Sort and search by the name the user actually sees.
      accessorFn: (role) => roleText(role).name,
      header: t("nameHeader"),
      enableSorting: true,
      cell: ({ row }) => nameCell(row.original),
    },
    {
      accessorKey: "permissionCount",
      header: t("permissionsHeader"),
      enableSorting: true,
      cell: ({ row }) => t("permissionCount", { count: row.original.permissionCount }),
      meta: { className: "whitespace-nowrap text-muted-foreground", hideBelow: "sm" },
    },
    {
      accessorKey: "userCount",
      header: t("usersHeader"),
      enableSorting: true,
      cell: ({ row }) => t("userCount", { count: row.original.userCount }),
      meta: { className: "whitespace-nowrap text-muted-foreground", hideBelow: "sm" },
    },
    {
      id: "edit",
      header: () => <span className="sr-only">{t("edit")}</span>,
      cell: ({ row }) => editLink(row.original),
      meta: { className: "text-right whitespace-nowrap" },
    },
  ];

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} actions={<CreateRoleDialog />} />
      <DataTable
        columns={columns}
        data={roles}
        getRowId={(role) => role._id}
        initialSorting={[{ id: "name", desc: false }]}
        renderCard={(role) => (
          <div className="flex flex-col gap-2">
            {nameCell(role)}
            <p className="text-xs text-muted-foreground">
              {t("permissionCount", { count: role.permissionCount })} ·{" "}
              {t("userCount", { count: role.userCount })}
            </p>
            {editLink(role)}
          </div>
        )}
      />
    </>
  );
}
