import { getUserNotes } from "@/app/_server/actions/note/queries";
import { getUserChecklists } from "@/app/_server/actions/checklist/queries";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import {
  BrainEdgeKinds,
  BrainNodeKinds,
  LINK_KIND_RANK,
  LinkKinds,
  MENTION_LIMIT,
  MENTION_MIN_TITLE,
  MENTION_SNIPPET_CHARS,
  RelationsStatus,
} from "@/app/_consts/relations";
import { ItemTypes } from "@/app/_types/enums";
import type {
  BrainEdge,
  BrainGraph,
  BrainNode,
  ItemRelations,
  MentionedIn,
  RelatedItem,
} from "@/app/_types/relations";
import { titleKey } from "./parser";
import { ensureRelations } from "./indexer";
import { relationsDb } from "./store";
import { suggestEdges } from "./suggestions";

export interface VisibleItem {
  uuid: string;
  type: ItemTypes;
  title: string;
  category: string;
  owner?: string;
  checklistType?: string;
  tags: string[];
}

interface LinkRow {
  src: string;
  dst: string | null;
  dst_text: string | null;
  dst_label: string | null;
  kind: LinkKinds;
  weight: number;
}

const HREF_EDGES: Partial<Record<LinkKinds, BrainEdgeKinds>> = {
  [LinkKinds.LINK]: BrainEdgeKinds.LINK,
  [LinkKinds.MENTION]: BrainEdgeKinds.MENTION,
  [LinkKinds.CHECKLIST]: BrainEdgeKinds.CHECKLIST,
};

export const byKindRank = (a: { kind: LinkKinds }, b: { kind: LinkKinds }): number =>
  LINK_KIND_RANK.indexOf(a.kind) - LINK_KIND_RANK.indexOf(b.kind);

const GHOST_PREFIX = "ghost:";
const TAG_PREFIX = "tag:";

export const visibleItems = async (username: string): Promise<Map<string, VisibleItem>> => {
  const [notes, checklists] = await Promise.all([
    getUserNotes({ username, metadataOnly: true }),
    getUserChecklists({ username, metadataOnly: true }),
  ]);

  const visible = new Map<string, VisibleItem>();
  const add = (item: VisibleItem) => {
    const uuid = item.uuid.toLowerCase();
    if (uuid) visible.set(uuid, { ...item, uuid });
  };

  (notes.success ? notes.data || [] : []).forEach((note) =>
    add({
      uuid: note.uuid || "",
      type: ItemTypes.NOTE,
      title: note.title || note.id || "",
      category: note.category || UNCATEGORIZED,
      owner: note.owner,
      tags: note.tags || [],
    }),
  );

  (checklists.success ? checklists.data || [] : []).forEach((list) =>
    add({
      uuid: list.uuid || "",
      type: ItemTypes.CHECKLIST,
      title: list.title || list.id || "",
      category: list.category || UNCATEGORIZED,
      owner: list.owner,
      checklistType: list.type,
      tags: list.tags || [],
    }),
  );

  return visible;
};

const _related = (item: VisibleItem, kind: LinkKinds): RelatedItem => ({
  uuid: item.uuid,
  type: item.type,
  title: item.title,
  category: item.category,
  owner: item.owner,
  checklistType: item.checklistType,
  kind,
});

const WORDS = new RegExp("[\\p{L}\\p{N}]+", "gu");
const EMPTY = { backlinks: [], mentions: [], wikis: {} };

const _escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const _phrase = (title: string): RegExp =>
  new RegExp(
    `(?<![\\p{L}\\p{N}])${title.trim().split(/\s+/).map(_escapeRegex).join("\\s+")}(?![\\p{L}\\p{N}])`,
    "iu",
  );

const _snippet = (body: string, at: number, length: number): string => {
  const start = Math.max(0, at - MENTION_SNIPPET_CHARS);
  const end = Math.min(body.length, at + length + MENTION_SNIPPET_CHARS);
  return `${start > 0 ? "…" : ""}${body.slice(start, end).trim()}${end < body.length ? "…" : ""}`;
};

const _mentionsOf = (
  item: VisibleItem,
  linked: Set<string>,
  visible: Map<string, VisibleItem>,
): MentionedIn[] => {
  if (titleKey(item.title).length < MENTION_MIN_TITLE) return [];
  const words = item.title.match(WORDS);
  if (!words) return [];

  const query = `prose : "${words.join(" ").replace(/"/g, '""')}"`;
  const rows = relationsDb()
    .prepare(
      `SELECT texts.uuid, texts.prose AS body FROM texts JOIN items i ON i.uuid = texts.uuid
       WHERE texts MATCH ? AND i.type = ?
       AND texts.uuid IN (SELECT value FROM json_each(?)) LIMIT 400`,
    )
    .all(query, ItemTypes.NOTE, JSON.stringify(Array.from(visible.keys()))) as {
    uuid: string;
    body: string;
  }[];

  const phrase = _phrase(item.title);
  const found: MentionedIn[] = [];
  for (const row of rows) {
    if (found.length >= MENTION_LIMIT) break;
    const source = visible.get(row.uuid);
    if (!source || row.uuid === item.uuid || linked.has(row.uuid)) continue;
    const match = phrase.exec(row.body);
    if (!match) continue;
    const { kind: _kind, ...related } = _related(source, LinkKinds.MENTION);
    found.push({ ...related, snippet: _snippet(row.body, match.index, match[0].length) });
  }
  return found.sort((a, b) => a.title.localeCompare(b.title));
};

