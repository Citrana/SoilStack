"use client";

import { useTranslations } from "next-intl";
import type { Loc } from "../../../../convex/lib/i18n";
import { SECTION_LIMITS, type Section } from "../../../../convex/lib/sections";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { LocalizedField } from "@/components/admin/localized-field";
import { ButtonField, EMPTY_LOC, IconSelect, ImageField, ImageListField, ItemList, type ImageMap } from "./fields";

type Of<T extends Section["type"]> = Extract<Section, { type: T }>;
type EditorProps<T extends Section["type"]> = {
  section: Of<T>;
  onChange: (section: Of<T>) => void;
  images: ImageMap;
};

/** Typed setter: `set("title", value)` returns the updated section. */
function useSet<T extends Section["type"]>({ section, onChange }: EditorProps<T>) {
  return <K extends keyof Of<T>>(key: K, value: Of<T>[K]) => onChange({ ...section, [key]: value });
}

/** Optional localized text: stored as undefined when both languages are empty. */
const optional = (loc: Loc) => (loc.fr.trim() || loc.en.trim() ? loc : undefined);

function HeroEditor(props: EditorProps<"hero">) {
  const t = useTranslations("Sections.fields");
  const { section, images } = props;
  const set = useSet(props);
  const id = section.id;
  return (
    <>
      <LocalizedField id={`${id}-eyebrow`} label={t("eyebrow")} value={section.eyebrow} onChange={(v) => set("eyebrow", v)} />
      <LocalizedField id={`${id}-title`} label={t("title")} value={section.title} onChange={(v) => set("title", v)} />
      <LocalizedField id={`${id}-subtitle`} label={t("subtitle")} value={section.subtitle} onChange={(v) => set("subtitle", v)} multiline />
      <ImageField id={`${id}-image`} label={t("image")} value={section.image} onChange={(v) => set("image", v)} images={images} />
      <ButtonField id={`${id}-primary`} label={t("primaryCta")} value={section.primaryCta} onChange={(v) => set("primaryCta", v)} optional />
      <ButtonField id={`${id}-secondary`} label={t("secondaryCta")} value={section.secondaryCta} onChange={(v) => set("secondaryCta", v)} optional />
    </>
  );
}

function FeatureGridEditor(props: EditorProps<"featureGrid">) {
  const t = useTranslations("Sections.fields");
  const { section } = props;
  const set = useSet(props);
  const id = section.id;
  return (
    <>
      <LocalizedField id={`${id}-eyebrow`} label={t("eyebrow")} value={section.eyebrow ?? EMPTY_LOC} onChange={(v) => set("eyebrow", optional(v))} />
      <LocalizedField id={`${id}-title`} label={t("title")} value={section.title ?? EMPTY_LOC} onChange={(v) => set("title", optional(v))} />
      <ItemList
        items={section.items}
        onChange={(items) => set("items", items)}
        max={SECTION_LIMITS.featureItems}
        newItem={() => ({ icon: "Sprout" as const, title: EMPTY_LOC, text: EMPTY_LOC })}
        addLabel={t("addFeature")}
        itemLabel={(i) => t("feature", { n: i + 1 })}
        render={(item, update, i) => (
          <>
            <IconSelect id={`${id}-icon-${i}`} value={item.icon} onChange={(icon) => update({ ...item, icon })} />
            <LocalizedField id={`${id}-ftitle-${i}`} label={t("title")} value={item.title} onChange={(title) => update({ ...item, title })} />
            <LocalizedField id={`${id}-ftext-${i}`} label={t("text")} value={item.text} onChange={(text) => update({ ...item, text })} multiline />
          </>
        )}
      />
    </>
  );
}

