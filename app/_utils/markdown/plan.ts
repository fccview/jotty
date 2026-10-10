import { NodeName, type NodeJson } from "./serialize/types";

export interface SnapshotSegment {
  src: string;
  gap: string;
  keys: string[];
}

export interface MarkdownSnapshot {
  source: string;
  head: string;
  tail: string;
  segments: SnapshotSegment[];
  legacyHtml?: boolean;
}

export const keyOf = (node: NodeJson) => JSON.stringify(node);

const EMPTY_PARAGRAPH_KEY = keyOf({ type: NodeName.Paragraph });

export const trailingEmptyKeys = (snapshot: MarkdownSnapshot | null) => {
  let count = 0;
  const segments = snapshot?.segments ?? [];
  for (let index = segments.length - 1; index >= 0; index--) {
    const { keys } = segments[index];
    if (!keys.length || !keys.every((key) => key === EMPTY_PARAGRAPH_KEY)) break;
    count += keys.length;
  }
  return count;
};

const matchesAt = (keys: string[], children: string[], at: number) =>
  keys.length > 0 && keys.every((key, offset) => children[at + offset] === key);

interface Step {
  index: number;
  segment?: number;
  span: number;
}

export const planPieces = (keys: string[], segments: SnapshotSegment[]) => {
  const steps: Step[] = [];
  let cursor = 0;
  for (let index = 0; index < keys.length; index++) {
    let found = -1;
    for (let candidate = cursor; candidate < segments.length; candidate++) {
      if (matchesAt(segments[candidate].keys, keys, index)) {
        found = candidate;
        break;
      }
    }
    if (found === -1) {
      steps.push({ index, span: 1 });
      continue;
    }
    const span = segments[found].keys.length;
    steps.push({ index, segment: found, span });
    index += span - 1;
    cursor = found + 1;
  }
  return steps;
};
