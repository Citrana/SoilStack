"use client";

import { useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { PublicImage } from "../../../../convex/lib/media";
import { isAllowedHref, type RichDoc } from "../../../../convex/lib/richText";
import { MediaPicker } from "@/components/admin/media-picker";
import { cn } from "@/lib/utils";
import { EditorImagesContext, MediaImage } from "./media-image-node";

/** Only what the server allow-list accepts (convex/lib/richText.ts). */
const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    code: false,
    codeBlock: false,
    strike: false,
    underline: false,
    link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
  }),
  MediaImage,
];

function ToolButton({ icon: Icon, label, active, disabled, onClick }: { icon: LucideIcon; label: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 md:size-8",
        active && "bg-lime-tint text-forest",
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}

function Toolbar({ editor, onImage }: { editor: Editor; onImage: () => void }) {
  const t = useTranslations("RichText");
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      link: e.isActive("link"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  function setLink() {
    const current = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt(t("linkPrompt"), current ?? "https://");
    if (href === null) return;
    if (href.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    if (!isAllowedHref(href.trim())) {
      toast.error(t("linkInvalid"));
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  }

  const chain = () => editor.chain().focus();
  return (
    <div role="toolbar" aria-label={t("toolbar")} className="sticky top-14 z-10 flex flex-wrap gap-0.5 border-b bg-card p-1 md:top-0">
      <ToolButton icon={Bold} label={t("bold")} active={state.bold} onClick={() => chain().toggleBold().run()} />
      <ToolButton icon={Italic} label={t("italic")} active={state.italic} onClick={() => chain().toggleItalic().run()} />
      <ToolButton icon={Heading2} label={t("heading2")} active={state.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()} />
      <ToolButton icon={Heading3} label={t("heading3")} active={state.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()} />
      <ToolButton icon={List} label={t("bulletList")} active={state.bullet} onClick={() => chain().toggleBulletList().run()} />
      <ToolButton icon={ListOrdered} label={t("orderedList")} active={state.ordered} onClick={() => chain().toggleOrderedList().run()} />
      <ToolButton icon={Quote} label={t("quote")} active={state.quote} onClick={() => chain().toggleBlockquote().run()} />
      <ToolButton icon={Minus} label={t("separator")} onClick={() => chain().setHorizontalRule().run()} />
      <ToolButton icon={Link2} label={t("link")} active={state.link} onClick={setLink} />
      <ToolButton icon={ImagePlus} label={t("image")} onClick={onImage} />
      <span className="mx-1 w-px self-stretch bg-border" aria-hidden />
      <ToolButton icon={Undo2} label={t("undo")} disabled={!state.canUndo} onClick={() => chain().undo().run()} />
      <ToolButton icon={Redo2} label={t("redo")} disabled={!state.canRedo} onClick={() => chain().redo().run()} />
    </div>
  );
}

/** TipTap editor for one language of a post body. Loaded in the admin only. */
export function RichTextEditor({
  value,
  onChange,
  images,
  label,
  lang,
}: {
  value: RichDoc;
  onChange: (doc: RichDoc) => void;
  images: Record<string, PublicImage>;
  label: string;
  lang: "fr" | "en";
}) {
  const [picking, setPicking] = useState(false);
  const editor = useEditor({
    extensions,
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "rich-text min-h-72 px-4 py-4 outline-none",
        "aria-label": label,
        lang,
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getJSON() as RichDoc),
  });

  return (
    <EditorImagesContext.Provider value={images}>
      <div className="overflow-hidden rounded-xl border bg-card focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
        {editor ? <Toolbar editor={editor} onImage={() => setPicking(true)} /> : null}
        <EditorContent editor={editor} />
      </div>
      <MediaPicker
        open={picking}
        onOpenChange={setPicking}
        onPick={(mediaId) => editor?.chain().focus().insertContent({ type: "mediaImage", attrs: { mediaId } }).run()}
      />
    </EditorImagesContext.Provider>
  );
}
