"use client";

import { createContext, useContext } from "react";
import { mergeAttributes, Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import type { PublicImage } from "../../../../convex/lib/media";

/** Image URLs for the editor, keyed by media id (resolved by the page). */
export const EditorImagesContext = createContext<Record<string, PublicImage>>({});

function MediaImageView({ node, selected }: NodeViewProps) {
  const images = useContext(EditorImagesContext);
  const image = images[String(node.attrs.mediaId)];
  return (
    <NodeViewWrapper className={`my-3 overflow-hidden rounded-xl ${selected ? "ring-3 ring-leaf" : ""}`} data-drag-handle>
      {image ? (
        // Admin editor preview of a library image.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.url} alt="" className="h-auto w-full" />
      ) : (
        <div className="flex aspect-[16/9] items-center justify-center bg-muted text-sm text-muted-foreground">…</div>
      )}
    </NodeViewWrapper>
  );
}

/**
 * A library image inside rich text. Stores only `mediaId` (never a URL):
 * the server checks it exists and protects it from deletion
 * (convex/lib/richText.ts, setMediaUsages).
 */
export const MediaImage = Node.create({
  name: "mediaImage",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return { mediaId: { default: null } };
  },
  parseHTML() {
    return [{ tag: "figure[data-media-id]", getAttrs: (el) => ({ mediaId: (el as HTMLElement).dataset.mediaId }) }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["figure", mergeAttributes({ "data-media-id": HTMLAttributes.mediaId })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(MediaImageView);
  },
});
