import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import type { Root } from "hast";
import { visit } from "unist-util-visit";
import { CONTEXT_START, remarkRawFallback } from "./raw";
import { remarkTags } from "./tags";
import { diagramRule } from "./hast/diagrams";
import { imageRule, unwrapImageRule } from "./hast/media";
import { styleRule } from "./hast/styles";
import { internalLinkRule } from "./hast/links";
import { calloutRule } from "./hast/callouts";
import { codeTextRule, mermaidRule } from "./hast/code";
import { splitTaskLists } from "./hast/tasks";
import { dropBreakNewlines, emptyParagraph, splitSoftBreaks } from "./hast/paragraphs";
import { isElement, type HastChild, type HastParent, type HastRule } from "./hast/types";

const RULES: HastRule[] = [
  diagramRule,
  imageRule,
  unwrapImageRule,
  styleRule,
  internalLinkRule,
  calloutRule,
  codeTextRule,
  mermaidRule,
  { element: emptyParagraph },
];

const rehypeEditor = () => (tree: Root) => {
  visit(tree, (node, _index, parent) => {
    const child = node as HastChild;
    if (child.type === "comment") {
      RULES.forEach((rule) => rule.comment?.(child as never));
      return;
    }
    if (isElement(child)) {
      RULES.forEach((rule) => rule.element?.(child, parent as HastParent | undefined));
    }
  });

  visit(tree, (node) => {
    if (node.type === "root" || isElement(node)) splitTaskLists(node as HastParent);
  });

  visit(tree, (node) => {
    if (!isElement(node) || node.tagName === "pre" || node.tagName === "code") return;
    dropBreakNewlines(node);
    splitSoftBreaks(node);
  });
};

const editorProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkTags)
  .use(remarkRawFallback)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeEditor)
  .use(rehypeStringify);

export const markdownToEditorHtml = (markdown: string, definitions = ""): string => {
  if (!markdown) return "";
  if (!definitions) return String(editorProcessor.processSync(markdown));
  return String(
    editorProcessor.processSync({
      value: `${markdown}\n\n${definitions}`,
      data: { [CONTEXT_START]: markdown.length },
    }),
  );
};
