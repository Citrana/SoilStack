"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeft, Lock, Trash2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { notFound, useParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import type { Loc } from "../../../convex/lib/i18n";
import type { PermissionKey, PermissionModule } from "../../../convex/lib/permissions";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LocalizedField } from "@/components/admin/localized-field";
import { AccessDenied, PageHeader } from "@/components/admin/page-header";
import { useRoleText } from "@/components/admin/use-role-text";
import { useErrorMessage } from "@/lib/errors";
import { useCan } from "@/lib/use-can";

function RoleDetailsForm({ role }: { role: Doc<"roles"> }) {
  const t = useTranslations("Admin.roles");
  const errorMessage = useErrorMessage();
  const updateRole = useMutation(api.rbac.updateRole);
  const [name, setName] = useState<Loc>(role.name);
  const [description, setDescription] = useState<Loc>(role.description);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await updateRole({ roleId: role._id, name, description });
      toast.success(t("saved"));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <LocalizedField id="role-name" label={t("nameLabel")} value={name} onChange={setName} required />
      <LocalizedField
        id="role-description"
        label={t("descriptionLabel")}
        value={description}
        onChange={setDescription}
        multiline
      />
      <Button type="submit" className="self-start" disabled={submitting}>
        {submitting ? t("saving") : t("save")}
      </Button>
    </form>
  );
}

function DeleteRoleButton({ role, userCount }: { role: Doc<"roles">; userCount: number }) {
  const t = useTranslations("Admin.roles");
  const roleText = useRoleText();
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const deleteRole = useMutation(api.rbac.deleteRole);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setSubmitting(true);
    setError(null);
    try {
      await deleteRole({ roleId: role._id });
      toast.success(t("deleted"));
      router.replace("/admin/roles");
    } catch (e) {
      setError(errorMessage(e));
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden />
        {t("delete")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle", { name: roleText(role).name })}</DialogTitle>
            <DialogDescription>
              {userCount > 0 ? t("deleteInUse", { count: userCount }) : t("deleteConfirmText")}
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" disabled={submitting || userCount > 0} onClick={confirm}>
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * A role's names and permissions. Each checkbox is saved immediately and
 * takes effect on the role's users' next call. The Super Admin role is
 * read-only.
 */
export function RoleEditor({ roleId }: { roleId: string }) {
  const t = useTranslations("Admin.roles");
  const tPermission = useTranslations("Permissions");
  const tModule = useTranslations("PermissionModules");
  const roleText = useRoleText();
  const errorMessage = useErrorMessage();
  const canManageRoles = useCan("roles.manage");
  const data = useQuery(api.rbac.getRole, canManageRoles ? { roleId } : "skip");
  const setRolePermission = useMutation(api.rbac.setRolePermission);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());

  if (canManageRoles === undefined) return null;
  if (!canManageRoles) return <AccessDenied message={t("accessDenied")} />;
  if (data === undefined) return null;
  // A wrong link (bad id, deleted role): the 404 page.
  if (data === null) notFound();

  const { role, locked, modules, userCount } = data;
  const text = roleText(role);

  async function toggle(permissionKey: string, granted: boolean) {
    setPending((prev) => new Set(prev).add(permissionKey));
    try {
      await setRolePermission({ roleId: role._id, permissionKey, granted });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(permissionKey);
        return next;
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/roles"
        className="inline-flex min-h-11 items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <PageHeader
        title={text.name}
        description={t("userCount", { count: userCount })}
        actions={locked ? null : <DeleteRoleButton role={role} userCount={userCount} />}
      />

      {locked ? (
        <p className="flex items-start gap-2 rounded-lg border bg-lime-tint/40 p-3 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("lockedNote")}
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t("detailsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <RoleDetailsForm key={role._id} role={role} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("permissionsTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("permissionsHint")}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {modules.map(({ module, permissions }) => (
            <fieldset key={module} className="flex flex-col gap-1">
              <legend className="mb-2 text-sm font-semibold">
                {tModule(module as PermissionModule)}
              </legend>
              {permissions.map((permission) => {
                const inputId = `perm-${permission.key}`;
                return (
                  <label
                    key={permission.key}
                    htmlFor={inputId}
                    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-muted has-disabled:cursor-default"
                  >
                    <input
                      id={inputId}
                      type="checkbox"
                      className="size-5 accent-forest"
                      checked={permission.granted}
                      disabled={locked || pending.has(permission.key)}
                      onChange={(event) => toggle(permission.key, event.target.checked)}
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="text-sm">{tPermission(permission.key as PermissionKey)}</span>
                      <span className="font-mono text-xs text-muted-foreground">{permission.key}</span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/** The role page: reads the id from the URL. */
export function RoleEditorRoute() {
  const { roleId } = useParams<{ roleId: string }>();
  return <RoleEditor roleId={roleId} />;
}
