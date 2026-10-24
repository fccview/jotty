import { getSettings } from "@/app/_server/actions/config";
import { spliceNote, type SpliceEdit } from "@/app/_server/actions/note/splice";
import { unlinkItem } from "@/app/_utils/item-links";
import { isUuid } from "@/app/_consts/identity";
import { canReach, isLockedUuid } from "@/app/_server/actions/share/queries";
import { lockedNotice } from "@/app/_server/actions/lib/read-only-message";
import { itemHref } from "@/app/_utils/global-utils";
import { escapeLinkText } from "@/app/_utils/item-href-utils";
import {
  BRAIN_DEPTH_MAX,
  BRAIN_NODES_MAX,
  BrainEdgeKinds,
  BrainNodeKinds,
  LINK_EDGE_KINDS,
  LinkKinds,
  LinkStyles,
  RelationsStatus,
} from "@/app/_consts/relations";
import { ItemTypes, PermissionTypes } from "@/app/_types/enums";
import type { Result, SanitisedUser } from "@/app/_types";
import type {
  BrainEdge,
  BrainGraph,
  BrainNode,
  ItemRelations,
  LinkedItem,
  Neighbourhood,
  RelatedItem,
  RelationsView,
  SuggestedItem,
} from "@/app/_types/relations";
import { backlinksFor, byKindRank, graphFor, visibleItems, type VisibleItem } from "./queries";
import { freshRelations } from "./freshen";
import { appOrigins } from "./paths";
import { relationsDb } from "./store";
import { wrapMention } from "./tidy";

export const LINKS_OFF = "Links are turned off on this instance";
export const NOT_VISIBLE = "Not found";
export const DENIED = "Permission denied";

export const linksEnabled = async (): Promise<boolean> => {
  const settings = await getSettings();
  return settings?.editor?.enableBilateralLinks !== false;
};

const _linked = (item: VisibleItem): LinkedItem => ({
  uuid: item.uuid,
  type: item.type,
  title: item.title,
  category: item.category,
  owner: item.owner,
});

const _outgoing = (uuid: string, visible: Map<string, VisibleItem>) => {
  const rows = relationsDb()
    .prepare("SELECT dst, dst_text, dst_label, kind FROM links WHERE src = ?")
    .all(uuid) as { dst: string | null; dst_text: string | null; dst_label: string | null; kind: LinkKinds }[];

  const links: RelatedItem[] = [];
  const unwritten = new Set<string>();
  const seen = new Set<string>();
  rows.sort(byKindRank).forEach((row) => {
    if (!row.dst) {
      if (row.kind === LinkKinds.WIKI && row.dst_text) unwritten.add(row.dst_label || row.dst_text);
      return;
    }
    const target = visible.get(row.dst);
    if (!target || row.dst === uuid || seen.has(row.dst)) return;
    seen.add(row.dst);
    links.push({ ..._linked(target), kind: row.kind });
  });

  return {
    links: links.sort((a, b) => a.title.localeCompare(b.title)),
    unwritten: Array.from(unwritten).sort(),
  };
};

const VIA_MAX = 5;

const _sharedVia = (graph: BrainGraph) => {
  const around = _adjacency(graph.edges.filter((edge) => edge.kind !== BrainEdgeKinds.SUGGESTED));
  const titles = new Map(graph.nodes.map((node) => [node.id, node.title]));
  return (a: string, b: string): string[] => {
    const theirs = around.get(b) || new Set<string>();
    return Array.from(around.get(a) || [])
      .filter((id) => theirs.has(id))
      .map((id) => titles.get(id) || id)
      .sort((x, y) => x.localeCompare(y))
      .slice(0, VIA_MAX);
  };
};

const _suggestionsFor = (
  uuid: string,
  graph: BrainGraph,
  visible: Map<string, VisibleItem>,
): SuggestedItem[] => {
  const via = _sharedVia(graph);
  return graph.edges
    .filter((edge) => edge.kind === BrainEdgeKinds.SUGGESTED && (edge.source === uuid || edge.target === uuid))
    .map((edge) => ({ other: visible.get(edge.source === uuid ? edge.target : edge.source), score: edge.weight }))
    .filter((entry): entry is { other: VisibleItem; score: number } => Boolean(entry.other))
    .map(({ other, score }) => ({ ..._linked(other), score, via: via(uuid, other.uuid) }))
    .sort((a, b) => b.score - a.score || b.via.length - a.via.length);
};

