import { v, type Infer } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { appError } from "./errors";
import { locValidator, type Loc } from "./i18n";
import type { MediaRef, PublicImage } from "./media";
import { pageKeyValidator } from "./pages";

/**
 * Page sections: a fixed set of typed blocks (CLAUDE.md, "Content model").
 * Admins edit their text and images; a new type is added here, in the
 * admin editor, in the public renderer and in both message files.
 */

const iconValidator = v.union(
  v.literal("Sprout"),
  v.literal("Leaf"),
  v.literal("Tractor"),
  v.literal("Droplets"),
  v.literal("Sun"),
  v.literal("Wheat"),
  v.literal("MapPin"),
  v.literal("ShieldCheck"),
  v.literal("BarChart3"),
  v.literal("Users"),
  v.literal("Globe"),
  v.literal("Cpu"),
);
export type SectionIcon = Infer<typeof iconValidator>;
export const SECTION_ICONS: readonly SectionIcon[] = iconValidator.members.map((m) => m.value);

export const linkValidator = v.union(
  v.object({ kind: v.literal("page"), page: pageKeyValidator }),
  v.object({ kind: v.literal("url"), url: v.string() }),
);
export type SectionLink = Infer<typeof linkValidator>;

export const buttonValidator = v.object({ label: locValidator, link: linkValidator });
export type SectionButton = Infer<typeof buttonValidator>;

const media = v.id("media");
const optionalLoc = v.optional(locValidator);
const base = { id: v.string(), hidden: v.boolean() };

export const heroSection = v.object({
  ...base,
  type: v.literal("hero"),
  eyebrow: locValidator,
  title: locValidator,
  subtitle: locValidator,
  image: v.optional(media),
  primaryCta: v.optional(buttonValidator),
  secondaryCta: v.optional(buttonValidator),
});

export const featureGridSection = v.object({
  ...base,
  type: v.literal("featureGrid"),
  eyebrow: optionalLoc,
  title: optionalLoc,
  items: v.array(v.object({ icon: iconValidator, title: locValidator, text: locValidator })),
});

export const textImageSection = v.object({
  ...base,
  type: v.literal("textImage"),
  eyebrow: optionalLoc,
  title: locValidator,
  body: locValidator,
  image: v.optional(media),
  imageSide: v.union(v.literal("left"), v.literal("right")),
});

export const accordionSection = v.object({
  ...base,
  type: v.literal("accordion"),
  eyebrow: optionalLoc,
  title: locValidator,
  intro: optionalLoc,
  images: v.array(media),
  items: v.array(v.object({ title: locValidator, body: locValidator })),
});

export const bentoSection = v.object({
  ...base,
  type: v.literal("bento"),
  eyebrow: optionalLoc,
  title: locValidator,
  intro: optionalLoc,
  cards: v.array(
    v.object({
      title: locValidator,
      image: v.optional(media),
      tone: v.union(v.literal("dark"), v.literal("light"), v.literal("photo")),
    }),
  ),
});

export const statsSection = v.object({
  ...base,
  type: v.literal("stats"),
  items: v.array(v.object({ value: v.string(), label: locValidator })),
});

export const ctaSection = v.object({
  ...base,
  type: v.literal("cta"),
  title: locValidator,
  text: optionalLoc,
  button: buttonValidator,
});

export const contactInfoSection = v.object({
  ...base,
  type: v.literal("contactInfo"),
  title: locValidator,
  intro: optionalLoc,
});

export const sectionValidator = v.union(
  heroSection,
  featureGridSection,
  textImageSection,
  accordionSection,
  bentoSection,
  statsSection,
  ctaSection,
  contactInfoSection,
);
export type Section = Infer<typeof sectionValidator>;
export type SectionType = Section["type"];

export const SECTION_TYPES: readonly SectionType[] = [
  "hero",
  "featureGrid",
  "textImage",
  "accordion",
  "bento",
  "stats",
  "cta",
  "contactInfo",
];

export const seoValidator = v.object({ title: locValidator, description: locValidator });
export type Seo = Infer<typeof seoValidator>;

/** Size limits, enforced by validateSections. */
export const SECTION_LIMITS = {
  sections: 30,
  shortText: 200,
  longText: 5000,
  featureItems: 8,
  accordionItems: 8,
  accordionImages: 3,
  bentoCards: 4,
  statItems: 4,
  seoTitle: 70,
  seoDescription: 200,
} as const;

const URL_PATTERN = /^(https:\/\/[^\s]+|mailto:[^\s@]+@[^\s@]+|tel:\+?[0-9 ()-]{3,})$/;

export function isAllowedUrl(url: string) {
  return URL_PATTERN.test(url.trim());
}

function fail(message: string): never {
  throw appError("INVALID_INPUT", message);
}

function checkLoc(loc: Loc | undefined, max: number, what: string) {
  if (!loc) return;
  if (loc.fr.length > max || loc.en.length > max) fail(`${what} is too long.`);
}

function checkButton(button: SectionButton | undefined, what: string) {
  if (!button) return;
  checkLoc(button.label, SECTION_LIMITS.shortText, `${what} label`);
  if (button.link.kind === "url" && !isAllowedUrl(button.link.url)) {
    fail(`${what} link must start with https://, mailto: or tel:.`);
  }
}

function checkCount(items: readonly unknown[], max: number, what: string) {
  if (items.length > max) fail(`Too many ${what} (max ${max}).`);
}

