import { expect, test } from "vitest";
import { DEFAULT_PAGES } from "./defaultContent";
import { PAGE_KEYS } from "./pages";
import {
  isAllowedUrl,
  newSection,
  resolveSections,
  SECTION_TYPES,
  sectionMediaIds,
  validateSections,
  validateSeo,
  type Section,
} from "./sections";

const contact = { phone: "", whatsapp: "", email: "", address: { fr: "", en: "" }, mapUrl: "" };

test("every section type has a blank template that validates, and so does the starter content", () => {
  const blanks = SECTION_TYPES.map((type) => newSection(type));
  expect(blanks.map((s) => s.type)).toEqual(SECTION_TYPES);
  expect(() => validateSections(blanks)).not.toThrow();
  for (const key of PAGE_KEYS) {
    expect(() => validateSections(DEFAULT_PAGES[key].sections)).not.toThrow();
    expect(() => validateSeo(DEFAULT_PAGES[key].seo)).not.toThrow();
  }
});

test("validateSections rejects duplicate ids, too many items, long text and bad links", () => {
  const hero = newSection("hero");
  expect(() => validateSections([hero, { ...hero }])).toThrow(/Duplicate/);
  expect(() => validateSections([{ ...hero, id: "bad id!" }])).toThrow(/section id/);

  const grid = newSection("featureGrid") as Extract<Section, { type: "featureGrid" }>;
  expect(() => validateSections([{ ...grid, items: Array(9).fill(grid.items[0]) }])).toThrow(/Too many features/);

  expect(() =>
    validateSections([{ ...hero, title: { fr: "x".repeat(201), en: "" } } as Section]),
  ).toThrow(/too long/);

  const cta = newSection("cta") as Extract<Section, { type: "cta" }>;
  const withUrl = (url: string) => ({ ...cta, button: { ...cta.button, link: { kind: "url" as const, url } } });
  expect(() => validateSections([withUrl("javascript:alert(1)")])).toThrow(/https/);
  expect(() => validateSections([withUrl("http://insecure.example")])).toThrow(/https/);
  expect(() => validateSections([withUrl("https://soilstack.example/a")])).not.toThrow();
});

test("isAllowedUrl accepts https, mailto and tel only", () => {
  expect(isAllowedUrl("https://wa.me/243000")).toBe(true);
  expect(isAllowedUrl("mailto:hello@soilstack.cd")).toBe(true);
  expect(isAllowedUrl("tel:+243 81 000 0000")).toBe(true);
  expect(isAllowedUrl("ftp://x")).toBe(false);
  expect(isAllowedUrl("/relative")).toBe(false);
});

test("resolveSections drops hidden sections, resolves images and fills contact sections", () => {
  const image = { url: "https://x/img", width: 10, height: 10, blurDataUrl: "data:image/webp;base64,x", alt: { fr: "", en: "" } };
  const hero = { ...newSection("hero"), image: "m1" } as unknown as Section;
  const accordion = { ...newSection("accordion"), images: ["m1", "gone"] } as unknown as Section;
  const hidden = { ...newSection("stats"), hidden: true };
  const contactSection = newSection("contactInfo");
  const resolved = resolveSections([hero, accordion, hidden, contactSection], (id) => (id === "m1" ? image : null), { contact });
  expect(resolved.map((s) => s.type)).toEqual(["hero", "accordion", "contactInfo"]);
  expect(resolved[0]).toMatchObject({ image });
  expect(resolved[1]).toMatchObject({ images: [image] });
  expect(resolved[2]).toMatchObject({ contact });
  expect(sectionMediaIds([hero, accordion])).toEqual(["m1", "gone"]);
});
