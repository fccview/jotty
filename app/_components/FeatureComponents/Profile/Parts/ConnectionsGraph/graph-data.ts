import { Checklist, ItemType, LinkIndex, Note } from "@/app/_types";
import { ItemTypes } from "@/app/_types/enums";
import { itemHref } from "@/app/_utils/global-utils";
import { isUuid } from "@/app/_consts/identity";

export const MAX_GRAPH_NODES = 600;
export const MAX_TAG_LINK_FANOUT = 8;

export interface ConnectionGraphNode {
  id: string;
  label: string;
  title: string;
  type: ItemType;
  category: string;
  itemId: string;
  path: string;
  url: string;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
  inboundCount: number;
  outboundCount: number;
  connectionCount: number;
  weight: number;
  orphan: boolean;
}

export interface ConnectionGraphLink {
  source: string;
  target: string;
  directed: boolean;
  type: "explicit" | "tag";
  tag?: string;
}

export interface ConnectionGraphData {
  nodes: ConnectionGraphNode[];
  links: ConnectionGraphLink[];
  totalNodes: number;
  totalLinks: number;
  truncated: number;
}

export interface ConnectionGraphFilters {
  search: string;
  showNotes: boolean;
  showChecklists: boolean;
  showOrphans: boolean;
  showTagLinks: boolean;
}

type ItemLike = Partial<Note> | Partial<Checklist>;

const fallbackTitle = (type: ItemType, id: string) =>
  `${type === ItemTypes.CHECKLIST ? "Checklist" : "Note"} ${id.slice(0, 8)}`;

const getItemKey = (item: ItemLike) =>
  `${item.category || "Uncategorized"}/${item.id || ""}`;

