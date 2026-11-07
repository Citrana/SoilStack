import { Fragment, type ReactNode } from "react";
import Image from "next/image";
import type { PublicImage } from "../../../convex/lib/media";
import type { RichDoc, RichMark, RichNode } from "../../../convex/lib/richText";
import type { Locale } from "@/i18n/routing";
import { t } from "./sections/text";

/**
 * Renders sanitized rich text (convex/lib/richText.ts) as semantic HTML.
 * Our own small renderer: no TipTap on the public site and never raw HTML.
 * Free of server-only APIs, so the admin preview reuses it.
 */
export function RichText({ doc, images, locale }: { doc: RichDoc; images: Record<string, PublicImage>; locale: Locale }) {
  return <div className="rich-text">{renderNodes(doc.content, images, locale)}</div>;
}

function renderNodes(nodes: RichNode[] | undefined, images: Record<string, PublicImage>, locale: Locale): ReactNode[] {
  return (nodes ?? []).map((node, i) => renderNode(node, i, images, locale));
}

function withMarks(text: string, marks: RichMark[] | undefined, key: number): ReactNode {
  let out: ReactNode = text;
  for (const mark of marks ?? []) {
    if (mark.type === "bold") out = <strong>{out}</strong>;
    else if (mark.type === "italic") out = <em>{out}</em>;
    else if (mark.type === "link" && mark.attrs?.href) {
      const href = mark.attrs.href;
      out = href.startsWith("/") ? (
        // Site paths are written with their locale already (e.g. /fr/contact).
        <a href={href}>{out}</a>
      ) : (
        <a href={href} {...(href.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {out}
        </a>
      );
    }
  }
  return <Fragment key={key}>{out}</Fragment>;
}

function renderNode(node: RichNode, key: number, images: Record<string, PublicImage>, locale: Locale): ReactNode {
  const children = () => renderNodes(node.content, images, locale);
  switch (node.type) {
    case "paragraph":
      return node.content?.length ? <p key={key}>{children()}</p> : null;
    case "heading":
      return node.attrs?.level === 3 ? <h3 key={key}>{children()}</h3> : <h2 key={key}>{children()}</h2>;
    case "bulletList":
      return <ul key={key}>{children()}</ul>;
    case "orderedList":
      return (
        <ol key={key} start={typeof node.attrs?.start === "number" ? node.attrs.start : undefined}>
          {children()}
        </ol>
      );
    case "listItem":
      return <li key={key}>{children()}</li>;
    case "blockquote":
      return <blockquote key={key}>{children()}</blockquote>;
    case "horizontalRule":
      return <hr key={key} />;
    case "hardBreak":
      return <br key={key} />;
    case "text":
      return withMarks(node.text ?? "", node.marks, key);
    case "mediaImage": {
      const image = images[String(node.attrs?.mediaId)];
      if (!image) return null;
      const alt = t(image.alt, locale);
      return (
        <figure key={key}>
          <Image
            src={image.url}
            alt={alt}
            width={image.width}
            height={image.height}
            sizes="(min-width: 768px) 720px, 100vw"
            placeholder="blur"
            blurDataURL={image.blurDataUrl}
            className="h-auto w-full rounded-2xl"
          />
          {alt ? <figcaption>{alt}</figcaption> : null}
        </figure>
      );
    }
    default:
      return null;
  }
}

