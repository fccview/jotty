import { findAndReplace, type RegExpMatchObject } from "mdast-util-find-and-replace";
import type { Root } from "mdast";
import { WIKI_EMBED_MARK, WIKILINK_REGEX } from "@/app/_consts/relations";

export const WIKILINK_TAG = "wiki-link";

export const remarkWikilinks = () => (tree: Root) => {
  findAndReplace(tree, [
    [
      new RegExp(WIKILINK_REGEX.source, "g"),
      (_match: string, target: string, alias: string | undefined, found: RegExpMatchObject) => {
        if (found.input[found.index - 1] === WIKI_EMBED_MARK) return false;
        const label = alias?.trim() || undefined;
        return {
          type: "text",
          value: label || target.trim(),
          data: {
            hName: WIKILINK_TAG,
            hProperties: { target: target.trim(), ...(label ? { label } : {}) },
          },
        };
      },
    ],
  ]);
};
