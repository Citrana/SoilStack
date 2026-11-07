"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { useAction } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OneTimePassword } from "@/components/admin/one-time-password";
import type { UserRow } from "@/components/admin/users-admin-panel";
import { useErrorMessage } from "@/lib/errors";

/**
 * Resets a user who forgot their password: after a confirmation, a new
 * password is shown once. The user is signed out everywhere and must choose
 * their own password at the next sign-in.
 */
export function ResetPasswordButton({ user }: { user: UserRow }) {
  const t = useTranslations("Admin.users");
  const errorMessage = useErrorMessage();
  const resetPassword = useAction(api.users.resetPassword);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setPassword(null);
    setError(null);
  }

  async function confirm() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await resetPassword({ userId: user._id });
      setPassword(result.password);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <KeyRound aria-hidden />
        {t("resetPassword")}
      </Button>
      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
        <DialogContent className="sm:max-w-md">
          {password ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("resetDoneTitle", { name: user.name })}</DialogTitle>
                <DialogDescription>{t("resetDoneWarning", { name: user.name })}</DialogDescription>
              </DialogHeader>
              <OneTimePassword password={password} />
              <DialogFooter>
                <Button type="button" onClick={close}>
                  {t("closeButton")}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t("resetConfirmTitle", { name: user.name })}</DialogTitle>
                <DialogDescription>{t("resetConfirmText")}</DialogDescription>
              </DialogHeader>
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={close}>
                  {t("cancel")}
                </Button>
                <Button type="button" disabled={submitting} onClick={confirm}>
                  {submitting ? t("resetting") : t("resetConfirm")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
