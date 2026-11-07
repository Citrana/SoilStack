"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useLocale, useTranslations } from "next-intl";
import { api } from "../../../convex/_generated/api";
import { DataTable } from "@/components/data-table/data-table";
import type { DataTableColumn } from "@/components/data-table/features";
import { Badge } from "@/components/ui/badge";
import { AccessDenied, PageHeader } from "@/components/admin/page-header";
import { CreateUserDialog } from "@/components/admin/create-user-dialog";
import { ResetPasswordButton } from "@/components/admin/reset-password-button";
import { UserRoleSelect } from "@/components/admin/user-role-select";
import { UserStatusButton } from "@/components/admin/user-status-button";
import { useRoleText } from "@/components/admin/use-role-text";
import { useCan } from "@/lib/use-can";

export type UserRow = FunctionReturnType<typeof api.users.listUsers>[number];

export function UsersAdminPanel() {
  const t = useTranslations("Admin.users");
  const locale = useLocale();
  const roleText = useRoleText();
  const canManageUsers = useCan("users.manage");
  const canManageRoles = useCan("roles.manage");
  // Skip (rather than let the server reject) queries the user can't run.
  const users = useQuery(api.users.listUsers, canManageUsers ? {} : "skip");
  const roles = useQuery(api.rbac.listRoleOptions, canManageUsers ? {} : "skip");

  if (canManageUsers === undefined) return null;
  if (!canManageUsers) return <AccessDenied message={t("accessDenied")} />;

  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  const roleCell = (user: UserRow) =>
    canManageRoles && roles && !user.isSelf ? (
      <UserRoleSelect userId={user._id} roleId={user.roleId} roles={roles} />
    ) : (
      <Badge variant="outline">
        {user.roleName ? roleText({ name: user.roleName }).name : t("noRole")}
      </Badge>
    );

  const statusBadge = (user: UserRow) => (
    <Badge variant={user.status === "active" ? "secondary" : "destructive"}>
      {user.status === "active" ? t("statusActive") : t("statusBlocked")}
    </Badge>
  );

  const lastLogin = (user: UserRow) =>
    user.lastLoginAt ? dateFormat.format(user.lastLoginAt) : t("neverLoggedIn");

  const actions = (user: UserRow) =>
    user.isSelf ? (
      <span className="text-xs text-muted-foreground">{t("you")}</span>
    ) : (
      <span className="inline-flex flex-wrap justify-end gap-2">
        <ResetPasswordButton user={user} />
        <UserStatusButton user={user} />
      </span>
    );

  const columns: DataTableColumn<UserRow>[] = [
    {
      accessorKey: "name",
      header: t("nameHeader"),
      enableSorting: true,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      ),
    },
    { accessorKey: "email", header: t("emailHeader"), meta: { className: "hidden" } },
    {
      id: "role",
      header: t("roleHeader"),
      cell: ({ row }) => roleCell(row.original),
      meta: { className: "min-w-44" },
    },
    {
      accessorKey: "status",
      header: t("statusHeader"),
      enableSorting: true,
      cell: ({ row }) => statusBadge(row.original),
    },
    {
      id: "lastLogin",
      header: t("lastLoginHeader"),
      cell: ({ row }) => lastLogin(row.original),
      meta: { hideBelow: "lg", className: "whitespace-nowrap text-muted-foreground" },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">{t("actionsHeader")}</span>,
      cell: ({ row }) => actions(row.original),
      meta: { className: "text-right" },
    },
  ];

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} actions={<CreateUserDialog />} />
      <DataTable
        columns={columns}
        data={users}
        getRowId={(user) => user._id}
        search={{ placeholder: t("searchPlaceholder") }}
        initialSorting={[{ id: "name", desc: false }]}
        renderCard={(user) => (
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{user.name}</p>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              </div>
              {statusBadge(user)}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{t("roleHeader")}</span>
              {roleCell(user)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("lastLoginHeader")}: {lastLogin(user)}
            </p>
            {actions(user)}
          </div>
        )}
      />
    </>
  );
}
