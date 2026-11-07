"use client";

import { LogOut } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function LogoutButton({ className }: { className?: string }) {
  const t = useTranslations("Auth");
  const { signOut } = useAuthActions();
  return (
    <Button variant="ghost" className={className} onClick={() => void signOut()}>
      <LogOut aria-hidden />
      {t("logout")}
    </Button>
  );
}
