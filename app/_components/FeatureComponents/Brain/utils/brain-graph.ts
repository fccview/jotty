import { BrainEdgeKinds, BrainNodeKinds } from "@/app/_consts/relations";
import type { BrainEdge, BrainGraph, BrainNode } from "@/app/_types/relations";

export enum BrainDimensions {
  THREE_D = "3d",
  TWO_D = "2d",
}

export enum BrainColourModes {
  TYPE = "type",
  CATEGORY = "category",
}

export interface BrainFilters {
  notes: boolean;
  checklists: boolean;
  tags: boolean;
  ghosts: boolean;
  suggestions: boolean;
  orphans: boolean;
}

export interface BrainScope {
  local: boolean;
  depth: number;
}

export interface BrainView {
  nodes: BrainNode[];
  edges: BrainEdge[];
}

export const DEFAULT_FILTERS: BrainFilters = {
  notes: true,
  checklists: true,
  tags: false,
  ghosts: true,
  suggestions: true,
  orphans: true,
};

export const MAX_DEPTH = 3;

const KIND_FILTER: Record<BrainNodeKinds, keyof BrainFilters> = {
  [BrainNodeKinds.NOTE]: "notes",
  [BrainNodeKinds.CHECKLIST]: "checklists",
  [BrainNodeKinds.TAG]: "tags",
  [BrainNodeKinds.GHOST]: "ghosts",
};

export const isItemNode = (node?: BrainNode | null): boolean =>
  node?.kind === BrainNodeKinds.NOTE || node?.kind === BrainNodeKinds.CHECKLIST;

export const neighbourMap = (edges: BrainEdge[], withSuggested = false) => {
  const map = new Map<string, Set<string>>();
  const add = (from: string, to: string) => {
    if (!map.has(from)) map.set(from, new Set());
    map.get(from)!.add(to);
  };
  edges.forEach((edge) => {
    if (!withSuggested && edge.kind === BrainEdgeKinds.SUGGESTED) return;
    add(edge.source, edge.target);
    add(edge.target, edge.source);
  });
  return map;
};

const _within = (
  focus: string,
  neighbours: Map<string, Set<string>>,
  depth: number,
) => {
  const reached = new Set([focus]);
  let frontier = [focus];
  for (let level = 0; level < depth; level++) {
    const next: string[] = [];
    frontier.forEach((id) =>
      neighbours.get(id)?.forEach((other) => {
        if (reached.has(other)) return;
        reached.add(other);
        next.push(other);
      }),
    );
    frontier = next;
  }
  return reached;
};

export const brainView = (
  graph: BrainGraph,
  filters: BrainFilters,
  scope: BrainScope,
  focus: string | null,
): BrainView => {
  const edges = graph.edges.filter(
    (edge) =>
      (filters.suggestions || edge.kind !== BrainEdgeKinds.SUGGESTED) &&
      (filters.tags || edge.kind !== BrainEdgeKinds.TAG),
  );
  const linked = neighbourMap(edges);
  const local =
    scope.local && focus
      ? _within(focus, neighbourMap(edges, true), scope.depth)
      : null;

  const nodes = graph.nodes.filter((node) => {
    if (!filters[KIND_FILTER[node.kind]]) return false;
    if (local && !local.has(node.id)) return false;
    if (!filters.orphans && !linked.has(node.id) && node.id !== focus)
      return false;
    return true;
  });

  const kept = new Set(nodes.map((node) => node.id));
  return {
    nodes,
    edges: edges.filter(
      (edge) => kept.has(edge.source) && kept.has(edge.target),
    ),
  };
};

export const searchNodes = (
  nodes: BrainNode[],
  query: string,
  limit = 8,
): BrainNode[] => {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return nodes
    .filter((node) => node.title.toLowerCase().includes(needle))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, limit);
};

const _hue = (text: string): number => {
  let hash = 0;
  for (let i = 0; i < text.length; i++)
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash % 360;
};

export type Rgb = [number, number, number];

export interface BrainPalette {
  primary: Rgb;
  foreground: Rgb;
  muted: Rgb;
  background: Rgb;
  card: Rgb;
  border: Rgb;
}

export const mix = (from: Rgb, to: Rgb, amount: number): Rgb => [
  Math.round(from[0] + (to[0] - from[0]) * amount),
  Math.round(from[1] + (to[1] - from[1]) * amount),
  Math.round(from[2] + (to[2] - from[2]) * amount),
];

export const rgba = ([r, g, b]: Rgb, alpha = 1): string =>
  `rgba(${r}, ${g}, ${b}, ${alpha})`;

export const hex = ([r, g, b]: Rgb): string =>
  `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;

const _categoryTint = (category: string, palette: BrainPalette): Rgb => {
  const spread = (_hue(category) % 7) / 7;
  return spread < 0.5
    ? mix(palette.primary, palette.foreground, spread * 0.9)
    : mix(palette.primary, palette.background, (spread - 0.5) * 0.9);
};

export const nodeRgb = (
  node: BrainNode,
  mode: BrainColourModes,
  palette: BrainPalette,
): Rgb => {
  if (node.kind === BrainNodeKinds.GHOST) return palette.muted;
  if (node.kind === BrainNodeKinds.TAG)
    return mix(palette.primary, palette.background, 0.45);
  if (mode === BrainColourModes.CATEGORY) {
    return _categoryTint(node.category || node.kind, palette);
  }
  return node.kind === BrainNodeKinds.CHECKLIST
    ? mix(palette.primary, palette.foreground, 0.45)
    : palette.primary;
};

export const nodeColour = (
  node: BrainNode,
  mode: BrainColourModes,
  palette: BrainPalette,
): string => rgba(nodeRgb(node, mode, palette));

export const edgeRgb = (edge: BrainEdge, palette: BrainPalette): Rgb => {
  if (edge.kind === BrainEdgeKinds.SUGGESTED) return palette.muted;
  if (edge.kind === BrainEdgeKinds.TAG) return mix(palette.primary, palette.background, 0.55);
  if (edge.kind === BrainEdgeKinds.WIKI) return palette.primary;
  if (edge.kind === BrainEdgeKinds.MENTION) return mix(palette.primary, palette.foreground, 0.5);
  if (edge.kind === BrainEdgeKinds.CHECKLIST) return mix(palette.primary, palette.muted, 0.6);
  return mix(palette.foreground, palette.background, 0.35);
};

export const edgeColour = (edge: BrainEdge, palette: BrainPalette, lit: boolean): string =>
  rgba(edgeRgb(edge, palette), lit ? 0.85 : 0.25);

export const solidEdgeColour = (edge: BrainEdge, palette: BrainPalette, dim: number): string =>
  rgba(mix(edgeRgb(edge, palette), palette.background, dim));

export const nodeRadius = (node: BrainNode, emphasised: boolean): number => {
  if (node.kind === BrainNodeKinds.TAG) return 2.2;
  const base = Math.min(9, 3.2 + Math.sqrt(node.degree) * 1.1);
  return emphasised ? base * 1.35 : base;
};

export const endpointId = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value)
    return String((value as { id: unknown }).id);
  return "";
};
