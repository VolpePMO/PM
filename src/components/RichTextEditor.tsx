import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { marked } from "marked";
import TurndownService from "turndown";
import { Button } from "@/components/ui/button";

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});
turndown.addRule("underline", {
  filter: ["u"],
  replacement: (content) => `<u>${content}</u>`,
});

export function markdownToHtml(markdown: string) {
  return marked.parse(markdown ?? "", { async: false }) as string;
}

export function htmlToMarkdown(html: string) {
  return turndown.turndown(html ?? "").trim();
}

type Props = {
  /** Conteúdo em Markdown. */
  value: string;
  onChange: (markdown: string) => void;
};

/** Editor rich text que lê e grava Markdown. */
export function RichTextEditor({ value, onChange }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: false }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: markdownToHtml(value),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-72 rounded-md border bg-background p-4 focus:outline-none [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:font-medium [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-5 [&_p]:mt-2 [&_a]:underline",
      },
    },
    onUpdate: ({ editor }) => onChange(htmlToMarkdown(editor.getHTML())),
  });

  useEffect(() => {
    return () => editor?.destroy();
  }, [editor]);

  if (!editor) return null;

  const tool = (label: string, active: boolean, run: () => void, title: string) => (
    <Button
      key={title}
      type="button"
      size="sm"
      variant={active ? "secondary" : "ghost"}
      className="h-8 px-2 text-xs"
      title={title}
      onClick={run}
    >
      {label}
    </Button>
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 rounded-md border bg-muted/40 p-1">
        {tool(
          "B",
          editor.isActive("bold"),
          () => editor.chain().focus().toggleBold().run(),
          "Negrito",
        )}
        {tool(
          "I",
          editor.isActive("italic"),
          () => editor.chain().focus().toggleItalic().run(),
          "Itálico",
        )}
        {tool(
          "U",
          editor.isActive("underline"),
          () => editor.chain().focus().toggleUnderline().run(),
          "Sublinhado",
        )}
        {tool(
          "H2",
          editor.isActive("heading", { level: 2 }),
          () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          "Título",
        )}
        {tool(
          "H3",
          editor.isActive("heading", { level: 3 }),
          () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
          "Subtítulo",
        )}
        {tool(
          "• Lista",
          editor.isActive("bulletList"),
          () => editor.chain().focus().toggleBulletList().run(),
          "Lista com marcadores",
        )}
        {tool(
          "1. Lista",
          editor.isActive("orderedList"),
          () => editor.chain().focus().toggleOrderedList().run(),
          "Lista numerada",
        )}
        {tool(
          "Link",
          editor.isActive("link"),
          () => {
            const previous = (editor.getAttributes("link")["href"] as string) ?? "";
            const url = window.prompt("URL do link", previous);
            if (url === null) return;
            if (url === "") editor.chain().focus().unsetLink().run();
            else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          },
          "Link",
        )}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
