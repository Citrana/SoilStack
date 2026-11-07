"use client";

import { useState, type FormEvent } from "react";
import { useAction } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "../../../convex/_generated/api";
import { MIN_PASSWORD_LENGTH } from "../../../convex/lib/password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useErrorMessage } from "@/lib/errors";

/** New password + confirmation, for the forced change and My account. */
export function ChangePasswordForm({ onDone }: { onDone?: () => void }) {
  const t = useTranslations("Auth.changePassword");
  const errorMessage = useErrorMessage();
  const changePassword = useAction(api.users.changePassword);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(t("tooShortError", { min: MIN_PASSWORD_LENGTH }));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("mismatchError"));
      return;
    }
    setSubmitting(true);
    try {
      await changePassword({ newPassword });
      setNewPassword("");
      setConfirmPassword("");
      onDone?.();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="newPassword" required>
          {t("newPasswordLabel")}
        </Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          {t("hint", { min: MIN_PASSWORD_LENGTH })}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword" required>
          {t("confirmPasswordLabel")}
        </Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={submitting}>
        {submitting ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
