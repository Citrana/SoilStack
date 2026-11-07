"use client";

import { useState } from "react";
import { Ban, CircleCheck } from "lucide-react";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import type { UserRow } from "@/components/admin/users-admin-panel";
import { useErrorMessage } from "@/lib/errors";

/** Blocks (signs out and refuses sign-in) or unblocks a user. */
export function UserStatusButton({ user }: { user: UserRow }) {
  const t = useTranslations("Admin.users");
  const errorMessage = useErrorMessage();
  const setUserStatus = useMutation(api.users.setUserStatus);
  const [submitting, setSubmitting] = useState(false);
  const nextStatus = user.status === "active" ? "blocked" : "active";

  async function handleClick() {
    setSubmitting(true);
    try {
      await setUserStatus({ userId: user._id, status: nextStatus });
      toast.success(
        nextStatus === "blocked"
          ? t("blockedToast", { name: user.name })
          : t("unblockedToast", { name: user.name }),
      );
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button
      variant={nextStatus === "blocked" ? "destructive" : "outline"}
      size="sm"
      disabled={submitting}
      onClick={handleClick}
    >
      {nextStatus === "blocked" ? <Ban aria-hidden /> : <CircleCheck aria-hidden />}
      {nextStatus === "blocked" ? t("block") : t("unblock")}
    </Button>
  );
}
