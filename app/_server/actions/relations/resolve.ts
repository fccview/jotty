import path from "path";
import type { DatabaseSync } from "node:sqlite";
import {
  AliasKeys,
  LinkKinds,
  MARKDOWN_EXT,
  UNSAFE_WIKI_TEXT,
  WikiRanks,
} from "@/app/_consts/relations";
import { titleKey } from "./parser";
import { dataRoot } from "./paths";

export interface ItemKeys {
  owner: string;
  titleKey: string;
  pathKey: string;
  aliases: string[];
}

const OWNER_SEGMENTS = 2;

export const stripMd = (key: string): string =>
  key.endsWith(MARKDOWN_EXT) ? key.slice(0, -MARKDOWN_EXT.length).trim() : key;

export const pathSegments = (absPath: string): string[] => {
  const rel = path.relative(dataRoot(), path.resolve(absPath));
  const segments = rel.split(path.sep).slice(OWNER_SEGMENTS);
  const last = segments.length - 1;
  if (last >= 0) segments[last] = path.basename(segments[last], MARKDOWN_EXT);
  return segments;
};

export const pathKeyOf = (absPath: string): string =>
  pathSegments(absPath).map(titleKey).join("/");

export const fileKeyOf = (pathKey: string): string => pathKey.split("/").pop() || "";

const _asList = (value: unknown): unknown[] => (Array.isArray(value) ? value : [value]);

export const aliasKeysOf = (metadata: Record<string, unknown>): string[] => {
  const raw = Object.values(AliasKeys).flatMap((key) => _asList(metadata[key]));
  const keys = raw
    .filter((alias): alias is string | number => typeof alias === "string" || typeof alias === "number")
    .map((alias) => titleKey(String(alias)))
    .filter(Boolean);
  return Array.from(new Set(keys));
};

const _suffixes = (pathKey: string): string[] => {
  const parts = pathKey.split("/").filter(Boolean);
  return parts.map((_, at) => parts.slice(at).join("/"));
};

export const keysOf = (item: ItemKeys): string[] => {
  const named = _suffixes(item.pathKey);
  return Array.from(
    new Set([
      item.titleKey,
      ...item.aliases,
      ...named,
      ...named.map((key) => `${key}${MARKDOWN_EXT}`),
    ].filter(Boolean)),
  );
};

export const resolveWiki = (
  db: DatabaseSync,
  owner: string,
  text: string,
  exclude = "",
): string | null => {
  const named = stripMd(text);
  const row = db
    .prepare(
      `SELECT uuid FROM (
         SELECT uuid, path, path_key, ${WikiRanks.TITLE} AS rank FROM items WHERE owner = ?1 AND title_key = ?2
         UNION ALL
         SELECT uuid, path, path_key, ${WikiRanks.FILENAME} FROM items WHERE owner = ?1 AND file_key = ?3
         UNION ALL
         SELECT uuid, path, path_key, ${WikiRanks.PATH} FROM items WHERE owner = ?1 AND instr(?3, '/') > 0
           AND (path_key = ?3 OR substr(path_key, -length(?3) - 1) = '/' || ?3)
         UNION ALL
         SELECT i.uuid, i.path, i.path_key, ${WikiRanks.ALIAS} FROM aliases a JOIN items i ON i.uuid = a.uuid
           WHERE i.owner = ?1 AND a.key = ?2
       ) WHERE uuid <> ?4 ORDER BY rank ASC, path_key ASC, path ASC LIMIT 1`,
    )
    .get(owner, text, named, exclude) as { uuid?: string } | undefined;
  return row?.uuid || null;
};

export const rewire = (db: DatabaseSync, owner: string, keys: string[]) => {
  if (!keys.length) return;
  const rows = db
    .prepare(
      `SELECT DISTINCT l.src AS src, l.dst_text AS text, l.dst AS dst FROM links l
       JOIN items i ON i.uuid = l.src
       WHERE l.kind = ? AND i.owner = ? AND l.dst_text IN (SELECT value FROM json_each(?))`,
    )
    .all(LinkKinds.WIKI, owner, JSON.stringify(keys)) as { src: string; text: string; dst: string | null }[];

  const update = db.prepare("UPDATE links SET dst = ? WHERE kind = ? AND src = ? AND dst_text = ?");
  rows.forEach(({ src, text, dst }) => {
    const next = resolveWiki(db, owner, text, src);
    if (next !== dst) update.run(next, LinkKinds.WIKI, src, text);
  });
};

const _safeName = (name: string): boolean => Boolean(name.trim()) && !UNSAFE_WIKI_TEXT.test(name);

export const nameFor = (
  db: DatabaseSync,
  owner: string,
  uuid: string,
  title: string,
  absPath: string,
  src: string,
): string | null => {
  const segments = pathSegments(absPath);
  const qualified = segments.map((_, at) => segments.slice(segments.length - 1 - at).join("/"));
  const names = [title.trim(), ...qualified].filter(_safeName);
  return names.find((name) => resolveWiki(db, owner, titleKey(name), src) === uuid) || null;
};
