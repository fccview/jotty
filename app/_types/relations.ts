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

export interface LinkedItem {
  uuid: string;
  type: ItemTypes;
  title: string;
  category: string;
  owner?: string;
}

export interface SuggestedItem extends LinkedItem {
  score: number;
  via: string[];
}

export interface RelationsView extends LinkedItem {
  status: RelationsStatus;
  tags: string[];
  backlinks: RelatedItem[];
  links: RelatedItem[];
  unwritten: string[];
  mentions: MentionedIn[];
  suggestions: SuggestedItem[];
}

export interface NeighbourNode {
  id: string;
  kind: BrainNodeKinds;
  title: string;
  category?: string;
  owner?: string;
  links: number;
  distance?: number;
  tags?: string[];
}

export interface Neighbourhood {
  status: RelationsStatus;
  focus?: string;
  nodes: NeighbourNode[];
  edges: BrainEdge[];
  total: number;
  truncated: boolean;
}
