import { MERMAID_LANGUAGE, PLAIN_CODE_LANGUAGE } from "@/app/_utils/markdown/consts";
import { DiagramKind, writeDiagramComment } from "@/app/_utils/markdown/diagram-comment";
import { NodeName, type BlockWriter, type NodeJson } from "./types";

const textContent = (node: NodeJson): string =>
  node.text ?? (node.content || []).map(textContent).join("");

export const fence = (body: string, info = "") => {
  const longest = Math.max(2, ...(body.match(/^`+/gm) || []).map((run) => run.length));
  const marks = "`".repeat(longest + 1);
  return `${marks}${info}\n${body}\n${marks}`;
};

export const codeBlock: BlockWriter = (node) => {
  const language = String(node.attrs?.language || "");
  return fence(textContent(node), language === PLAIN_CODE_LANGUAGE ? "" : language);
};

export const mermaid: BlockWriter = (node) => fence(String(node.attrs?.content || ""), MERMAID_LANGUAGE);

const diagram = (kind: DiagramKind): BlockWriter => (node) =>
  writeDiagramComment(kind, node.attrs || {});

export const CODE_BLOCKS = {
  [NodeName.CodeBlock]: codeBlock,
  [NodeName.Mermaid]: mermaid,
  [NodeName.Drawio]: diagram(DiagramKind.Drawio),
  [NodeName.Excalidraw]: diagram(DiagramKind.Excalidraw),
};
