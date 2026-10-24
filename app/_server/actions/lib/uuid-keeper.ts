import nodeFs from "fs";
import path from "path";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";

const NEWEST = Number.POSITIVE_INFINITY;

declare global {
  var __jottyClashWarned: Set<string> | undefined;
}

const _createdOf = (filePath: string): number => {
  try {
    const { metadata } = extractYamlMetadata(nodeFs.readFileSync(filePath, "utf-8"));
    const raw = metadata.createdAt;
    const stamp =
      raw instanceof Date ? raw.getTime() : typeof raw === "string" ? Date.parse(raw) : NaN;
    return Number.isFinite(stamp) ? stamp : NEWEST;
  } catch (error) {
    console.warn(`Could not read ${filePath} to settle a duplicate uuid:`, error);
    return NEWEST;
  }
};

const _byPath = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export const rankClaims = (paths: string[]): string[] =>
  Array.from(new Set(paths.map((claim) => path.resolve(claim))))
    .map((claim) => ({ claim, created: _createdOf(claim) }))
    .sort((a, b) => a.created - b.created || _byPath(a.claim, b.claim))
    .map(({ claim }) => claim);

export const warnClash = (uuid: string, ranked: string[]) => {
  const warned = (globalThis.__jottyClashWarned ??= new Set());
  const key = `${uuid}|${ranked.join("|")}`;
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(
    `Duplicate uuid ${uuid}: ${ranked[0]} keeps it, also claimed by ${ranked.slice(1).join(", ")}`,
  );
};

interface Claimant {
  uuid?: string;
  id?: string;
  category?: string;
}

export const dropClashes = <T extends Claimant>(items: T[], dir: string): T[] => {
  const byUuid = new Map<string, T[]>();
  items.forEach((item) => {
    if (!item.uuid || !item.id) return;
    const key = item.uuid.toLowerCase();
    byUuid.set(key, [...(byUuid.get(key) || []), item]);
  });

  const losers = new Set<T>();
  byUuid.forEach((claimants, uuid) => {
    if (claimants.length < 2) return;
    const pathOf = (item: T) => path.resolve(dir, item.category || "", `${item.id}.md`);
    const ranked = rankClaims(claimants.map(pathOf));
    warnClash(uuid, ranked);
    claimants.filter((item) => pathOf(item) !== ranked[0]).forEach((item) => losers.add(item));
  });

  return losers.size ? items.filter((item) => !losers.has(item)) : items;
};
