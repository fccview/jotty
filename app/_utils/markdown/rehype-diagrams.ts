import type { Root } from "hast";
import { visit } from "unist-util-visit";
import { diagramRule } from "./parse/hast/diagrams";

export const rehypeDiagrams = () => (tree: Root) => {
  visit(tree, "comment", (node) => {
    diagramRule.comment?.(node);
  });
};
