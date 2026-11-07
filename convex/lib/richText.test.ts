import { expect, test } from "vitest";
import {
  isAllowedHref,
  isEmptyDoc,
  plainText,
  readingMinutes,
  richTextMediaIds,
  sanitizeRichText,
  type RichDoc,
} from "./richText";

const MEDIA = "kd70wehx7f0eecnfssg4pxz0gn8hswx9";

const full: RichDoc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2, id: "x" }, content: [{ type: "text", text: "Titre" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Du ", marks: [{ type: "bold" }] },
        { type: "text", text: "texte", marks: [{ type: "italic" }, { type: "link", attrs: { href: "https://soilstack.cd", target: "_blank", rel: "x" } as never }] },
        { type: "hardBreak" },
        { type: "text", text: "suite", marks: [{ type: "link", attrs: { href: "/fr/contact" } }] },
      ],
    },
    { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "un" }] }] }] },
    { type: "orderedList", attrs: { start: 1, type: null }, content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "deux" }] }] }] },
    { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "citation" }] }] },
    { type: "horizontalRule" },
    { type: "mediaImage", attrs: { mediaId: MEDIA, src: "https://evil.example/x.png" } },
  ],
};

test("sanitizeRichText keeps allowed content and drops extra attributes", () => {
  const clean = sanitizeRichText(full);
  expect(clean.content?.[0]).toEqual({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Titre" }] });
  const link = clean.content?.[1].content?.[1].marks?.[1];
  expect(link).toEqual({ type: "link", attrs: { href: "https://soilstack.cd" } });
  expect(clean.content?.[3]).not.toHaveProperty("attrs");
  expect(clean.content?.[6]).toEqual({ type: "mediaImage", attrs: { mediaId: MEDIA } });
});

test("sanitizeRichText refuses unknown nodes and marks, unsafe links, raw images, deep nesting and huge docs", () => {
  const bad = (content: unknown[]) => () => sanitizeRichText({ type: "doc", content } as RichDoc);
  expect(bad([{ type: "script", content: [] }])).toThrow(/not allowed/);
  expect(bad([{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "underline" }] }] }])).toThrow(/mark/);
  expect(bad([{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] }])).toThrow(/link/);
  expect(bad([{ type: "image", attrs: { src: "https://x/y.png" } }])).toThrow(/not allowed/);
  expect(bad([{ type: "mediaImage", attrs: { src: "https://x/y.png" } }])).toThrow(/library/);
  expect(bad([{ type: "heading", attrs: { level: 1 }, content: [] }])).toThrow(/level/);
  expect(bad([{ type: "paragraph", content: [{ type: "heading", attrs: { level: 2 } }] }])).toThrow(/not allowed in .*paragraph/);
  let deep: unknown = { type: "paragraph", content: [{ type: "text", text: "x" }] };
  for (let i = 0; i < 6; i++) deep = { type: "bulletList", content: [{ type: "listItem", content: [deep] }] };
  expect(bad([deep])).toThrow(/nested/);
  expect(bad([{ type: "paragraph", content: [{ type: "text", text: "x".repeat(160_000) }] }])).toThrow(/too long/);
});

test("isAllowedHref", () => {
  expect(isAllowedHref("https://wa.me/243")).toBe(true);
  expect(isAllowedHref("/fr/blog")).toBe(true);
  expect(isAllowedHref("//evil.example")).toBe(false);
  expect(isAllowedHref("http://insecure.example")).toBe(false);
  expect(isAllowedHref("data:text/html,x")).toBe(false);
});

test("helpers: media ids, plain text, reading time, emptiness", () => {
  expect(richTextMediaIds(full)).toEqual([MEDIA]);
  expect(plainText(full)).toBe("Titre\nDu texte suite\nun\ndeux\ncitation");
  expect(readingMinutes(full)).toBe(1);
  const long: RichDoc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "mot ".repeat(1000) }] }] };
  expect(readingMinutes(long)).toBe(5);
  expect(isEmptyDoc({ type: "doc", content: [{ type: "paragraph" }] })).toBe(true);
  expect(isEmptyDoc(full)).toBe(false);
});
