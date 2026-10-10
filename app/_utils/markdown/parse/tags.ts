import type { Root } from "mdast";
import { findAndReplace, type RegExpMatchObject } from "mdast-util-find-and-replace";

export const TAG_PATTERN = /#([a-zA-Z][a-zA-Z0-9_/-]*)/g;
const TAG_BOUNDARY = /[\s(]/;

export const tagHtml = (tag: string) => `<span data-tag="${tag}">${tag}</span>`;

export const remarkTags = () => (tree: Root) => {
  findAndReplace(tree, [
    [
      TAG_PATTERN,
      (_match: string, tag: string, found: RegExpMatchObject) => {
        const before = found.input[found.index - 1];
        if (before !== undefined && !TAG_BOUNDARY.test(before)) return false;
        return { type: "html", value: tagHtml(tag) };
      },
    ],
  ], { ignore: ["link", "linkReference", "inlineCode", "code", "html"] });
};
