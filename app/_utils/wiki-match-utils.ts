import { ItemTypes } from "@/app/_types/enums";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { MARKDOWN_EXT, WikiRanks } from "@/app/_consts/relations";

export interface WikiCandidate {
  type: ItemTypes;
  uuid?: string;
  title?: string;
  owner?: string;
  id?: string;
  category?: string;
}

export const wikiAskKey = ({ target, bound }: { target: string; bound?: string }): string =>
  `${target}\u0000${bound || ""}`;

export const wikiKey = (title = "") => title.trim().replace(/\s+/g, " ").toLowerCase();

const _folderOf = (item: WikiCandidate) =>
  item.category === UNCATEGORIZED ? [] : (item.category || "").split("/").filter(Boolean);

const _pathKey = (item: WikiCandidate) => [..._folderOf(item), item.id || ""].map(wikiKey).join("/");

const _stripMd = (key: string) =>
  key.endsWith(MARKDOWN_EXT) ? key.slice(0, -MARKDOWN_EXT.length).trim() : key;

const _rankOf = (item: WikiCandidate, key: string): number | null => {
  const named = _stripMd(key);
  const full = _pathKey(item);
  if (wikiKey(item.title) === key) return WikiRanks.TITLE;
  if (wikiKey(item.id) === named) return WikiRanks.FILENAME;
  if (named.includes("/") && (full === named || full.endsWith(`/${named}`))) return WikiRanks.PATH;
  return null;
};

export const bestWikiMatch = <T extends WikiCandidate>(
  candidates: T[],
  target: string,
  bound: string | undefined,
  username: string,
): T | null => {
  const key = wikiKey(target);
  const linkable = candidates.filter((item) => item.uuid);

  if (bound) {
    const pinned = linkable.find((item) => item.uuid!.toLowerCase() === bound.toLowerCase());
    if (pinned) return pinned;
  }

  const ranked = linkable
    .filter((item) => !item.owner || item.owner === username)
    .map((item) => ({ item, rank: _rankOf(item, key), path: _pathKey(item) }))
    .filter((entry): entry is { item: T; rank: number; path: string } => entry.rank !== null)
    .sort((a, b) => a.rank - b.rank || a.path.localeCompare(b.path));

  return ranked[0]?.item || null;
};
