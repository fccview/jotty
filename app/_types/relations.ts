import type {
  BrainEdgeKinds,
  BrainNodeKinds,
  LinkKinds,
  RelationsStatus,
} from "@/app/_consts/relations";
import type { ItemTypes } from "./enums";

export interface RelatedItem {
  uuid: string;
  type: ItemTypes;
  title: string;
  category: string;
  owner?: string;
  checklistType?: string;
  kind: LinkKinds;
}

export interface MentionedIn extends Omit<RelatedItem, "kind"> {
  snippet: string;
}

export interface ItemRelations {
  uuid: string;
  status: RelationsStatus;
  backlinks: RelatedItem[];
  mentions: MentionedIn[];
  wikis: Record<string, string>;
}

export interface BrainNode {
  id: string;
  kind: BrainNodeKinds;
  title: string;
  category?: string;
  owner?: string;
  checklistType?: string;
  degree: number;
}

export interface BrainEdge {
  source: string;
  target: string;
  kind: BrainEdgeKinds;
  weight: number;
}

export interface BrainGraph {
  status: RelationsStatus;
  owner: string;
  nodes: BrainNode[];
  edges: BrainEdge[];
}
