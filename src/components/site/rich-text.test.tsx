// @vitest-environment node
import { expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RichText } from "./rich-text";
import type { RichDoc } from "../../../convex/lib/richText";

test("RichText renders allowed nodes as semantic HTML with safe links", () => {
  const doc: RichDoc = {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Titre" }] },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "gras", marks: [{ type: "bold" }] },
          { type: "text", text: "lien", marks: [{ type: "link", attrs: { href: "https://soilstack.cd" } }] },
          { type: "text", text: "interne", marks: [{ type: "link", attrs: { href: "/fr/contact" } }] },
        ],
      },
      { type: "orderedList", attrs: { start: 3 }, content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "trois" }] }] }] },
      { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "cité" }] }] },
      { type: "paragraph" },
      { type: "mediaImage", attrs: { mediaId: "missing" } },
    ],
  };
  const html = renderToStaticMarkup(<RichText doc={doc} images={{}} locale="fr" />);
  expect(html).toContain("<h2>Titre</h2>");
  expect(html).toContain("<strong>gras</strong>");
  expect(html).toContain('<a href="https://soilstack.cd" target="_blank" rel="noopener noreferrer">lien</a>');
  expect(html).toContain('<a href="/fr/contact">interne</a>');
  expect(html).toContain('<ol start="3">');
  expect(html).toContain("<blockquote>");
  expect(html).not.toContain("<p></p>");
  expect(html).not.toContain("figure");
});
