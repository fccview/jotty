import { findAndReplace } from "mdast-util-find-and-replace";
import type { Break, Root } from "mdast";

const SOFT_BREAK = /\r?\n|\r/g;

export const remarkSoftBreaks = () => (tree: Root) => {
  findAndReplace(tree, [SOFT_BREAK, (): Break => ({ type: "break" })]);
};
