import type { BrainEdge, BrainNode } from "@/app/_types/relations";
import type { BrainColourModes, BrainPalette } from "./brain-graph";

export interface BrainCanvasProps {
  nodes: BrainNode[];
  edges: BrainEdge[];
  focusId: string | null;
  selectedId: string | null;
  colourMode: BrainColourModes;
  palette: BrainPalette;
  flyTo: { id: string; at: number } | null;
  onSelect: (id: string | null) => void;
  onOpen: (node: BrainNode) => void;
}

export const FLY_MS = 1100;
export const FLY_DISTANCE = 80;
