export const RELATIONS_DB_NAME = ".relations.db";
export const RELATIONS_SCHEMA_VERSION = 2;
export const LEGACY_LINK_PREFIX = "/jotty/";
export const WIKILINK_REGEX =
  /\[\[([^\[\]|#^\n]+)(?:[#^][^\[\]|\n]*)?(?:\|([^\[\]\n]*))?\]\]/g;

export enum LinkKinds {
  MENTION = "mention",
  WIKI = "wiki",
}

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
  MENTION = "mention",
  WIKI = "wiki",
  TAG = "tag",
  SUGGESTED = "suggested",
}

export const MENTION_MIN_TITLE = 3;
export const MENTION_LIMIT = 30;
export const MENTION_SNIPPET_CHARS = 60;

export const SUGGESTIONS_PER_ITEM = 3;
export const SUGGESTIONS_MAX = 250;
export const SUGGESTION_HUB_LIMIT = 80;

export const BRAIN_PATH = "/brain";
export const BRAIN_FOCUS_PARAM = "focus";

export const brainHref = (focus?: string, owner?: string): string => {
  const base = owner ? `${BRAIN_PATH}/${encodeURIComponent(owner)}` : BRAIN_PATH;
  return focus ? `${base}?${BRAIN_FOCUS_PARAM}=${focus}` : base;
};
