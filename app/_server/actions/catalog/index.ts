import type { AdjacentNotes, ContentFilter, ItemShelf, Note, Result, WikiAsk, WikiHit } from "@/app/_types";
import { ItemTypes, Modes } from "@/app/_types/enums";
import { getUsername } from "@/app/_server/actions/users";
import { adjacentOf, findOnShelf, shelfByUuid, shelfTagged } from "@/app/_utils/catalog-utils";
import { bestWikiMatch, wikiAskKey } from "@/app/_utils/wiki-match-utils";
import { bothListings, itemListing } from "./listing";

const FIND_LIMIT_MAX = 100;
const LOOKUP_MAX = 500;
const NOT_SIGNED_IN = { success: false, error: "Not authenticated" } as const;
const BAD_REQUEST = { success: false, error: "Invalid catalog request" } as const;

const _strings = (value: unknown): string[] | null =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string")
    ? value.slice(0, LOOKUP_MAX)
    : null;

export const findItems = async (
  query: unknown,
  limit: unknown,
  byCategory: unknown,
): Promise<Result<ItemShelf>> => {
  const username = await getUsername();
  if (!username) return NOT_SIGNED_IN;
  if (typeof query !== "string" || typeof limit !== "number") return BAD_REQUEST;

  const { notes, checklists } = await bothListings(username);
  return {
    success: true,
    data: findOnShelf(notes, checklists, query, {
      limit: Math.max(0, Math.min(Math.floor(limit), FIND_LIMIT_MAX)),
      byCategory: byCategory === true,
    }),
  };
};

export const getItemsByUuid = async (uuids: unknown): Promise<Result<ItemShelf>> => {
  const username = await getUsername();
  if (!username) return NOT_SIGNED_IN;
  const wanted = _strings(uuids);
  if (!wanted) return BAD_REQUEST;

  const { notes, checklists } = await bothListings(username);
  return { success: true, data: shelfByUuid(notes, checklists, wanted) };
};

export const getTaggedItems = async (tag: unknown): Promise<Result<ItemShelf>> => {
  const username = await getUsername();
  if (!username) return NOT_SIGNED_IN;
  if (typeof tag !== "string") return BAD_REQUEST;

  const { notes, checklists } = await bothListings(username);
  return { success: true, data: shelfTagged(notes, checklists, tag) };
};

export const resolveWikiTargets = async (
  asks: unknown,
): Promise<Result<Record<string, WikiHit | null>>> => {
  const username = await getUsername();
  if (!username) return NOT_SIGNED_IN;
  if (!Array.isArray(asks)) return BAD_REQUEST;

  const { notes, checklists } = await bothListings(username);
  const candidates = [
    ...notes.map((item) => ({ ...item, type: ItemTypes.NOTE })),
    ...checklists.map((item) => ({ ...item, type: ItemTypes.CHECKLIST })),
  ];

  const hits: Record<string, WikiHit | null> = {};
  (asks.slice(0, LOOKUP_MAX) as WikiAsk[]).forEach((ask) => {
    if (typeof ask?.target !== "string") return;
    const bound = typeof ask.bound === "string" ? ask.bound : undefined;
    const match = bestWikiMatch(candidates, ask.target, bound, username);
    hits[wikiAskKey(ask)] = match?.uuid
      ? { uuid: match.uuid, type: match.type, title: match.title, category: match.category }
      : null;
  });
  return { success: true, data: hits };
};

export const getAdjacentNotes = async (
  uuid: unknown,
  filter: unknown,
): Promise<Result<AdjacentNotes>> => {
  const username = await getUsername();
  if (!username) return NOT_SIGNED_IN;
  if (typeof uuid !== "string") return BAD_REQUEST;

  const notes = (await itemListing(Modes.NOTES, username)) as Note[];
  const scope =
    filter && typeof filter === "object" && "type" in filter && "value" in filter
      ? (filter as ContentFilter)
      : null;
  return { success: true, data: adjacentOf(notes, uuid, scope) };
};

