"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Loc } from "../../../convex/lib/i18n";
import { NativeSelect } from "@/components/ui/native-select";
import { useRoleText } from "@/components/admin/use-role-text";
import { useErrorMessage } from "@/lib/errors";

type RoleOption = { _id: Id<"roles">; key: string; name: Loc };

/** Changes a user's role on select (needs roles.manage, checked server-side). */
export function UserRoleSelect({
  userId,
  roleId,
  roles,
}: {
  userId: Id<"users">;
  roleId: Id<"roles"> | null;
  roles: RoleOption[];
}) {
  const t = useTranslations("Admin.users");
  const roleText = useRoleText();
  const errorMessage = useErrorMessage();
  const setUserRole = useMutation(api.users.setUserRole);
  const [submitting, setSubmitting] = useState(false);

  async function handleChange(nextRoleId: Id<"roles">) {
    setSubmitting(true);
    try {
      await setUserRole({ userId, roleId: nextRoleId });
      toast.success(t("roleChanged"));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <NativeSelect
      aria-label={t("roleLabel")}
      value={roleId ?? ""}
      disabled={submitting}
      onChange={(event) => handleChange(event.target.value as Id<"roles">)}
    >
      {roleId === null ? (
        <option value="" disabled>
          {t("noRole")}
        </option>
      ) : null}
      {roles.map((role) => (
        <option key={role._id} value={role._id}>
          {roleText(role).name}
        </option>
      ))}
    </NativeSelect>
  );
}
