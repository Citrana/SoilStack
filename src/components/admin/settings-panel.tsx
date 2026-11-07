"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { SOCIAL_KEYS, type SiteSettings } from "../../../convex/lib/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocalizedField } from "@/components/admin/localized-field";
import { AccessDenied, PageHeader } from "@/components/admin/page-header";
import { useErrorMessage } from "@/lib/errors";
import { useCan } from "@/lib/use-can";

function TextInput({ id, label, hint, value, onChange, type = "text" }: { id: string; label: string; hint?: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SettingsForm({ initial }: { initial: SiteSettings }) {
  const t = useTranslations("Settings");
  const errorMessage = useErrorMessage();
  const update = useMutation(api.settings.update);
  const [settings, setSettings] = useState<SiteSettings>(initial);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => setSettings((s) => ({ ...s, [key]: value }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await update(settings);
      toast.success(t("saved"));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("contactTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <TextInput id="phone" type="tel" label={t("phone")} hint={t("phoneHint")} value={settings.phone} onChange={(v) => set("phone", v)} />
          <TextInput id="whatsapp" type="tel" label={t("whatsapp")} hint={t("phoneHint")} value={settings.whatsapp} onChange={(v) => set("whatsapp", v)} />
          <TextInput id="email" type="email" label={t("email")} value={settings.email} onChange={(v) => set("email", v)} />
          <TextInput id="mapUrl" type="url" label={t("mapUrl")} hint={t("mapUrlHint")} value={settings.mapUrl} onChange={(v) => set("mapUrl", v)} />
          <div className="sm:col-span-2">
            <LocalizedField id="address" label={t("address")} value={settings.address} onChange={(v) => set("address", v)} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("socialsTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("socialsHint")}</p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {SOCIAL_KEYS.map((key) => (
            <TextInput
              key={key}
              id={`social-${key}`}
              type="url"
              label={t(`socials.${key}`)}
              value={settings.socials[key] ?? ""}
              onChange={(v) => set("socials", { ...settings.socials, [key]: v })}
            />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("textsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <LocalizedField id="tagline" label={t("tagline")} value={settings.tagline} onChange={(v) => set("tagline", v)} multiline />
          <LocalizedField id="footerText" label={t("footerText")} value={settings.footerText} onChange={(v) => set("footerText", v)} />
          <p className="-mt-2 text-xs text-muted-foreground">{t("footerTextHint")}</p>
        </CardContent>
      </Card>
      <Button type="submit" className="self-start" disabled={saving}>
        {saving ? t("saving") : t("save")}
      </Button>
    </form>
  );
}

/** /admin/settings: contact details, social links and footer (live at once). */
export function SettingsPanel() {
  const t = useTranslations("Settings");
  const canManage = useCan("settings.manage");
  const settings = useQuery(api.settings.get, canManage ? {} : "skip");
  if (canManage === undefined) return null;
  if (!canManage) return <AccessDenied message={t("accessDenied")} />;
  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} />
      {settings ? <SettingsForm initial={settings} /> : null}
    </>
  );
}