const _outgoingWikis = (uuid: string, visible: Map<string, VisibleItem>): Record<string, string> => {
  const rows = relationsDb()
    .prepare("SELECT dst_text, dst FROM links WHERE src = ? AND kind = ? AND dst IS NOT NULL")
    .all(uuid, LinkKinds.WIKI) as { dst_text: string; dst: string }[];
  return Object.fromEntries(
    rows.filter((row) => visible.has(row.dst)).map((row) => [row.dst_text, row.dst]),
  );
};

export const backlinksFor = (
  uuid: string,
  visible: Map<string, VisibleItem>,
): ItemRelations => {
  const status = ensureRelations();
  const target = uuid.toLowerCase();
  if (status === RelationsStatus.BUILDING) return { uuid: target, status, ...EMPTY };

  const rows = relationsDb()
    .prepare("SELECT DISTINCT src, kind FROM links WHERE dst = ?")
    .all(target) as { src: string; kind: LinkKinds }[];

  const seen = new Set<string>();
  const backlinks: RelatedItem[] = [];
  rows.sort(byKindRank).forEach(({ src, kind }) => {
    const source = visible.get(src);
    if (!source || src === target || seen.has(src)) return;
    seen.add(src);
    backlinks.push(_related(source, kind));
  });

  const item = visible.get(target);
  return {
    uuid: target,
    status,
    backlinks: backlinks.sort((a, b) => a.title.localeCompare(b.title)),
    mentions: item ? _mentionsOf(item, seen, visible) : [],
    wikis: _outgoingWikis(target, visible),
  };
};

const _itemNode = (item: VisibleItem): BrainNode => ({
  id: item.uuid,
  kind: item.type === ItemTypes.CHECKLIST ? BrainNodeKinds.CHECKLIST : BrainNodeKinds.NOTE,
  title: item.title,
  category: item.category,
  owner: item.owner,
  checklistType: item.checklistType,
  degree: 0,
});

export const graphFor = (owner: string, visible: Map<string, VisibleItem>): BrainGraph => {
  const status = ensureRelations();
  if (status === RelationsStatus.BUILDING) return { status, owner, nodes: [], edges: [] };

  const sources = JSON.stringify(Array.from(visible.keys()));
  const rows = relationsDb()
    .prepare(
      `SELECT src, dst, dst_text, dst_label, kind, weight FROM links
       WHERE src IN (SELECT value FROM json_each(?))`,
    )
    .all(sources) as unknown as LinkRow[];

  const nodes = new Map<string, BrainNode>();
  visible.forEach((item) => nodes.set(item.uuid, _itemNode(item)));

  const edges = new Map<string, BrainEdge>();
  const connect = (source: string, target: string, kind: BrainEdgeKinds, weight: number) => {
    if (source === target) return;
    const key = `${source}>${target}>${kind}`;
    const existing = edges.get(key);
    if (existing) {
      existing.weight += weight;
      return;
    }
    edges.set(key, { source, target, kind, weight });
  };

  rows.forEach((row) => {
    const hrefEdge = HREF_EDGES[row.kind];
    if (hrefEdge) {
      if (row.dst && visible.has(row.dst)) connect(row.src, row.dst, hrefEdge, row.weight);
      return;
    }

    if (row.kind !== LinkKinds.WIKI || !row.dst_text) return;

    if (row.dst) {
      if (visible.has(row.dst)) connect(row.src, row.dst, BrainEdgeKinds.WIKI, row.weight);
      return;
    }

    const ghostId = `${GHOST_PREFIX}${row.dst_text}`;
    if (!nodes.has(ghostId)) {
      nodes.set(ghostId, {
        id: ghostId,
        kind: BrainNodeKinds.GHOST,
        title: row.dst_label || row.dst_text,
        degree: 0,
      });
    }
    connect(row.src, ghostId, BrainEdgeKinds.WIKI, row.weight);
  });

  visible.forEach((item) => {
    item.tags.forEach((tag) => {
      const name = tag.replace(/^#/, "").toLowerCase();
      if (!name) return;
      const tagId = `${TAG_PREFIX}${name}`;
      if (!nodes.has(tagId)) {
        nodes.set(tagId, { id: tagId, kind: BrainNodeKinds.TAG, title: `#${name}`, degree: 0 });
      }
      connect(item.uuid, tagId, BrainEdgeKinds.TAG, 1);
    });
  });

  const edgeList = Array.from(edges.values());
  const suggested = suggestEdges(edgeList, new Set(visible.keys()));
  edgeList.forEach((edge) => {
    nodes.get(edge.source)!.degree += 1;
    nodes.get(edge.target)!.degree += 1;
  });

  return {
    status,
    owner,
    nodes: Array.from(nodes.values()),
    edges: [...edgeList, ...suggested],
  };
};