function TextImageEditor(props: EditorProps<"textImage">) {
  const t = useTranslations("Sections.fields");
  const { section, images } = props;
  const set = useSet(props);
  const id = section.id;
  return (
    <>
      <LocalizedField id={`${id}-eyebrow`} label={t("eyebrow")} value={section.eyebrow ?? EMPTY_LOC} onChange={(v) => set("eyebrow", optional(v))} />
      <LocalizedField id={`${id}-title`} label={t("title")} value={section.title} onChange={(v) => set("title", v)} />
      <LocalizedField id={`${id}-body`} label={t("body")} value={section.body} onChange={(v) => set("body", v)} multiline />
      <p className="-mt-2 text-xs text-muted-foreground">{t("bodyHint")}</p>
      <ImageField id={`${id}-image`} label={t("image")} value={section.image} onChange={(v) => set("image", v)} images={images} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-side`}>{t("imageSide")}</Label>
        <NativeSelect id={`${id}-side`} value={section.imageSide} onChange={(e) => set("imageSide", e.target.value as "left" | "right")}>
          <option value="right">{t("imageRight")}</option>
          <option value="left">{t("imageLeft")}</option>
        </NativeSelect>
      </div>
    </>
  );
}

function AccordionEditor(props: EditorProps<"accordion">) {
  const t = useTranslations("Sections.fields");
  const { section, images } = props;
  const set = useSet(props);
  const id = section.id;
  return (
    <>
      <LocalizedField id={`${id}-eyebrow`} label={t("eyebrow")} value={section.eyebrow ?? EMPTY_LOC} onChange={(v) => set("eyebrow", optional(v))} />
      <LocalizedField id={`${id}-title`} label={t("title")} value={section.title} onChange={(v) => set("title", v)} />
      <LocalizedField id={`${id}-intro`} label={t("intro")} value={section.intro ?? EMPTY_LOC} onChange={(v) => set("intro", optional(v))} multiline />
      <ImageListField
        label={t("images", { max: SECTION_LIMITS.accordionImages })}
        value={section.images}
        onChange={(v) => set("images", v)}
        images={images}
        max={SECTION_LIMITS.accordionImages}
      />
      <ItemList
        items={section.items}
        onChange={(items) => set("items", items)}
        max={SECTION_LIMITS.accordionItems}
        newItem={() => ({ title: EMPTY_LOC, body: EMPTY_LOC })}
        addLabel={t("addItem")}
        itemLabel={(i) => t("item", { n: i + 1 })}
        render={(item, update, i) => (
          <>
            <LocalizedField id={`${id}-atitle-${i}`} label={t("title")} value={item.title} onChange={(title) => update({ ...item, title })} />
            <LocalizedField id={`${id}-abody-${i}`} label={t("text")} value={item.body} onChange={(body) => update({ ...item, body })} multiline />
          </>
        )}
      />
    </>
  );
}

function BentoEditor(props: EditorProps<"bento">) {
  const t = useTranslations("Sections.fields");
  const { section, images } = props;
  const set = useSet(props);
  const id = section.id;
  return (
    <>
      <LocalizedField id={`${id}-eyebrow`} label={t("eyebrow")} value={section.eyebrow ?? EMPTY_LOC} onChange={(v) => set("eyebrow", optional(v))} />
      <LocalizedField id={`${id}-title`} label={t("title")} value={section.title} onChange={(v) => set("title", v)} />
      <LocalizedField id={`${id}-intro`} label={t("intro")} value={section.intro ?? EMPTY_LOC} onChange={(v) => set("intro", optional(v))} multiline />
      <ItemList
        items={section.cards}
        onChange={(cards) => set("cards", cards)}
        max={SECTION_LIMITS.bentoCards}
        newItem={() => ({ title: EMPTY_LOC, tone: "dark" as const })}
        addLabel={t("addCard")}
        itemLabel={(i) => t("card", { n: i + 1 })}
        render={(card, update, i) => (
          <>
            <LocalizedField id={`${id}-ctitle-${i}`} label={t("title")} value={card.title} onChange={(title) => update({ ...card, title })} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-tone-${i}`}>{t("tone")}</Label>
              <NativeSelect
                id={`${id}-tone-${i}`}
                value={card.tone}
                onChange={(e) => update({ ...card, tone: e.target.value as typeof card.tone })}
              >
                <option value="dark">{t("toneDark")}</option>
                <option value="light">{t("toneLight")}</option>
                <option value="photo">{t("tonePhoto")}</option>
              </NativeSelect>
            </div>
            <ImageField id={`${id}-cimage-${i}`} label={t("image")} value={card.image} onChange={(image) => update({ ...card, image })} images={images} />
          </>
        )}
      />
    </>
  );
}

