import { findAndReplace, type RegExpMatchObject } from "mdast-util-find-and-replace";
import type { Break, Root } from "mdast";
import { matchCallout } from "@/app/_utils/callout-utils";

const SOFT_BREAK = /\r?\n|\r/g;

const endsCalloutMarker = ({ index, input, stack }: RegExpMatchObject) => {
  const [quote, paragraph, text] = stack.slice(-3);
  if (quote?.type !== "blockquote" || paragraph?.type !== "paragraph") return false;
  if (quote.children[0] !== paragraph || paragraph.children[0] !== text) return false;
  const lead = input.slice(0, index);
  return matchCallout(lead)?.marker === lead;
};

export const remarkSoftBreaks = () => (tree: Root) => {
  findAndReplace(tree, [
    SOFT_BREAK,
    (_value: string, match: RegExpMatchObject): Break | false => endsCalloutMarker(match) ? false : { type: "break" },
  ]);
};
