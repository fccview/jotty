import { findAndReplace } from "mdast-util-find-and-replace";
import type { Root } from "mdast";
import { WIKILINK_REGEX } from "@/app/_consts/relations";

export const WIKILINK_TAG = "wiki-link";

export const remarkWikilinks = () => (tree: Root) => {
  findAndReplace(tree, [
    [
      new RegExp(WIKILINK_REGEX.source, "g"),
      (_match: string, target: string, alias?: string) => {
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
