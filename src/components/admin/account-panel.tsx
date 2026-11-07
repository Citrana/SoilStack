"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/admin/change-password-form";
import { PageHeader } from "@/components/admin/page-header";
import { useRoleText } from "@/components/admin/use-role-text";

/** My account: who I am, and change my password. */
export function AccountPanel() {
  const t = useTranslations("Admin.account");
  const roleText = useRoleText();
  const user = useQuery(api.users.getCurrentUser);
  if (!user) return null;

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("profileTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">{t("name")}</dt>
              <dd>{user.name}</dd>
              <dt className="text-muted-foreground">{t("email")}</dt>
              <dd className="break-all">{user.email}</dd>
              <dt className="text-muted-foreground">{t("role")}</dt>
              <dd>{user.roleName ? roleText({ name: user.roleName }).name : t("noRole")}</dd>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("passwordTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm onDone={() => toast.success(t("passwordChanged"))} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
