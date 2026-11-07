import type { Node as PmNode } from "@tiptap/pm/model";
import { Transform } from "@tiptap/pm/transform";
import { TAG_BOUNDARY, TAG_PATTERN } from "./parse/tags";
import { MarkName, NodeName } from "./serialize/types";

export interface TagWord {
  from: number;
  to: number;
  tag: string;
  ready: boolean;
}

export const TAG_WORD = new RegExp(`(^|${TAG_BOUNDARY.source})${TAG_PATTERN.source}`, "g");
const LEAF = "\ufffc";
const LINE_BREAK = "\n";
const WORD_CHAR = new RegExp("[\\p{L}\\p{N}\\p{M}]", "u");
const NESTING = "/";
const EMPTY_LEVEL = "//";

const _ready = (tag: string, next = "") =>
  !WORD_CHAR.test(next) && !tag.endsWith(NESTING) && !tag.includes(EMPTY_LEVEL);

const _guarded = (doc: PmNode, word: TagWord) => {
  let guarded = false;
  doc.nodesBetween(word.from, word.to, (node) => {
    guarded ||= node.marks.some((mark) => mark.type.spec.code || mark.type.name === MarkName.Link);
  });
  return guarded;
};

const _leafText = (leaf: PmNode) => (leaf.type.name === NodeName.HardBreak ? LINE_BREAK : LEAF);

const _wordsIn = (block: PmNode, start: number): TagWord[] => {
  if (!block.isTextblock || block.type.spec.code) return [];
  const text = block.textBetween(0, block.content.size, undefined, _leafText);
  return Array.from(text.matchAll(TAG_WORD), (match) => {
    const at = match.index + match[1].length;
    const end = at + 1 + match[2].length;
    return { from: start + at, to: start + end, tag: match[2], ready: _ready(match[2], text[end]) };
  });
};

export const plainTagCount = (doc: PmNode, tag: string): number => {
  let count = 0;
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    count += _wordsIn(node, pos + 1).filter((word) => word.tag === tag && !_guarded(doc, word)).length;
    return false;
  });
  return count;
};

export const tagWordAt = (doc: PmNode, pos: number, exact = false): TagWord | null => {
  const $pos = doc.resolve(pos);
  const word = _wordsIn($pos.parent, $pos.start()).find((found) =>
    exact ? found.from === pos : found.from < pos && pos <= found.to,
  );
  return word && !_guarded(doc, word) ? word : null;
};

export const tagged = <T extends Transform>(tr: T, word: TagWord): T => {
  const type = tr.doc.type.schema.nodes[NodeName.TagLink];
  const marks = tr.doc.nodeAt(word.from)?.marks;
  return tr.replaceWith(word.from, word.to, type.create({ tag: word.tag }, null, marks));
};

export const taggedDoc = (doc: PmNode) => {
  const words: TagWord[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    words.push(..._wordsIn(node, pos + 1).filter((word) => word.ready && !_guarded(doc, word)));
    return false;
  });
  return words.reverse().reduce((tr, word) => tagged(tr, word), new Transform(doc)).doc;
};
