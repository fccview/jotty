import {
  BrainEdgeKinds,
  SUGGESTION_HUB_LIMIT,
  SUGGESTIONS_MAX,
  SUGGESTIONS_PER_ITEM,
} from "@/app/_consts/relations";
import type { BrainEdge } from "@/app/_types/relations";

const _pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

const _neighbours = (edges: BrainEdge[]): Map<string, Set<string>> => {
  const map = new Map<string, Set<string>>();
  const add = (from: string, to: string) => {
    if (!map.has(from)) map.set(from, new Set());
    map.get(from)!.add(to);
  };
  edges.forEach((edge) => {
    add(edge.source, edge.target);
    add(edge.target, edge.source);
  });
  return map;
};

export const suggestEdges = (edges: BrainEdge[], items: Set<string>): BrainEdge[] => {
  const neighbours = _neighbours(edges);
  const linked = new Set(edges.map((edge) => _pairKey(edge.source, edge.target)));
  const scores = new Map<string, number>();

  neighbours.forEach((around) => {
    if (around.size < 2 || around.size > SUGGESTION_HUB_LIMIT) return;
    const weight = 1 / Math.log(1 + around.size);
    const members = Array.from(around).filter((id) => items.has(id));

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const key = _pairKey(members[i], members[j]);
        if (linked.has(key)) continue;
        scores.set(key, (scores.get(key) || 0) + weight);
      }
    }
  });

  const ranked = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
  const top = ranked[0]?.[1] || 1;
  const perItem = new Map<string, number>();
  const picked: BrainEdge[] = [];

  for (const [key, score] of ranked) {
    if (picked.length >= SUGGESTIONS_MAX) break;
    const [source, target] = key.split("|");
    if ((perItem.get(source) || 0) >= SUGGESTIONS_PER_ITEM) continue;
    if ((perItem.get(target) || 0) >= SUGGESTIONS_PER_ITEM) continue;

    perItem.set(source, (perItem.get(source) || 0) + 1);
    perItem.set(target, (perItem.get(target) || 0) + 1);
    picked.push({
      source,
      target,
      kind: BrainEdgeKinds.SUGGESTED,
      weight: Math.round((score / top) * 100) / 100,
    });
  }

  return picked;
};
