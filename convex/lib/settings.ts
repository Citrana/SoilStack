import { v, type Infer } from "convex/values";
import { appError } from "./errors";
import { locValidator } from "./i18n";
import type { PublicContact } from "./sections";

export const socialsValidator = v.object({
  facebook: v.optional(v.string()),
  linkedin: v.optional(v.string()),
  x: v.optional(v.string()),
  instagram: v.optional(v.string()),
  youtube: v.optional(v.string()),
});

/** Everything in siteSettings is public (shown on the site). */
export const settingsFields = {
  phone: v.string(),
  whatsapp: v.string(),
  email: v.string(),
  address: locValidator,
  mapUrl: v.string(),
  socials: socialsValidator,
  tagline: locValidator,
  footerText: locValidator,
};
export const settingsValidator = v.object(settingsFields);
export type SiteSettings = Infer<typeof settingsValidator>;

export const SOCIAL_KEYS = ["facebook", "linkedin", "x", "instagram", "youtube"] as const;

export const EMPTY_SETTINGS: SiteSettings = {
  phone: "",
  whatsapp: "",
  email: "",
  address: { fr: "", en: "" },
  mapUrl: "",
  socials: {},
  tagline: {
    fr: "La technologie agricole pour la RDC",
    en: "Agricultural technology for the DRC",
  },
  footerText: { fr: "", en: "" },
};

const PHONE = /^\+?[0-9 ()-]{6,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HTTPS = /^https:\/\/[^\s]+$/;

/** Trims values and rejects malformed contacts/links. */
export function cleanSettings(input: SiteSettings): SiteSettings {
  const t = (s: string) => s.trim();
  const settings: SiteSettings = {
    phone: t(input.phone),
    whatsapp: t(input.whatsapp),
    email: t(input.email).toLowerCase(),
    address: { fr: t(input.address.fr), en: t(input.address.en) },
    mapUrl: t(input.mapUrl),
    socials: Object.fromEntries(
      SOCIAL_KEYS.flatMap((key) => {
        const value = input.socials[key]?.trim();
        return value ? [[key, value]] : [];
      }),
    ),
    tagline: { fr: t(input.tagline.fr), en: t(input.tagline.en) },
    footerText: { fr: t(input.footerText.fr), en: t(input.footerText.en) },
  };
  const bad = (what: string) => appError("INVALID_INPUT", `Invalid ${what}.`);
  if (settings.phone && !PHONE.test(settings.phone)) throw bad("phone");
  if (settings.whatsapp && !PHONE.test(settings.whatsapp)) throw bad("WhatsApp number");
  if (settings.email && !EMAIL.test(settings.email)) throw bad("email");
  if (settings.mapUrl && !HTTPS.test(settings.mapUrl)) throw bad("map link");
  for (const key of SOCIAL_KEYS) {
    const value = settings.socials[key];
    if (value && !HTTPS.test(value)) throw bad(`${key} link`);
  }
  for (const loc of [settings.address, settings.tagline, settings.footerText]) {
    if (loc.fr.length > 500 || loc.en.length > 500) throw bad("text (too long)");
  }
  return settings;
}

export function toPublicContact(settings: SiteSettings): PublicContact {
  return {
    phone: settings.phone,
    whatsapp: settings.whatsapp,
    email: settings.email,
    address: settings.address,
    mapUrl: settings.mapUrl,
  };
}