function StatsEditor(props: EditorProps<"stats">) {
  const t = useTranslations("Sections.fields");
  const { section } = props;
  const set = useSet(props);
  const id = section.id;
  return (
    <ItemList
      items={section.items}
      onChange={(items) => set("items", items)}
      max={SECTION_LIMITS.statItems}
      newItem={() => ({ value: "", label: EMPTY_LOC })}
      addLabel={t("addFigure")}
      itemLabel={(i) => t("figure", { n: i + 1 })}
      render={(item, update, i) => (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-value-${i}`}>{t("value")}</Label>
            <Input id={`${id}-value-${i}`} value={item.value} maxLength={20} onChange={(e) => update({ ...item, value: e.target.value })} />
          </div>
          <LocalizedField id={`${id}-label-${i}`} label={t("label")} value={item.label} onChange={(label) => update({ ...item, label })} />
        </>
      )}
    />
  );
}

function CtaEditor(props: EditorProps<"cta">) {
  const t = useTranslations("Sections.fields");
  const { section } = props;
  const set = useSet(props);
  const id = section.id;
  return (
    <>
      <LocalizedField id={`${id}-title`} label={t("title")} value={section.title} onChange={(v) => set("title", v)} />
      <LocalizedField id={`${id}-text`} label={t("text")} value={section.text ?? EMPTY_LOC} onChange={(v) => set("text", optional(v))} multiline />
      <ButtonField id={`${id}-button`} label={t("button")} value={section.button} onChange={(v) => v && set("button", v)} />
    </>
  );
}

function ContactInfoEditor(props: EditorProps<"contactInfo">) {
  const t = useTranslations("Sections.fields");
  const { section } = props;
  const set = useSet(props);
  const id = section.id;
  return (
    <>
      <LocalizedField id={`${id}-title`} label={t("title")} value={section.title} onChange={(v) => set("title", v)} />
      <LocalizedField id={`${id}-intro`} label={t("intro")} value={section.intro ?? EMPTY_LOC} onChange={(v) => set("intro", optional(v))} multiline />
      <p className="text-sm text-muted-foreground">{t("contactInfoHint")}</p>
    </>
  );
}

function LatestPostsEditor(props: EditorProps<"latestPosts">) {
  const t = useTranslations("Sections.fields");
  const { section } = props;
  const set = useSet(props);
  const id = section.id;
  return (
    <>
      <LocalizedField id={`${id}-title`} label={t("title")} value={section.title} onChange={(v) => set("title", v)} />
      <LocalizedField id={`${id}-intro`} label={t("intro")} value={section.intro ?? EMPTY_LOC} onChange={(v) => set("intro", optional(v))} multiline />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-count`}>{t("postCount")}</Label>
        <NativeSelect id={`${id}-count`} value={section.count} onChange={(e) => set("count", Number(e.target.value))}>
          {[3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </NativeSelect>
      </div>
      <p className="text-sm text-muted-foreground">{t("latestPostsHint")}</p>
    </>
  );
}

function FeaturedProductsEditor(props: EditorProps<"featuredProducts">) {
  const t = useTranslations("Sections.fields");
  const { section } = props;
  const set = useSet(props);
  const id = section.id;
  return (
    <>
      <LocalizedField id={`${id}-title`} label={t("title")} value={section.title} onChange={(v) => set("title", v)} />
      <LocalizedField id={`${id}-intro`} label={t("intro")} value={section.intro ?? EMPTY_LOC} onChange={(v) => set("intro", optional(v))} multiline />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-count`}>{t("productCount")}</Label>
        <NativeSelect id={`${id}-count`} value={section.count} onChange={(e) => set("count", Number(e.target.value))}>
          {[3, 4, 5, 6, 7, 8].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </NativeSelect>
      </div>
      <p className="text-sm text-muted-foreground">{t("featuredProductsHint")}</p>
    </>
  );
}

function ProjectsListEditor(props: EditorProps<"projectsList">) {
  const t = useTranslations("Sections.fields");
  const { section } = props;
  const set = useSet(props);
  const id = section.id;
  return (
    <>
      <LocalizedField id={`${id}-title`} label={t("title")} value={section.title} onChange={(v) => set("title", v)} />
      <LocalizedField id={`${id}-intro`} label={t("intro")} value={section.intro ?? EMPTY_LOC} onChange={(v) => set("intro", optional(v))} multiline />
      <p className="text-sm text-muted-foreground">{t("projectsListHint")}</p>
    </>
  );
}

/** The fields of one section, by type. */
export function SectionFields({
  section,
  onChange,
  images,
}: {
  section: Section;
  onChange: (section: Section) => void;
  images: ImageMap;
}) {
  switch (section.type) {
    case "hero":
      return <HeroEditor section={section} onChange={onChange} images={images} />;
    case "featureGrid":
      return <FeatureGridEditor section={section} onChange={onChange} images={images} />;
    case "textImage":
      return <TextImageEditor section={section} onChange={onChange} images={images} />;
    case "accordion":
      return <AccordionEditor section={section} onChange={onChange} images={images} />;
    case "bento":
      return <BentoEditor section={section} onChange={onChange} images={images} />;
    case "stats":
      return <StatsEditor section={section} onChange={onChange} images={images} />;
    case "cta":
      return <CtaEditor section={section} onChange={onChange} images={images} />;
    case "contactInfo":
      return <ContactInfoEditor section={section} onChange={onChange} images={images} />;
    case "latestPosts":
      return <LatestPostsEditor section={section} onChange={onChange} images={images} />;
    case "featuredProducts":
      return <FeaturedProductsEditor section={section} onChange={onChange} images={images} />;
    case "projectsList":
      return <ProjectsListEditor section={section} onChange={onChange} images={images} />;
  }
}
