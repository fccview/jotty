import { Extension } from "@tiptap/core";
import { NodeSelection, Plugin, PluginKey, TextSelection, type Transaction } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

const ENTER_KEY = "Enter";

interface AtomGuardOptions {
  types: string[];
}

const guardedSelection = (view: EditorView, guarded: Set<string>) => {
  const { selection } = view.state;
  if (!(selection instanceof NodeSelection)) return null;
  return guarded.has(selection.node.type.name) ? selection : null;
};

const caretPastAtom = (view: EditorView, selection: NodeSelection): Transaction => {
  const { tr, schema } = view.state;
  const after = selection.to;
  if (selection.node.isInline) return tr.setSelection(TextSelection.create(tr.doc, after));
  tr.insert(after, schema.nodes.paragraph.create());
  return tr.setSelection(TextSelection.create(tr.doc, after + 1));
};

export const atomGuardKey = new PluginKey("atomGuard");

export const AtomGuard = Extension.create<AtomGuardOptions>({
  name: "atomGuard",
  priority: 1000,

  addOptions: () => ({ types: [] }),

  addProseMirrorPlugins() {
    const guarded = new Set(this.options.types);
    return [
      new Plugin({
        key: atomGuardKey,
        props: {
          handleTextInput: (view, _from, _to, text) => {
            const selection = guardedSelection(view, guarded);
            if (!selection) return false;
            const tr = caretPastAtom(view, selection);
            view.dispatch(tr.insertText(text).scrollIntoView());
            return true;
          },
          handleKeyDown: (view, event) => {
            if (event.key !== ENTER_KEY || event.isComposing) return false;
            const selection = guardedSelection(view, guarded);
            if (!selection) return false;
            const tr = caretPastAtom(view, selection);
            view.dispatch(tr.scrollIntoView());
            return !selection.node.isInline;
          },
        },
      }),
    ];
  },
});