/** Structure is checked by the validators; this checks limits and links. */
export function validateSections(sections: readonly Section[]) {
  const { shortText: S, longText: L } = SECTION_LIMITS;
  checkCount(sections, SECTION_LIMITS.sections, "sections");
  const ids = new Set<string>();
  for (const section of sections) {
    if (!/^[a-z0-9-]{1,40}$/i.test(section.id)) fail("Invalid section id.");
    if (ids.has(section.id)) fail("Duplicate section id.");
    ids.add(section.id);
    switch (section.type) {
      case "hero":
        checkLoc(section.eyebrow, S, "Eyebrow");
        checkLoc(section.title, S, "Title");
        checkLoc(section.subtitle, L, "Subtitle");
        checkButton(section.primaryCta, "Primary button");
        checkButton(section.secondaryCta, "Secondary button");
        break;
      case "featureGrid":
        checkLoc(section.eyebrow, S, "Eyebrow");
        checkLoc(section.title, S, "Title");
        checkCount(section.items, SECTION_LIMITS.featureItems, "features");
        for (const item of section.items) {
          checkLoc(item.title, S, "Feature title");
          checkLoc(item.text, L, "Feature text");
        }
        break;
      case "textImage":
        checkLoc(section.eyebrow, S, "Eyebrow");
        checkLoc(section.title, S, "Title");
        checkLoc(section.body, L, "Text");
        break;
      case "accordion":
        checkLoc(section.eyebrow, S, "Eyebrow");
        checkLoc(section.title, S, "Title");
        checkLoc(section.intro, L, "Intro");
        checkCount(section.images, SECTION_LIMITS.accordionImages, "images");
        checkCount(section.items, SECTION_LIMITS.accordionItems, "items");
        for (const item of section.items) {
          checkLoc(item.title, S, "Item title");
          checkLoc(item.body, L, "Item text");
        }
        break;
      case "bento":
        checkLoc(section.eyebrow, S, "Eyebrow");
        checkLoc(section.title, S, "Title");
        checkLoc(section.intro, L, "Intro");
        checkCount(section.cards, SECTION_LIMITS.bentoCards, "cards");
        for (const card of section.cards) checkLoc(card.title, S, "Card title");
        break;
      case "stats":
        checkCount(section.items, SECTION_LIMITS.statItems, "figures");
        for (const item of section.items) {
          if (item.value.length > 20) fail("Figure is too long.");
          checkLoc(item.label, S, "Figure label");
        }
        break;
      case "cta":
        checkLoc(section.title, S, "Title");
        checkLoc(section.text, L, "Text");
        checkButton(section.button, "Button");
        break;
      case "contactInfo":
        checkLoc(section.title, S, "Title");
        checkLoc(section.intro, L, "Intro");
        break;
    }
  }
}

export function validateSeo(seo: Seo) {
  checkLoc(seo.title, SECTION_LIMITS.seoTitle, "SEO title");
  checkLoc(seo.description, SECTION_LIMITS.seoDescription, "SEO description");
}

/** Every image a list of sections uses, for setMediaUsages. */
export function sectionMediaIds(sections: readonly Section[]): Id<"media">[] {
  const ids: Id<"media">[] = [];
  for (const section of sections) {
    switch (section.type) {
      case "hero":
      case "textImage":
        if (section.image) ids.push(section.image);
        break;
      case "accordion":
        ids.push(...section.images);
        break;
      case "bento":
        for (const card of section.cards) if (card.image) ids.push(card.image);
        break;
    }
  }
  return [...new Set(ids)];
}

export function sectionMediaRefs(sections: readonly Section[], field: string): MediaRef[] {
  return sectionMediaIds(sections).map((mediaId) => ({ mediaId, field }));
}

/** Contact details shown by `contactInfo` sections and the footer. */
export type PublicContact = {
  phone: string;
  whatsapp: string;
  email: string;
  address: Loc;
  mapUrl: string;
};

type ImageLookup = (id: Id<"media"> | undefined) => PublicImage | null;

/**
 * Sections as the public site renders them: images resolved, hidden
 * sections removed, contact sections filled. Pure, so the admin preview
 * runs the very same code on the draft.
 */
export function resolveSections(sections: readonly Section[], image: ImageLookup, contact: PublicContact) {
  return sections
    .filter((section) => !section.hidden)
    .map((section) => {
      switch (section.type) {
        case "hero":
        case "textImage":
          return { ...section, image: image(section.image) };
        case "accordion":
          return {
            ...section,
            images: section.images.map((id) => image(id)).filter((img) => img !== null),
          };
        case "bento":
          return { ...section, cards: section.cards.map((card) => ({ ...card, image: image(card.image) })) };
        case "contactInfo":
          return { ...section, contact };
        default:
          return section;
      }
    });
}
export type PublicSection = ReturnType<typeof resolveSections>[number];

const id = () => Math.random().toString(36).slice(2, 10);
const empty = (): Loc => ({ fr: "", en: "" });

/** A blank section of `type`, for the editor's "Add section". */
export function newSection(type: SectionType): Section {
  const common = { id: id(), hidden: false };
  switch (type) {
    case "hero":
      return { ...common, type, eyebrow: empty(), title: empty(), subtitle: empty() };
    case "featureGrid":
      return { ...common, type, items: [{ icon: "Sprout", title: empty(), text: empty() }] };
    case "textImage":
      return { ...common, type, title: empty(), body: empty(), imageSide: "right" };
    case "accordion":
      return { ...common, type, title: empty(), images: [], items: [{ title: empty(), body: empty() }] };
    case "bento":
      return { ...common, type, title: empty(), cards: [{ title: empty(), tone: "dark" }] };
    case "stats":
      return { ...common, type, items: [{ value: "", label: empty() }] };
    case "cta":
      return { ...common, type, title: empty(), button: { label: empty(), link: { kind: "page", page: "contact" } } };
    case "contactInfo":
      return { ...common, type, title: empty() };
  }
}
