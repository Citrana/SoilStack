"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Loc } from "../../../../convex/lib/i18n";
import type { PublicImage } from "../../../../convex/lib/media";
import { PAGE_KEYS } from "../../../../convex/lib/pages";
import { SECTION_ICONS, type SectionButton, type SectionIcon } from "../../../../convex/lib/sections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { LocalizedField } from "@/components/admin/localized-field";
import { MediaPicker } from "@/components/admin/media-picker";
import { SECTION_ICON_COMPONENTS } from "@/components/site/sections/icons";

export const EMPTY_LOC: Loc = { fr: "", en: "" };
export type ImageMap = Record<string, PublicImage>;

function Thumb({ image }: { image: PublicImage | undefined }) {
  if (!image) return <div className="size-full bg-muted" />;
  // Admin-only thumbnail of an image already optimized for the site.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={image.url} alt="" className="size-full object-cover" />;
}

/** One optional image: thumbnail + choose / change / remove. */
export function ImageField({
  id,
  label,
  value,
  onChange,
  images,
}: {
  id: string;
  label: string;
  value: Id<"media"> | undefined;
  onChange: (value: Id<"media"> | undefined) => void;
  images: ImageMap;
}) {
  const t = useTranslations("Sections");
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border">
          {value ? <Thumb image={images[value]} /> : <div className="flex size-full items-center justify-center text-muted-foreground"><ImagePlus className="size-5" aria-hidden /></div>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button id={id} type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
            {value ? t("changeImage") : t("chooseImage")}
          </Button>
          {value ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>
              <X aria-hidden />
              {t("removeImage")}
            </Button>
          ) : null}
        </div>
      </div>
      <MediaPicker open={open} onOpenChange={setOpen} initialId={value ?? null} onPick={(mediaId) => onChange(mediaId)} />
    </div>
  );
}

/** Up to `max` images, in order. */
export function ImageListField({
  label,
  value,
  onChange,
  images,
  max,
}: {
  label: string;
  value: Id<"media">[];
  onChange: (value: Id<"media">[]) => void;
  images: ImageMap;
  max: number;
}) {
  const t = useTranslations("Sections");
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-wrap gap-2">
        {value.map((mediaId, i) => (
          <div key={`${mediaId}-${i}`} className="relative size-20 overflow-hidden rounded-lg border">
            <Thumb image={images[mediaId]} />
            <button
              type="button"
              aria-label={t("removeImage")}
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-card/90 shadow"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
        {value.length < max ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex size-20 items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground hover:border-leaf"
            aria-label={t("chooseImage")}
          >
            <ImagePlus className="size-5" aria-hidden />
          </button>
        ) : null}
      </div>
      <MediaPicker open={open} onOpenChange={setOpen} onPick={(mediaId) => onChange([...value, mediaId])} />
    </div>
  );
}

/** A button: label in FR/EN, and a company page or an external link. */
export function ButtonField({
  id,
  label,
  value,
  onChange,
  optional = false,
}: {
  id: string;
  label: string;
  value: SectionButton | undefined;
  onChange: (value: SectionButton | undefined) => void;
  optional?: boolean;
}) {
  const t = useTranslations("Sections");
  const tPages = useTranslations("Pages.names");
  if (!value) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{label}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => onChange({ label: EMPTY_LOC, link: { kind: "page", page: "contact" } })}
        >
          <Plus aria-hidden />
          {t("addButton")}
        </Button>
      </div>
    );
  }
  const { link } = value;
  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      <LocalizedField
        id={`${id}-label`}
        label={t("buttonLabel")}
        value={value.label}
        onChange={(label) => onChange({ ...value, label })}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-kind`} className="text-xs text-muted-foreground">
            {t("linkKind")}
          </Label>
          <NativeSelect
            id={`${id}-kind`}
            value={link.kind}
            onChange={(e) =>
              onChange({
                ...value,
                link: e.target.value === "page" ? { kind: "page", page: "contact" } : { kind: "url", url: "https://" },
              })
            }
          >
            <option value="page">{t("linkPage")}</option>
            <option value="url">{t("linkUrl")}</option>
          </NativeSelect>
        </div>
        {link.kind === "page" ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-page`} className="text-xs text-muted-foreground">
              {t("page")}
            </Label>
            <NativeSelect
              id={`${id}-page`}
              value={link.page}
              onChange={(e) => onChange({ ...value, link: { kind: "page", page: e.target.value as (typeof PAGE_KEYS)[number] } })}
            >
              {PAGE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {tPages(key)}
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-url`} className="text-xs text-muted-foreground">
              {t("url")}
            </Label>
            <Input
              id={`${id}-url`}
              value={link.url}
              inputMode="url"
              onChange={(e) => onChange({ ...value, link: { kind: "url", url: e.target.value } })}
            />
            <p className="text-xs text-muted-foreground">{t("urlHint")}</p>
          </div>
        )}
      </div>
      {optional ? (
        <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => onChange(undefined)}>
          <Trash2 aria-hidden />
          {t("removeButton")}
        </Button>
      ) : null}
    </fieldset>
  );
}

export function IconSelect({ id, value, onChange }: { id: string; value: SectionIcon; onChange: (icon: SectionIcon) => void }) {
  const t = useTranslations("Sections");
  const Icon = SECTION_ICON_COMPONENTS[value];
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{t("icon")}</Label>
      <div className="flex items-center gap-2">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border text-leaf md:size-9">
          <Icon className="size-5" aria-hidden />
        </span>
        <NativeSelect id={id} value={value} onChange={(e) => onChange(e.target.value as SectionIcon)}>
          {SECTION_ICONS.map((icon) => (
            <option key={icon} value={icon}>
              {t(`icons.${icon}`)}
            </option>
          ))}
        </NativeSelect>
      </div>
    </div>
  );
}

/** A list of repeated items (features, cards…) with add / move / remove. */
export function ItemList<T>({
  items,
  onChange,
  max,
  newItem,
  addLabel,
  itemLabel,
  render,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  max: number;
  newItem: () => T;
  addLabel: string;
  itemLabel: (index: number) => string;
  render: (item: T, update: (item: T) => void, index: number) => ReactNode;
}) {
  const t = useTranslations("Sections");
  const move = (from: number, to: number) => {
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-lg border bg-background p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{itemLabel(i)}</span>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon-sm" aria-label={t("moveUp")} disabled={i === 0} onClick={() => move(i, i - 1)}>
                <ArrowUp aria-hidden />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={t("moveDown")} disabled={i === items.length - 1} onClick={() => move(i, i + 1)}>
                <ArrowDown aria-hidden />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={t("remove")} onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <Trash2 aria-hidden />
              </Button>
            </div>
          </div>
          {render(item, (updated) => onChange(items.map((current, j) => (j === i ? updated : current))), i)}
        </div>
      ))}
      {items.length < max ? (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => onChange([...items, newItem()])}>
          <Plus aria-hidden />
          {addLabel}
        </Button>
      ) : null}
    </div>
  );
}