const normalizeTag = (tag: string) => tag.trim().replace(/^#/, "").toLowerCase();

const addItemToMaps = (
  item: ItemLike,
  type: ItemType,
  itemsByUuid: Map<string, { item: ItemLike; type: ItemType }>,
  uuidByLegacyKey: Map<string, string>,
) => {
  if (!item.uuid) return;
  itemsByUuid.set(item.uuid, { item, type });
  if (item.id) {
    uuidByLegacyKey.set(getItemKey(item), item.uuid);
  }
};

export const resolveGraphId = (
  rawId: string,
  uuidByLegacyKey: Map<string, string>,
) => {
  if (isUuid(rawId)) return rawId;
  return uuidByLegacyKey.get(rawId) || rawId;
};

export const buildArchivedIdSet = (archivedItems: ItemLike[]) => {
  const archived = new Set<string>();
  archivedItems.forEach((item) => {
    if (item.uuid) archived.add(item.uuid);
    if (item.id) archived.add(getItemKey(item));
  });
  return archived;
};

export const filterArchivedLinkIndex = (
  linkIndex: LinkIndex,
  archivedItems: ItemLike[],
): LinkIndex => {
  const archived = buildArchivedIdSet(archivedItems);
  const shouldKeep = (id: string) => !archived.has(id);
  const filterIds = (ids: string[]) => ids.filter(shouldKeep);
  const filterGroup = (group: LinkIndex["notes"]) =>
    Object.fromEntries(
      Object.entries(group)
        .filter(([key]) => shouldKeep(key))
        .map(([key, links]) => [
          key,
          {
            isLinkedTo: {
              notes: filterIds(links.isLinkedTo.notes),
              checklists: filterIds(links.isLinkedTo.checklists),
            },
            isReferencedIn: {
              notes: filterIds(links.isReferencedIn.notes),
              checklists: filterIds(links.isReferencedIn.checklists),
            },
          },
        ]),
    );

  return {
    notes: filterGroup(linkIndex.notes || {}),
    checklists: filterGroup(linkIndex.checklists || {}),
  };
};

export const buildConnectionGraphData = (
  linkIndex: LinkIndex,
  notes: Partial<Note>[],
  checklists: Partial<Checklist>[],
  includeOrphans = false,
): ConnectionGraphData => {
  const itemsByUuid = new Map<string, { item: ItemLike; type: ItemType }>();
  const uuidByLegacyKey = new Map<string, string>();

  notes.forEach((note) =>
    addItemToMaps(note, ItemTypes.NOTE, itemsByUuid, uuidByLegacyKey),
  );
  checklists.forEach((checklist) =>
    addItemToMaps(
      checklist,
      ItemTypes.CHECKLIST,
      itemsByUuid,
      uuidByLegacyKey,
    ),
  );

  const outbound = new Map<string, number>();
  const inbound = new Map<string, number>();
  const tagConnections = new Map<string, number>();
  const linkMap = new Map<string, ConnectionGraphLink>();

  const addDirectedLinks = (
    sourceRaw: string,
    targets: string[],
    targetType: ItemType,
  ) => {
    const source = resolveGraphId(sourceRaw, uuidByLegacyKey);
    if (!itemsByUuid.has(source)) return;

    targets.forEach((targetRaw) => {
      const target = resolveGraphId(targetRaw, uuidByLegacyKey);
      const targetItem = itemsByUuid.get(target);
      if (!targetItem || targetItem.type !== targetType || source === target) {
        return;
      }

      outbound.set(source, (outbound.get(source) || 0) + 1);
      inbound.set(target, (inbound.get(target) || 0) + 1);

      const linkKey = `explicit::${[source, target].sort().join("::")}`;
      if (!linkMap.has(linkKey)) {
        linkMap.set(linkKey, { source, target, directed: true, type: "explicit" });
      }
    });
  };

  Object.entries(linkIndex.notes || {}).forEach(([source, links]) => {
    addDirectedLinks(source, links.isLinkedTo.notes, ItemTypes.NOTE);
    addDirectedLinks(source, links.isLinkedTo.checklists, ItemTypes.CHECKLIST);
  });

  Object.entries(linkIndex.checklists || {}).forEach(([source, links]) => {
    addDirectedLinks(source, links.isLinkedTo.notes, ItemTypes.NOTE);
    addDirectedLinks(source, links.isLinkedTo.checklists, ItemTypes.CHECKLIST);
  });

  const nodesByTag = new Map<string, string[]>();
  itemsByUuid.forEach(({ item }, uuid) => {
    const uniqueTags = new Set((item.tags || []).map(normalizeTag).filter(Boolean));
    uniqueTags.forEach((tag) => {
      if (!nodesByTag.has(tag)) nodesByTag.set(tag, []);
      nodesByTag.get(tag)?.push(uuid);
    });
  });

  nodesByTag.forEach((taggedNodeIds, tag) => {
    if (taggedNodeIds.length < 2) return;
    const sortedIds = [...taggedNodeIds].sort();

    sortedIds.forEach((source, sourceIndex) => {
      const fanOutTargets = sortedIds.slice(
        sourceIndex + 1,
        sourceIndex + 1 + MAX_TAG_LINK_FANOUT,
      );
      fanOutTargets.forEach((target) => {
        const linkKey = `tag::${tag}::${source}::${target}`;
        if (linkMap.has(linkKey)) return;

        linkMap.set(linkKey, {
          source,
          target,
          directed: false,
          type: "tag",
          tag,
        });
        tagConnections.set(source, (tagConnections.get(source) || 0) + 1);
        tagConnections.set(target, (tagConnections.get(target) || 0) + 1);
      });
    });
  });

  const nodes = Array.from(itemsByUuid.entries())
    .map(([uuid, { item, type }]) => {
      const inboundCount = inbound.get(uuid) || 0;
      const outboundCount = outbound.get(uuid) || 0;
      const tagConnectionCount = tagConnections.get(uuid) || 0;
      const connectionCount = inboundCount + outboundCount + tagConnectionCount;
      const category = item.category || "Uncategorized";
      const itemId = item.id || uuid;
      const path = `${category}/${itemId}`;

      return {
        id: uuid,
        label: item.title || fallbackTitle(type, uuid),
        title: item.title || fallbackTitle(type, uuid),
        type,
        category,
        itemId,
        path,
        url: itemHref(type, uuid),
        tags: item.tags || [],
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        inboundCount,
        outboundCount,
        connectionCount,
        weight: connectionCount,
        orphan: connectionCount === 0,
      };
    })
    .filter((node) => includeOrphans || !node.orphan)
    .sort((a, b) => b.connectionCount - a.connectionCount);

  const visibleIds = new Set(nodes.map((node) => node.id));
  const links = Array.from(linkMap.values()).filter(
    (link) => visibleIds.has(link.source) && visibleIds.has(link.target),
  );

  if (nodes.length > MAX_GRAPH_NODES) {
    const keptNodes = nodes.slice(0, MAX_GRAPH_NODES);
    const keptIds = new Set(keptNodes.map((node) => node.id));
    return {
      nodes: keptNodes,
      links: links.filter(
        (link) => keptIds.has(link.source) && keptIds.has(link.target),
      ),
      totalNodes: nodes.length,
      totalLinks: links.length,
      truncated: nodes.length - MAX_GRAPH_NODES,
    };
  }

  return {
    nodes,
    links,
    totalNodes: nodes.length,
    totalLinks: links.length,
    truncated: 0,
  };
};

export const filterConnectionGraphData = (
  graphData: ConnectionGraphData,
  filters: ConnectionGraphFilters,
): ConnectionGraphData => {
  const query = filters.search.trim().toLowerCase();
  const sourceLinks = filters.showTagLinks
    ? graphData.links
    : graphData.links.filter((link) => link.type !== "tag");
  const explicitlyConnectedIds = new Set<string>();
  sourceLinks.forEach((link) => {
    explicitlyConnectedIds.add(link.source);
    explicitlyConnectedIds.add(link.target);
  });

  const matchingIds = new Set(
    graphData.nodes
      .filter((node) => {
        if (!filters.showNotes && node.type === ItemTypes.NOTE) return false;
        if (!filters.showChecklists && node.type === ItemTypes.CHECKLIST) {
          return false;
        }
        if (!filters.showOrphans && !explicitlyConnectedIds.has(node.id)) {
          return false;
        }
        if (!query) return true;

        return [
          node.title,
          node.label,
          node.path,
          node.category,
          node.type,
          ...node.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .map((node) => node.id),
  );

  const visibleIds = matchingIds;

  const nodes = graphData.nodes.filter((node) => visibleIds.has(node.id));
  const links = sourceLinks.filter(
    (link) => visibleIds.has(link.source) && visibleIds.has(link.target),
  );

  return {
    nodes,
    links,
    totalNodes: nodes.length,
    totalLinks: links.length,
    truncated: graphData.truncated,
  };
};