export const relatedFor = async (
  actor: SanitisedUser,
  uuid: string,
): Promise<Result<RelationsView>> => {
  if (!(await linksEnabled())) return { success: false, error: LINKS_OFF };

  const target = uuid.toLowerCase();
  await freshRelations([target]);
  const visible = await visibleItems(actor.username);
  const item = visible.get(target);
  if (!item) return { success: false, error: NOT_VISIBLE };

  const relations: ItemRelations = backlinksFor(target, visible);
  const base = { ..._linked(item), tags: item.tags, status: relations.status };
  if (relations.status === RelationsStatus.BUILDING) {
    return {
      success: true,
      data: { ...base, backlinks: [], links: [], unwritten: [], mentions: [], suggestions: [] },
    };
  }

  const graph = graphFor(actor.username, visible);
  return {
    success: true,
    data: {
      ...base,
      backlinks: relations.backlinks,
      ..._outgoing(target, visible),
      mentions: relations.mentions,
      suggestions: _suggestionsFor(target, graph, visible),
    },
  };
};

const _linkDegrees = (edges: BrainEdge[]): Map<string, number> => {
  const degrees = new Map<string, number>();
  const bump = (id: string) => degrees.set(id, (degrees.get(id) || 0) + 1);
  edges.forEach((edge) => {
    bump(edge.source);
    bump(edge.target);
  });
  return degrees;
};

const _adjacency = (edges: BrainEdge[]): Map<string, Set<string>> => {
  const around = new Map<string, Set<string>>();
  const add = (from: string, to: string) => {
    if (!around.has(from)) around.set(from, new Set());
    around.get(from)!.add(to);
  };
  edges.forEach((edge) => {
    add(edge.source, edge.target);
    add(edge.target, edge.source);
  });
  return around;
};

const _ring = (focus: string, edges: BrainEdge[], depth: number): Map<string, number> => {
  const around = _adjacency(edges);
  const distance = new Map<string, number>([[focus, 0]]);
  let frontier = [focus];
  for (let step = 1; step <= depth && frontier.length; step++) {
    const next: string[] = [];
    frontier.forEach((id) =>
      around.get(id)?.forEach((other) => {
        if (distance.has(other)) return;
        distance.set(other, step);
        next.push(other);
      }),
    );
    frontier = next;
  }
  return distance;
};

interface NeighbourhoodOptions {
  focus?: string;
  depth: number;
  limit: number;
  suggestions: boolean;
}

export const neighbourhoodFor = async (
  actor: SanitisedUser,
  { focus, depth, limit, suggestions }: NeighbourhoodOptions,
): Promise<Result<Neighbourhood>> => {
  if (!(await linksEnabled())) return { success: false, error: LINKS_OFF };

  const centre = focus?.toLowerCase();
  await freshRelations(centre ? [centre] : []);
  const visible = await visibleItems(actor.username);
  if (centre && !visible.has(centre)) return { success: false, error: NOT_VISIBLE };

  const graph = graphFor(actor.username, visible);
  const empty = { status: graph.status, focus: centre, nodes: [], edges: [], total: 0, truncated: false };
  if (graph.status === RelationsStatus.BUILDING) return { success: true, data: empty };

  const links = graph.edges.filter((edge) => LINK_EDGE_KINDS.has(edge.kind));
  const degrees = _linkDegrees(links);
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const distance = centre ? _ring(centre, links, Math.min(depth, BRAIN_DEPTH_MAX)) : null;

  const candidates = graph.nodes
    .filter((node) => node.kind !== BrainNodeKinds.TAG)
    .filter((node) => (distance ? distance.has(node.id) : (degrees.get(node.id) || 0) > 0))
    .sort(
      (a, b) =>
        (distance ? distance.get(a.id)! - distance.get(b.id)! : 0) ||
        (degrees.get(b.id) || 0) - (degrees.get(a.id) || 0) ||
        a.title.localeCompare(b.title),
    );

  const cap = Math.min(limit, BRAIN_NODES_MAX);
  const kept = new Set(candidates.slice(0, cap).map((node) => node.id));
  const shown = (edge: BrainEdge) => kept.has(edge.source) && kept.has(edge.target);
  const edges = [
    ...links.filter(shown),
    ...(suggestions ? graph.edges.filter((edge) => edge.kind === BrainEdgeKinds.SUGGESTED && shown(edge)) : []),
  ];

  const nodes = Array.from(kept).map((id) => {
    const node = byId.get(id) as BrainNode;
    const item = visible.get(id);
    return {
      id,
      kind: node.kind,
      title: node.title,
      category: node.category,
      owner: node.owner,
      links: degrees.get(id) || 0,
      ...(distance && { distance: distance.get(id) }),
      ...(item?.tags.length && { tags: item.tags }),
    };
  });

  return {
    success: true,
    data: { ...empty, nodes, edges, total: candidates.length, truncated: candidates.length > cap },
  };
};

interface OrphanOptions {
  type?: ItemTypes;
  limit: number;
  offset: number;
}

