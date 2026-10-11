export const RELATIONS_DB_NAME = ".relations.db";
export const RELATIONS_SCHEMA_VERSION = 7;
export const LEGACY_LINK_PREFIX = "/jotty/";
export const WIKILINK_REGEX =
  /\[\[([^\[\]|#^\n]+)(?:[#^][^\[\]|\n]*)?(?:\|([^\[\]\n]*))?\]\]/g;
export const UNSAFE_WIKI_TEXT = /[\[\]|#^\n]/;
export const MARKDOWN_EXT = ".md";
export const CHECKLIST_PIPE = /∣/g;
export const WIKI_EMBED_MARK = "!";

export enum AliasKeys {
  ALIASES = "aliases",
  ALIAS = "alias",
}

export enum WikiRanks {
  TITLE = 0,
  FILENAME = 1,
  PATH = 2,
  ALIAS = 3,
}

export enum LinkKinds {
  LINK = "link",
  MENTION = "mention",
  CHECKLIST = "checklist",
  WIKI = "wiki",
}

export const LINK_KIND_RANK: LinkKinds[] = [
  LinkKinds.MENTION,
  LinkKinds.LINK,
  LinkKinds.CHECKLIST,
  LinkKinds.WIKI,
];

export enum RelationsStatus {
  BUILDING = "building",
  READY = "ready",
}

export enum BrainNodeKinds {
  NOTE = "note",
  CHECKLIST = "checklist",
  GHOST = "ghost",
  TAG = "tag",
}

export enum BrainEdgeKinds {
  LINK = "link",
  MENTION = "mention",
  CHECKLIST = "checklist",
  WIKI = "wiki",
  TAG = "tag",
  SUGGESTED = "suggested",
}

export const LINK_EDGE_KINDS = new Set<BrainEdgeKinds>([
  BrainEdgeKinds.LINK,
  BrainEdgeKinds.MENTION,
  BrainEdgeKinds.CHECKLIST,
  BrainEdgeKinds.WIKI,
]);

export const MENTION_MIN_TITLE = 3;
export const MENTION_LIMIT = 30;
export const MENTION_SNIPPET_CHARS = 60;

export const SUGGESTIONS_PER_ITEM = 3;
export const SUGGESTIONS_MAX = 250;
export const SUGGESTION_HUB_LIMIT = 80;

export enum LinkStyles {
  APPEND = "append",
  MENTION = "mention",
}

export const BRAIN_DEPTH_DEFAULT = 2;
export const BRAIN_DEPTH_MAX = 3;
export const BRAIN_NODES_DEFAULT = 60;
export const BRAIN_NODES_MAX = 200;

export const BRAIN_PATH = "/brain";
export const BRAIN_FOCUS_PARAM = "focus";

export const brainHref = (focus?: string, owner?: string): string => {
  const base = owner ? `${BRAIN_PATH}/${encodeURIComponent(owner)}` : BRAIN_PATH;
  return focus ? `${base}?${BRAIN_FOCUS_PARAM}=${focus}` : base;
};
