import { useCallback, useRef } from "react";
import type { Editor, JSONContent } from "@tiptap/react";
import { loadMarkdown, type MarkdownSnapshot } from "@/app/_utils/markdown/session";
import { docToMarkdown, htmlToNodes } from "@/app/_utils/markdown/editor-bridge";
import { typedTagDoc } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/TagInput";
import type { TableSyntax } from "@/app/_types";

export const useMarkdownSync = (tableSyntax?: TableSyntax) => {
  const snapshot = useRef<MarkdownSnapshot | null>(null);

  const parse = useCallback((editor: Editor, markdown: string) => {
    const loaded = loadMarkdown(markdown, htmlToNodes(editor.schema));
    snapshot.current = loaded.snapshot;
    return loaded.doc as JSONContent;
  }, []);

  const show = useCallback(
    (editor: Editor, markdown: string) => {
      editor.commands.setContent(parse(editor, markdown), { emitUpdate: false });
    },
    [parse],
  );

  const read = useCallback(
    (editor: Editor) => docToMarkdown(typedTagDoc(editor.state), snapshot.current, tableSyntax),
    [tableSyntax],
  );

  return { parse, show, read };
};
