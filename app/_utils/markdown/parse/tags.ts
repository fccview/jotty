import type { Parent, Root, Text } from "mdast";
import { findAndReplace, type RegExpMatchObject } from "mdast-util-find-and-replace";

export const TAG_PATTERN = /#([a-zA-Z][a-zA-Z0-9_/-]*)/g;
const TAG_BOUNDARY = /[\s(]/;
const ESCAPE = "\\";
const SPACED_SIBLINGS = new Set(["break", "html", "inlineCode"]);

interface SourceFile {
  value?: unknown;
}

export const tagHtml = (tag: string) => `<span data-tag="${tag}">${tag}</span>`;

const _gluedToSibling = (found: RegExpMatchObject): boolean => {
  const node = found.stack[found.stack.length - 1] as Text;
  const siblings = (found.stack[found.stack.length - 2] as Parent | undefined)?.children ?? [];
  const previous = siblings[siblings.indexOf(node) - 1];
  return Boolean(previous && !SPACED_SIBLINGS.has(previous.type));
};

const _escapedInSource = (found: RegExpMatchObject, tag: string, file?: SourceFile): boolean => {
  const { start, end } = found.stack[found.stack.length - 1].position ?? {};
  if (typeof file?.value !== "string" || start?.offset === undefined || end?.offset === undefined) {
    return false;
  }
  const source = file.value.slice(start.offset, end.offset);
  const needle = `#${tag}`;
  const nth = found.input.slice(0, found.index).split(needle).length - 1;
  let at = -1;
  for (let seen = 0; seen <= nth; seen++) {
    at = source.indexOf(needle, at + 1);
    if (at < 0) return false;
  }
  return source[at - 1] === ESCAPE;
};

export const remarkTags = () => (tree: Root, file?: SourceFile) => {
  findAndReplace(tree, [
    [
      TAG_PATTERN,
      (_match: string, tag: string, found: RegExpMatchObject) => {
        const before = found.input[found.index - 1];
        if (before !== undefined && !TAG_BOUNDARY.test(before)) return false;
        if (before === undefined && _gluedToSibling(found)) return false;
        if (_escapedInSource(found, tag, file)) return false;
        return { type: "html", value: tagHtml(tag) };
      },
    ],
  ], { ignore: ["link", "linkReference", "inlineCode", "code", "html"] });
};
