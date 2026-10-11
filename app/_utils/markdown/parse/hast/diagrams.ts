import { diagramElement, readDiagramComment } from "@/app/_utils/markdown/diagram-comment";
import type { HastRule } from "./types";

export const diagramRule: HastRule = {
  comment: (node) => {
    const diagram = readDiagramComment(String(node.value || ""));
    if (!diagram) return;
    const target = node as unknown as Record<string, unknown>;
    delete target.value;
    Object.assign(target, diagramElement(diagram));
  },
};
