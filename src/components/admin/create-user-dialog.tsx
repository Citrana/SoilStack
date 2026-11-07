"use client";

import { useState, type FormEvent } from "react";
import { UserPlus } from "lucide-react";
import { useAction, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { RequiredFieldsHint } from "@/components/ui/required-fields-hint";
import { OneTimePassword } from "@/components/admin/one-time-password";
import { useRoleText } from "@/components/admin/use-role-text";
import { useErrorMessage } from "@/lib/errors";

/**
 * Creates an account with a generated password, shown once to share with
 * the new user (in person or by phone). They choose their own at sign-in.
 */
export function CreateUserDialog() {
  const t = useTranslations("Admin.users");
  const roleText = useRoleText();
  const errorMessage = useErrorMessage();
  const createUser = useAction(api.users.createUser);
  const roles = useQuery(api.rbac.listRoleOptions);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState<Id<"roles"> | "">("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState<string | null>(null);

  function reset() {
    setName("");
    setEmail("");
    setRoleId("");
    setError(null);
    setSubmitting(false);
    setPassword(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (roleId === "") return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await createUser({ name, email, roleId });
      setPassword(result.password);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button>
            <UserPlus aria-hidden />
            {t("createUser")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        {password ? (
          <>
            <DialogHeader>
              <DialogTitle>{t("passwordDialogTitle")}</DialogTitle>
              <DialogDescription>{t("passwordDialogWarning", { email })}</DialogDescription>
            </DialogHeader>
            <OneTimePassword password={password} />
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
                {t("closeButton")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>{t("createUser")}</DialogTitle>
              <DialogDescription>{t("createDescription")}</DialogDescription>
            </DialogHeader>
            <RequiredFieldsHint />
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-user-name" required>
                {t("nameLabel")}
              </Label>
              <Input
                id="new-user-name"
                value={name}
                autoComplete="off"
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-user-email" required>
                {t("emailLabel")}
              </Label>
              <Input
                id="new-user-email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-user-role" required>
                {t("roleLabel")}
              </Label>
              <NativeSelect
                id="new-user-role"
                value={roleId}
                onChange={(event) => setRoleId(event.target.value as Id<"roles">)}
                required
              >
                <option value="" disabled>
                  {t("selectRole")}
                </option>
                {roles?.map((role) => (
                  <option key={role._id} value={role._id}>
                    {roleText(role).name}
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
              <Button type="submit" disabled={submitting}>
                {submitting ? t("creating") : t("createButton")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
