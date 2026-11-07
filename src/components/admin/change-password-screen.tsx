"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/admin/change-password-form";
import { LogoutButton } from "@/components/admin/logout-button";

/** Shown instead of the admin until a temporary password is replaced. */
export function ChangePasswordScreen() {
  const t = useTranslations("Auth.changePassword");
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{t("description")}</p>
          <ChangePasswordForm />
          <LogoutButton className="self-center" />
        </CardContent>
      </Card>
    </main>
  );
}
