import { Extension, PasteRule, getChangedRanges } from "@tiptap/core";
import { isChangeOrigin } from "@tiptap/extension-collaboration";
import { isHistoryTransaction } from "@tiptap/pm/history";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { pastedMarkdown } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/MarkdownPaste";
import { TAG_WORD, tagWordAt, tagged } from "@/app/_utils/markdown/tag-words";

const COMPOSITION = "composition";
const UI_EVENT = "uiEvent";
const APPENDED = "appendedTransaction";
const PREVENT_UPDATE = "preventUpdate";

export const tagInputKey = new PluginKey<number | null>("tagInput");

const _typed = (tr: Transaction) =>
  tr.docChanged &&
  !tr.getMeta(UI_EVENT) &&
  !tr.getMeta(APPENDED) &&
  !isHistoryTransaction(tr);

const _touches = (tr: Transaction, pos: number) =>
  getChangedRanges(tr).some(({ newRange }) => newRange.from <= pos && pos <= newRange.to);

const _fresh = (tr: Transaction, old: EditorState, from: number) =>
  !tagWordAt(old.doc, tr.mapping.invert().map(from, -1), true);

const _nextPending = (tr: Transaction, pending: number | null, old: EditorState, state: EditorState) => {
  if (tr.getMeta(tagInputKey) || tr.getMeta(PREVENT_UPDATE) !== undefined) return null;
  const { selection } = state;
  const caret = selection.empty ? selection.from : null;
  if (isChangeOrigin(tr)) {
    return pending === null || caret === null ? null : tagWordAt(state.doc, caret)?.from ?? null;
  }
  const mapped = pending === null ? null : tr.mapping.mapResult(pending, 1);
  const kept = mapped && !mapped.deleted && tagWordAt(state.doc, mapped.pos, true) ? mapped.pos : null;
  if (caret !== null && tr.docChanged && isHistoryTransaction(tr)) {
    const word = tagWordAt(state.doc, caret);
    if (word && _fresh(tr, old, word.from)) return word.from;
  }
  if (caret !== null && _typed(tr) && _touches(tr, caret)) {
    const word = tagWordAt(state.doc, caret);
    if (word && (word.from === kept || _fresh(tr, old, word.from))) return word.from;
  }
  return kept;
};

export const typedTagDoc = (state: EditorState) => {
  const pending = tagInputKey.getState(state);
  const word = pending == null ? null : tagWordAt(state.doc, pending, true);
  return word?.ready ? tagged(state.tr, word).doc : state.doc;
};

export const TagInput = Extension.create({
  name: "tagInput",

  addPasteRules() {
    return [
      new PasteRule({
        find: (text) =>
          pastedMarkdown(this.editor.view)
            ? []
            : Array.from(text.matchAll(TAG_WORD), (match) => ({
                index: match.index + match[1].length,
                text: `#${match[2]}`,
              })),
        handler: ({ state, range }) => {
          const word = tagWordAt(state.doc, range.from, true);
          if (word?.ready) tagged(state.tr, word);
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<number | null>({
        key: tagInputKey,
        state: {
          init: () => null,
          apply: (tr, pending, old, state) => _nextPending(tr, pending, old, state),
        },
        appendTransaction: (transactions, _old, state) => {
          const pending = tagInputKey.getState(state);
          if (pending == null || transactions.some((tr) => tr.getMeta(COMPOSITION))) return null;
          const word = tagWordAt(state.doc, pending, true);
          const { from, to } = state.selection;
          if (!word || (from <= word.to && to > word.from)) return null;
          const tr = state.tr.setMeta(tagInputKey, true);
          return word.ready ? tagged(tr, word) : tr;
        },
      }),
    ];
  },
});