export const orphansFor = async (
  actor: SanitisedUser,
  { type, limit, offset }: OrphanOptions,
): Promise<Result<{ status: RelationsStatus; orphans: LinkedItem[]; total: number }>> => {
  if (!(await linksEnabled())) return { success: false, error: LINKS_OFF };
  await freshRelations();

  const visible = await visibleItems(actor.username);
  const graph = graphFor(actor.username, visible);
  if (graph.status === RelationsStatus.BUILDING) {
    return { success: true, data: { status: graph.status, orphans: [], total: 0 } };
  }

  const connected = new Set<string>();
  graph.edges
    .filter((edge) => LINK_EDGE_KINDS.has(edge.kind) && visible.has(edge.source) && visible.has(edge.target))
    .forEach((edge) => {
      connected.add(edge.source);
      connected.add(edge.target);
    });

  const orphans = Array.from(visible.values())
    .filter((item) => !connected.has(item.uuid) && (!type || item.type === type))
    .map(_linked)
    .sort((a, b) => a.title.localeCompare(b.title));

  return {
    success: true,
    data: { status: graph.status, orphans: orphans.slice(offset, offset + limit), total: orphans.length },
  };
};

export const MENTION_MISSING = "Mention not found";
export const LINK_MISSING = "The source note has no link to that item";

const _eolOf = (body: string): string => (body.includes("\r\n") ? "\r\n" : "\n");

const _appendLink = (title: string, href: string) => (body: string): SpliceEdit => {
  const eol = _eolOf(body);
  const kept = body.trimEnd();
  const gap = kept ? `${eol}${eol}` : "";
  return { body: `${kept}${gap}[${escapeLinkText(title)}](${href})${body.slice(kept.length) || eol}` };
};

const _wrapFirst = (title: string, href: string) => (body: string): SpliceEdit => {
  const wrapped = wrapMention(body, title, href);
  return wrapped === null || wrapped === body ? { error: MENTION_MISSING } : { body: wrapped };
};

export interface LinkWrite {
  managed: boolean;
}

export interface UnlinkWrite extends LinkWrite {
  removed: number;
  wikiLinks: number;
}

const _noteSource = async (actor: SanitisedUser, sourceUuid: string) => {
  const visible = await visibleItems(actor.username);
  const from = visible.get(sourceUuid.toLowerCase());
  return { visible, from: from?.type === ItemTypes.NOTE ? from : undefined };
};

export const linkItems = async (
  actor: SanitisedUser,
  sourceUuid: string,
  targetUuid: string,
  style: LinkStyles,
): Promise<Result<LinkWrite>> => {
  if (!(await linksEnabled())) return { success: false, error: LINKS_OFF };

  const { visible, from } = await _noteSource(actor, sourceUuid);
  const target = visible.get(targetUuid.toLowerCase());
  if (!target || !from) return { success: false, error: NOT_VISIBLE };
  if (from.uuid === target.uuid) return { success: false, error: "An item can't link to itself" };
  if (await isLockedUuid(target.type, target.uuid)) return { success: false, error: await lockedNotice() };

  const allowed = await canReach(from.uuid, ItemTypes.NOTE, actor.username, PermissionTypes.EDIT);
  if (!allowed) return { success: false, error: DENIED };

  const href = itemHref(target.type, target.uuid);
  const edit =
    style === LinkStyles.MENTION ? _wrapFirst(target.title, href) : _appendLink(target.title, href);

  const result = await spliceNote(actor, from.uuid, edit);
  if (!result.success || !result.data) return { success: false, error: result.error };
  return { success: true, data: { managed: result.data.managed } };
};

const _wikiLinksLeft = (source: string, target: string): number => {
  const row = relationsDb()
    .prepare("SELECT COUNT(*) AS n FROM links WHERE src = ? AND dst = ? AND kind = ?")
    .get(source, target, LinkKinds.WIKI) as { n: number };
  return row.n;
};

export const unlinkItems = async (
  actor: SanitisedUser,
  sourceUuid: string,
  targetUuid: string,
): Promise<Result<UnlinkWrite>> => {
  if (!(await linksEnabled())) return { success: false, error: LINKS_OFF };
  if (!isUuid(targetUuid)) return { success: false, error: NOT_VISIBLE };

  const { from } = await _noteSource(actor, sourceUuid);
  if (!from) return { success: false, error: NOT_VISIBLE };

  const target = targetUuid.toLowerCase();
  const origins = appOrigins();
  let removed = 0;
  const result = await spliceNote(actor, from.uuid, (body) => {
    const unlinked = unlinkItem(body, target, origins);
    removed = unlinked.removed;
    return removed ? { body: unlinked.text } : { error: LINK_MISSING };
  });
  if (!result.success || !result.data) return { success: false, error: result.error };

  return {
    success: true,
    data: { removed, managed: result.data.managed, wikiLinks: _wikiLinksLeft(from.uuid, target) },
  };
};
