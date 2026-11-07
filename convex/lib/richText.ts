import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { appError } from "./errors";

/**
 * Rich text (blog bodies): TipTap JSON, sanitized on the server against an
 * allow-list (CLAUDE.md, "Content model"). Unknown nodes/marks and unsafe
 * links are refused; harmless extra attributes the editor adds are dropped.
 * The public site renders it with its own renderer (no raw HTML, ever).
 */

export type RichMark = { type: "bold" | "italic" | "link"; attrs?: { href: string } };
export type RichNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichNode[];
  marks?: RichMark[];
  text?: string;
};
export type RichDoc = { type: "doc"; content?: RichNode[] };

/** Shape check only; `sanitizeRichText` does the real validation. */
export const richDocValidator = v.object({
  type: v.literal("doc"),
  content: v.optional(v.array(v.any())),
});
export const locRichValidator = v.object({ fr: richDocValidator, en: richDocValidator });
export type LocRich = { fr: RichDoc; en: RichDoc };

export const EMPTY_DOC: RichDoc = { type: "doc", content: [{ type: "paragraph" }] };

export const RICH_TEXT_LIMITS = { maxJsonLength: 150_000, maxDepth: 8 } as const;

const BLOCK_CHILDREN: Record<string, readonly string[]> = {
  doc: ["paragraph", "heading", "bulletList", "orderedList", "blockquote", "horizontalRule", "mediaImage"],
  paragraph: ["text", "hardBreak"],
  heading: ["text", "hardBreak"],
  bulletList: ["listItem"],
  orderedList: ["listItem"],
  listItem: ["paragraph", "bulletList", "orderedList"],
  blockquote: ["paragraph", "bulletList", "orderedList"],
  horizontalRule: [],
  hardBreak: [],
  mediaImage: [],
};

const LINK_PATTERN = /^(https:\/\/[^\s]+|mailto:[^\s@]+@[^\s@]+|tel:\+?[0-9 ()-]{3,}|\/[^\s]*)$/;

export function isAllowedHref(href: string) {
  return LINK_PATTERN.test(href) && !href.startsWith("//");
}

function fail(message: string): never {
  throw appError("INVALID_INPUT", `Rich text: ${message}`);
}

function sanitizeMarks(marks: unknown): RichMark[] | undefined {
  if (marks === undefined) return undefined;
  if (!Array.isArray(marks)) fail("invalid marks.");
  const clean: RichMark[] = [];
  for (const mark of marks as Array<{ type?: unknown; attrs?: { href?: unknown } }>) {
    if (mark?.type === "bold" || mark?.type === "italic") {
      clean.push({ type: mark.type });
    } else if (mark?.type === "link") {
      const href = typeof mark.attrs?.href === "string" ? mark.attrs.href.trim() : "";
      if (!isAllowedHref(href)) fail(`link "${href.slice(0, 40)}" is not allowed.`);
      clean.push({ type: "link", attrs: { href } });
    } else {
      fail(`mark "${String(mark?.type)}" is not allowed.`);
    }
  }
  return clean.length ? clean : undefined;
}

function sanitizeNode(node: unknown, parent: string, depth: number): RichNode {
  if (depth > RICH_TEXT_LIMITS.maxDepth) fail("too deeply nested.");
  if (!node || typeof node !== "object") fail("invalid node.");
  const { type, attrs, content, marks, text } = node as RichNode;
  if (typeof type !== "string" || !BLOCK_CHILDREN[parent]?.includes(type)) {
    fail(`"${String(type)}" is not allowed in "${parent}".`);
  }
  if (type === "text") {
    if (typeof text !== "string" || text.length === 0) fail("empty text node.");
    const cleanMarks = sanitizeMarks(marks);
    return cleanMarks ? { type, text, marks: cleanMarks } : { type, text };
  }
  if (marks !== undefined && (!Array.isArray(marks) || marks.length > 0)) fail(`"${type}" can't have marks.`);

  const out: RichNode = { type };
  if (type === "heading") {
    const level = attrs?.level;
    if (level !== 2 && level !== 3) fail("headings must be level 2 or 3.");
    out.attrs = { level };
  } else if (type === "orderedList") {
    const start = attrs?.start;
    if (typeof start === "number" && Number.isInteger(start) && start > 1 && start < 10000) out.attrs = { start };
  } else if (type === "mediaImage") {
    const mediaId = attrs?.mediaId;
    if (typeof mediaId !== "string" || !/^[a-z0-9]{10,64}$/.test(mediaId)) fail("images must come from the library.");
    out.attrs = { mediaId };
  }
  if (content !== undefined) {
    if (!Array.isArray(content)) fail("invalid content.");
    if (BLOCK_CHILDREN[type].length === 0 && content.length > 0) fail(`"${type}" can't have content.`);
    const children = content.map((child) => sanitizeNode(child, type, depth + 1));
    if (children.length) out.content = children;
  }
  return out;
}

/** Returns the doc keeping only what is allowed, or throws INVALID_INPUT. */
export function sanitizeRichText(doc: RichDoc): RichDoc {
  if (JSON.stringify(doc).length > RICH_TEXT_LIMITS.maxJsonLength) fail("the text is too long.");
  if (doc?.type !== "doc") fail("not a document.");
  const content = (doc.content ?? []).map((node) => sanitizeNode(node, "doc", 1));
  return { type: "doc", content };
}

function walk(nodes: readonly RichNode[] | undefined, visit: (node: RichNode) => void) {
  for (const node of nodes ?? []) {
    visit(node);
    walk(node.content, visit);
  }
}

/** Library images used in the doc, for setMediaUsages. */
export function richTextMediaIds(doc: RichDoc): Id<"media">[] {
  const ids = new Set<string>();
  walk(doc.content, (node) => {
    if (node.type === "mediaImage" && typeof node.attrs?.mediaId === "string") ids.add(node.attrs.mediaId);
  });
  return [...ids] as Id<"media">[];
}

/** The doc's text, blocks separated by newlines. */
export function plainText(doc: RichDoc): string {
  const blocks: string[] = [];
  const textOf = (node: RichNode): string =>
    node.type === "text" ? (node.text ?? "") : node.type === "hardBreak" ? " " : (node.content ?? []).map(textOf).join("");
  walk(doc.content, (node) => {
    if (node.type === "paragraph" || node.type === "heading") blocks.push(textOf(node));
  });
  return blocks.join("\n").trim();
}

export function isEmptyDoc(doc: RichDoc) {
  return plainText(doc) === "" && richTextMediaIds(doc).length === 0;
}

/** Minutes to read at ~200 words per minute (at least 1). */
export function readingMinutes(doc: RichDoc): number {
  const words = plainText(doc).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
