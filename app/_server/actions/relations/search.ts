import path from "path";
import { SEARCH_SNIPPET_TOKENS } from "@/app/_consts/search";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { ItemTypes } from "@/app/_types/enums";
import { dataRoot } from "./paths";
import { relationsDb } from "./store";

export interface RankedHit {
  uuid: string;
  path: string;
  slug: string;
  type: ItemTypes;
  title: string;
  category: string;
  excerpt?: string;
  rank: number;
}

interface RankedRow {
  uuid: string;
  path: string;
  title: string;
  type: ItemTypes;
  excerpt: string;
  rank: number;
}

const WORDS = new RegExp("[\\p{L}\\p{N}]+", "gu");

export const ftsQuery = (text: string): string | null => {
  const words = text.match(WORDS);
  return words ? words.map((word) => `"${word}"*`).join(" ") : null;
};

const _category = (filePath: string): string => {
  const folders = path.relative(dataRoot(), filePath).split(path.sep).slice(2, -1);
  return folders.join("/") || UNCATEGORIZED;
};

const _excerpt = (excerpt: string, title: string): string | undefined => {
  const trimmed = excerpt.trim();
  return trimmed && trimmed.toLowerCase() !== title.toLowerCase() ? trimmed : undefined;
};

export const rankedSearch = (
  owner: string,
  text: string,
  type: ItemTypes,
  limit: number,
): RankedHit[] => {
  const query = ftsQuery(text);
  if (!query) return [];

  const rows = relationsDb()
    .prepare(
      `SELECT i.uuid, i.path, i.title, i.type,
         snippet(texts, 2, '', '', '…', ${SEARCH_SNIPPET_TOKENS}) AS excerpt,
         bm25(texts, 0.0, 8.0, 1.0, 0.0, 2.0) AS rank
       FROM texts JOIN items i ON i.uuid = texts.uuid
       WHERE texts MATCH ? AND i.owner = ? AND i.type = ? AND i.encrypted = 0
       ORDER BY rank LIMIT ?`,
    )
    .all(query, owner, type, limit) as unknown as RankedRow[];

  return rows.map((row) => ({
    uuid: row.uuid,
    path: row.path,
    slug: path.basename(row.path, ".md"),
    type: row.type,
    title: row.title,
    category: _category(row.path),
    excerpt: _excerpt(row.excerpt, row.title),
    rank: row.rank,
  }));
};
