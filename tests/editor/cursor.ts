import type { Editor } from "@tiptap/core";

export const positionOf = (editor: Editor, needle: string) => {
  let found = -1;
  editor.state.doc.descendants((node, pos) => {
    if (found !== -1) return false;
    const index = node.isText ? (node.text ?? "").indexOf(needle) : -1;
    if (index !== -1) found = pos + index;
  });
  if (found === -1) throw new Error(`text "${needle}" is not in the document`);
  return found;
};

export const selectText = (editor: Editor, needle: string) => {
  const from = positionOf(editor, needle);
  editor.commands.setTextSelection({ from, to: from + needle.length });
};

export const caretAfter = (editor: Editor, needle: string) => {
  editor.commands.setTextSelection(positionOf(editor, needle) + needle.length);
};

export const blockRange = (editor: Editor, index: number) => {
  let from = 0;
  for (let child = 0; child < index; child++) from += editor.state.doc.child(child).nodeSize;
  return { from, to: from + editor.state.doc.child(index).nodeSize };
};
